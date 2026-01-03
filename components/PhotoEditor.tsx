import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Template } from '../types';
import { soundService } from '../services/soundService';

type SpookyFilter = 'none' | 'noir' | 'slime' | 'blood' | 'ghost';

interface Sticker {
  id: number;
  type: string;
  x: number; 
  y: number; 
  scale: number;
  rotation: number;
}

// Added a bunch more cool Halloween stuff here per user request
const STICKER_ASSETS = [
  { type: '👻', label: 'Spooky Ghost' },
  { type: '🎃', label: 'Jack-o-Lantern' },
  { type: '🦇', label: 'Scary Bat' },
  { type: '🕸️', label: 'Cobweb' },
  { type: '🕷️', label: 'Crawler' },
  { type: '🌙', label: 'Moon' },
  { type: '🐈‍⬛', label: 'Void Cat' },
  { type: '🧙‍♀️', label: 'Witch' },
  { type: '🎩', label: 'Hat' },
  { type: '🧹', label: 'Broomstick' },
  { type: '💀', label: 'Skull' },
  { type: '🦴', label: 'Bone' },
  { type: '⚰️', label: 'Coffin' },
  { type: '🧪', label: 'Green Potion' },
  { type: '🫧', label: 'Cauldron Bubbles' },
  { type: '🍬', label: 'Candy Corn' },
  { type: '🍭', label: 'Sweet Treat' },
  { type: '🕯️', label: 'Candle' },
  { type: '🧛', label: 'Vampire' },
  { type: '🧟', label: 'Zombie' },
  { type: '🦉', label: 'Hoot Owl' },
  { type: '🐀', label: 'Rat' },
  { type: '🌲', label: 'Dark Tree' },
  { type: '🍂', label: 'Dead Leaves' }
];

interface Slot {
  x: number; 
  y: number; 
  width: number; 
  height: number;
  area: number;
}

interface PhotoEditorProps {
  images: string[];
  template: Template;
  isGuest?: boolean;
  onSave: (finalImage: string) => void;
  onCancel: () => void;
  onPopup?: (message: string) => void;
}

const PhotoEditor: React.FC<PhotoEditorProps> = ({ images, template, isGuest, onSave, onCancel, onPopup }) => {
  const [collageImage, setCollageImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<SpookyFilter>('none');
  
  // Manage the state of any stickers dropped on the canvas
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Map filters to CSS styles for that instant preview feel
  const filterStyles = {
    none: "",
    noir: "grayscale(100%) contrast(1.1) brightness(0.9)",
    slime: "hue-rotate(95deg) saturate(2) brightness(1.1)",
    blood: "sepia(100%) hue-rotate(-55deg) saturate(3.5)",
    ghost: "sepia(100%) hue-rotate(200deg) opacity(0.85) brightness(1.2)"
  };

  // Helper to make the stickers float or sway based on their type
  const getAnimationClass = (type: string) => {
    if (['👻', '🦇', '🌙', '🧹', '🧙‍♀️'].includes(type)) return 'animate-spooky-float';
    if (['🕸️', '🕷️', '🫧', '🐀'].includes(type)) return 'animate-spooky-sway';
    return 'animate-spooky-pulse';
  };

  // Standard "cover" fit for images on the canvas
  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sWidth, sHeight, sx, sy;

    if (imgRatio > targetRatio) {
      sHeight = img.height;
      sWidth = img.height * targetRatio;
      sx = (img.width - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = img.width;
      sHeight = img.width / targetRatio;
      sx = 0;
      sy = (img.height - sHeight) / 2;
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  };

  // Lightweight loader so we can await image assets (frames + photos)
  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });

  // Auto-detect transparent holes in a PNG frame so photos sit behind the cutouts
  const detectTransparentSlots = (img: HTMLImageElement): Slot[] => {
    const maxDim = 800;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const dw = Math.max(1, Math.round(img.width * scale));
    const dh = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement('canvas');
    c.width = dw;
    c.height = dh;
    const ctx = c.getContext('2d');
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, dw, dh);
    const data = ctx.getImageData(0, 0, dw, dh).data;
    const visited = new Uint8Array(dw * dh);
    const mask = new Uint8Array(dw * dh);
    const alphaThreshold = 10; // transparent if almost fully see-through
    for (let i = 0; i < dw * dh; i++) {
      mask[i] = data[i * 4 + 3] < alphaThreshold ? 1 : 0;
    }

    const slots: Slot[] = [];
    const neighbors = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];

    const flood = (sx: number, sy: number) => {
      const stack = [[sx, sy]];
      let minX = sx, maxX = sx, minY = sy, maxY = sy, count = 0;
      visited[sy * dw + sx] = 1;
      while (stack.length) {
        const [x, y] = stack.pop() as [number, number];
        count++;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        for (const [dx, dy] of neighbors) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= dw || ny >= dh) continue;
          const idx = ny * dw + nx;
          if (visited[idx] || mask[idx] === 0) continue;
          visited[idx] = 1;
          stack.push([nx, ny]);
        }
      }
      const area = (maxX - minX + 1) * (maxY - minY + 1);
      return {
        x: minX / dw,
        y: minY / dh,
        width: (maxX - minX + 1) / dw,
        height: (maxY - minY + 1) / dh,
        area
      } as Slot;
    };

    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const idx = y * dw + x;
        if (visited[idx] || mask[idx] === 0) continue;
        const slot = flood(x, y);
        const areaPct = slot.area / (dw * dh);
        if (areaPct > 0.002) slots.push(slot); // ignore tiny specks
      }
    }

    // Sort slots top-to-bottom then left-to-right for consistent ordering
    return slots.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  };

  // Construct the base collage strip
  const buildCollage = useCallback(() => {
    let cancelled = false;
    const run = async () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Try PNG frame mode first (auto-detect holes or use manual slots)
      if (template.frameUrl) {
        try {
          const frameImg = await loadImage(template.frameUrl);
          const manualSlots = template.slots && template.slots.length > 0 ? template.slots : null;
          const detectedSlots = manualSlots ? [] : detectTransparentSlots(frameImg);
          const activeSlots = manualSlots && manualSlots.length > 0 ? manualSlots : detectedSlots;

          if (activeSlots.length > 0) {
            // Preserve native resolution of the uploaded frame to avoid quality loss
            const finalWidth = frameImg.width || 1400;
            const finalHeight = frameImg.height ? frameImg.height : (frameImg.width ? frameImg.width * 1.5 : 2000);
            canvas.width = finalWidth;
            canvas.height = finalHeight;

            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, finalWidth, finalHeight);

            const usableCount = Math.min(activeSlots.length, images.length);
            const loadedPhotos = await Promise.all(images.slice(0, usableCount).map(loadImage));

            activeSlots.slice(0, loadedPhotos.length).forEach((slot, idx) => {
              const targetX = slot.x * finalWidth;
              const targetY = slot.y * finalHeight;
              const targetW = slot.width * finalWidth;
              const targetH = slot.height * finalHeight;

              // Clip to an ellipse so the photos respect circular cutouts even if the PNG lacks transparency
              ctx.save();
              ctx.beginPath();
              ctx.ellipse(targetX + targetW / 2, targetY + targetH / 2, targetW / 2, targetH / 2, 0, 0, Math.PI * 2);
              ctx.clip();
              drawImageCover(ctx, loadedPhotos[idx], targetX, targetY, targetW, targetH);
              ctx.restore();
            });

            // Lay the frame on top so the design sits above the photos
            ctx.drawImage(frameImg, 0, 0, finalWidth, finalHeight);

            if (!cancelled) setCollageImage(canvas.toDataURL('image/png'));
            return;
          }
        } catch (err) {
          console.warn('Frame overlay failed, falling back to default layout', err);
        }
      }

      // Fallback to the original generated layout
      const layout = template.layout || 'strip';
      const gap = 50;
      const headH = 160;
      const footH = 220;
      
      let cw = 700;
      let ch = 1000;

      if (layout === 'strip') {
        cw = 700;
        const pw = cw - (gap * 2);
        const ph = pw * 0.75;
        ch = headH + footH + (images.length * ph) + ((images.length - 1) * gap);
      } else if (layout === 'grid') {
        cw = 1100;
        const pw = (cw - (gap * 3)) / 2;
        const ph = pw * 0.75;
        const rows = Math.ceil(images.length / 2);
        ch = headH + footH + (rows * ph) + ((rows - 1) * gap);
      } else {
        cw = 900;
        ch = 1000;
      }

      canvas.width = cw;
      canvas.height = ch;

      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, '#1a1c2c'); 
      grad.addColorStop(1, '#0c0d15');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (layout !== 'single') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let y = 30; y < ch; y += 60) {
          ctx.fillRect(15, y, 15, 25);
          ctx.fillRect(cw - 30, y, 15, 25);
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px "Fredoka One"';
      ctx.textAlign = 'center';
      ctx.fillText("SPOOKY CUTE MEMORIES", cw / 2, 90);

      const finalImages = layout === 'single' ? [images[0]] : images;
      const loadedPhotos = await Promise.all(finalImages.map(loadImage));

      loadedPhotos.forEach((img, idx) => {
        let x = gap, y = headH, w = 0, h = 0;

        if (layout === 'strip') {
          w = cw - (gap * 2);
          h = w * 0.75;
          x = gap;
          y = headH + (idx * (h + gap));
        } else if (layout === 'grid') {
          w = (cw - (gap * 3)) / 2;
          h = w * 0.75;
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          x = gap + col * (w + gap);
          y = headH + row * (h + gap);
        } else {
          w = cw - (gap * 2);
          h = ch - headH - footH;
          x = gap;
          y = headH;
        }

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
        ctx.restore();

        drawImageCover(ctx, img, x, y, w, h);
      });

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 50px "Fredoka One"';
      ctx.fillText(template.themeText, cw / 2, ch - 120);
      
      ctx.font = '20px Quicksand';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const day = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      ctx.fillText(`BOOTH SNAP • ${day} • ${template.name.toUpperCase()}`, cw / 2, ch - 65);
      
      if (!cancelled) setCollageImage(canvas.toDataURL('image/png'));
    };

    run();
    return () => { cancelled = true; };
  }, [images, template]);

  useEffect(() => {
    const cleanup = buildCollage();
    return cleanup;
  }, [buildCollage]);

  const addSticker = (type: string) => {
    soundService.play('pop');
    const sticker: Sticker = {
      id: Date.now(),
      type,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0
    };
    setStickers([...stickers, sticker]);
    setSelectedStickerId(sticker.id);
  };

  const onStickerDown = (e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    setSelectedStickerId(id);
    setIsDragging(true);
    
    const s = stickers.find(st => st.id === id);
    if (s && previewContainerRef.current) {
      const b = previewContainerRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - b.left - (s.x * b.width / 100),
        y: e.clientY - b.top - (s.y * b.height / 100)
      };
    }
  };

  const onStickerMove = (e: React.PointerEvent) => {
    if (isDragging && selectedStickerId !== null && previewContainerRef.current) {
      const b = previewContainerRef.current.getBoundingClientRect();
      const nx = ((e.clientX - b.left - dragOffset.current.x) / b.width) * 100;
      const ny = ((e.clientY - b.top - dragOffset.current.y) / b.height) * 100;
      setStickers(stickers.map(s => s.id === selectedStickerId ? { ...s, x: nx, y: ny } : s));
    }
  };

  const onStickerUp = () => setIsDragging(false);

  const editSelected = (val: Partial<Sticker>) => {
    if (selectedStickerId === null) return;
    setStickers(stickers.map(s => s.id === selectedStickerId ? { ...s, ...val } : s));
  };

  const removeSelected = () => {
    if (selectedStickerId === null) return;
    soundService.play('ghost');
    setStickers(stickers.filter(s => s.id !== selectedStickerId));
    setSelectedStickerId(null);
  };

  // Final merge of photos + stickers + filter
  const finishCollage = () => {
    if (!collageImage || !canvasRef.current) return;
    const final = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      final.width = img.width;
      final.height = img.height;
      const fctx = final.getContext('2d');
      if (fctx) {
        fctx.filter = filterStyles[filter];
        fctx.drawImage(img, 0, 0);
        
        // Reset filter before drawing stickers so they look clean
        fctx.filter = 'none';
        stickers.forEach(s => {
          fctx.save();
          const dx = (s.x / 100) * final.width;
          const dy = (s.y / 100) * final.height;
          const sz = 90 * s.scale;
          
          fctx.translate(dx, dy);
          fctx.rotate((s.rotation * Math.PI) / 180);
          fctx.font = `${sz}px serif`;
          fctx.textAlign = 'center';
          fctx.textBaseline = 'middle';
          fctx.fillText(s.type, 0, 0);
          fctx.restore();
        });

        onSave(final.toDataURL('image/png'));
      }
    };
    img.src = collageImage;
  };

  const activeSticker = stickers.find(s => s.id === selectedStickerId);

  return (
    <div className="relative flex flex-col gap-8 animate-fadeIn pb-20 overflow-hidden min-h-[80vh]">
      <div className="z-10 flex flex-col lg:flex-row gap-6 sm:gap-8 items-start justify-center">
        {/* Editor Preview Area */}
        <div className="w-full max-w-lg flex flex-col gap-5 sm:gap-6">
          <div className="flex items-center justify-between px-5 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-xl">{template.icon}</span>
              <button
                onClick={() => { soundService.play('pop'); onCancel(); }}
                className="text-sm font-halloween text-orange-400 hover:text-white transition-colors text-left"
              >
                {template.name}
              </button>
            </div>
            <span className="text-[9px] sm:text-[10px] text-purple-400 font-bold uppercase tracking-widest">{images.length} PHOTOS READY</span>
          </div>

          <div 
            ref={previewContainerRef}
            onPointerMove={onStickerMove}
            onPointerUp={onStickerUp}
            onPointerLeave={onStickerUp}
            className="relative rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl bg-[#0c0a1f] border-[8px] sm:border-[10px] border-white/5 p-3 sm:p-4 select-none"
          >
            {collageImage && (
              <img 
                src={collageImage} 
                className="w-full h-auto rounded-xl sm:rounded-2xl transition-all select-none"
                style={{ filter: filterStyles[filter] }}
                onPointerDown={() => setSelectedStickerId(null)}
                onContextMenu={(e) => { e.preventDefault(); onPopup?.("Nice try, sneaky ghost! 👻"); }}
                draggable={false}
              />
            )}

            {stickers.map(s => (
              <div
                key={s.id}
                onPointerDown={(e) => onStickerDown(e, s.id)}
                className={`absolute cursor-move select-none ${selectedStickerId === s.id ? 'ring-2 ring-orange-500 ring-offset-4 ring-offset-transparent rounded-full' : ''}`}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${s.scale})`,
                  fontSize: '48px',
                  zIndex: selectedStickerId === s.id ? 50 : 40,
                  touchAction: 'none'
                }}
              >
                <div className={getAnimationClass(s.type)}>{s.type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-5 sm:gap-6">
          <div className="p-6 sm:p-8 bg-white/5 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-xl">
            <h3 className="text-xl sm:text-2xl font-halloween text-orange-400 mb-4 sm:mb-6">🔮 Edit Studio</h3>
            
            <div className="mb-6 sm:mb-8">
              <label className="text-[10px] text-purple-400 font-bold uppercase tracking-widest block mb-3 sm:mb-4">WITCHY FILTERS</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(['none', 'noir', 'slime', 'blood', 'ghost'] as SpookyFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => { soundService.play('click'); setFilter(f); }}
                    className={`h-9 w-full rounded-xl border transition-all text-[10px] sm:text-[8px] font-bold uppercase ${
                      filter === f ? 'bg-orange-500 border-orange-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <label className="text-[10px] text-purple-400 font-bold uppercase tracking-widest block mb-4">GHOULISH PROPS</label>
              <div className="grid grid-cols-4 gap-2 sm:gap-3 max-h-40 sm:max-h-48 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                {STICKER_ASSETS.map(asset => (
                  <button
                    key={asset.label}
                    onClick={() => addSticker(asset.type)}
                    className="aspect-square flex items-center justify-center text-2xl bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-transform active:scale-90"
                    title={asset.label}
                  >
                    {asset.type}
                  </button>
                ))}
              </div>
            </div>

            {activeSticker && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl animate-fadeIn space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Editing {activeSticker.type}</span>
                  <button onClick={removeSelected} className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase">Remove</button>
                </div>
                <div className="space-y-4">
                  <input 
                    type="range" min="0.5" max="3" step="0.1" 
                    value={activeSticker.scale} 
                    onChange={(e) => editSelected({ scale: parseFloat(e.target.value) })}
                    className="w-full accent-orange-500"
                  />
                  <input 
                    type="range" min="0" max="360" step="5" 
                    value={activeSticker.rotation} 
                    onChange={(e) => editSelected({ rotation: parseInt(e.target.value) })}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={finishCollage}
              className="w-full py-4 sm:py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-[1.75rem] sm:rounded-[2rem] font-halloween text-xl sm:text-2xl shadow-xl hover:scale-105 transition-all active:scale-95"
            >
              FINISH & SAVE 📥
            </button>
            <button onClick={onCancel} className="w-full py-4 text-white/20 hover:text-red-400 font-bold text-xs uppercase transition-all">
              Discard Draft
            </button>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PhotoEditor;
