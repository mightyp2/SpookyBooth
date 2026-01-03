
// Multiple sources per sound to improve reliability; falls back to generated chimes if loading fails.
// We previously pulled from CDN; to avoid 403s/adblock we rely on Web Audio chimes (and optionally local sources if added later).
const SOUND_SOURCES: Record<string, string[]> = {
  click: [],
  shutter: [],
  ghost: [],
  magic: [],
  pop: [],
  success: [],
  error: []
};

class SoundService {
  private muted: boolean = false;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.muted = localStorage.getItem('spooky_muted') === 'true';
    // Preload first available source per sound
    Object.entries(SOUND_SOURCES).forEach(([key, urls]) => {
      if (!urls.length) return;
      for (const url of urls) {
        const audio = new Audio(url);
        audio.addEventListener('canplaythrough', () => {
          this.audioCache.set(key, audio);
        }, { once: true });
        audio.addEventListener('error', () => {
          const nextIndex = urls.indexOf(url) + 1;
          if (nextIndex < urls.length) {
            const next = new Audio(urls[nextIndex]);
            try { next.load(); } catch {}
            next.addEventListener('canplaythrough', () => this.audioCache.set(key, next), { once: true });
          }
        }, { once: true });
        try {
          audio.load();
        } catch {}
        break;
      }
    });
  }

  setMuted(mute: boolean) {
    this.muted = mute;
    localStorage.setItem('spooky_muted', mute.toString());
  }

  isMuted() {
    return this.muted;
  }

  private unlockCtx() {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    } catch {
      // ignore
    }
  }

  private chimeFallback(soundName: string) {
    this.unlockCtx();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const freqs: number[] =
      soundName === 'error' ? [440, 330] :
      soundName === 'pop' ? [720, 880] :
      soundName === 'success' ? [880, 1040, 1320, 1560] :
      soundName === 'magic' ? [660, 880, 1200] :
      soundName === 'ghost' ? [520, 660, 760] :
      soundName === 'shutter' ? [600, 500] :
      [640, 820];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const start = now + idx * 0.08;
      const duration = 0.18;
      gain.gain.setValueAtTime(0.0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  }

  private beepFallback() {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore
    }
  }

  play(soundName: keyof typeof SOUNDS) {
    if (this.muted) return;
    this.unlockCtx();
    
    const audio = this.audioCache.get(soundName);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = soundName === 'success' ? 0.3 : 0.25;
      audio.play().catch(() => this.chimeFallback(soundName));
      return;
    }
    this.chimeFallback(soundName);
  }
}

export const soundService = new SoundService();
