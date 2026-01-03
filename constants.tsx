
import { Template } from './types';

export const TEMPLATES: Template[] = [
  {
    id: 'design-10',
    name: 'Neon Midnight',
    photoCount: 1,
    layout: 'single',
    color: 'bg-purple-900',
    accent: 'border-purple-400',
    gradient: 'from-purple-900 via-indigo-900 to-black',
    icon: '🌌',
    decorations: ['purple haze', 'neon grid'],
    themeText: 'MIDNIGHT GLOW',
    frameUrl: '/uploads/10.png',
    slots: [{ x: 0.159, y: 0.156, width: 0.71, height: 0.408 }]
  },
  {
    id: 'design-6',
    name: 'Ember Duo',
    photoCount: 2,
    layout: 'strip',
    color: 'bg-orange-900',
    accent: 'border-orange-400',
    gradient: 'from-orange-900 via-amber-800 to-black',
    icon: '🎃',
    decorations: ['orange wash', 'bold frames'],
    themeText: 'EMBER NIGHT',
    frameUrl: '/uploads/6.png',
    slots: [
      { x: 0.128, y: 0.022, width: 0.75, height: 0.304 },
      { x: 0.167, y: 0.344, width: 0.735, height: 0.298 }
    ]
  },
  {
    id: 'design-7',
    name: 'Slate Glow',
    photoCount: 1,
    layout: 'single',
    color: 'bg-slate-900',
    accent: 'border-slate-400',
    gradient: 'from-slate-900 via-indigo-900 to-black',
    icon: '🦇',
    decorations: ['cool slate', 'soft neon'],
    themeText: 'NIGHT VIBES',
    frameUrl: '/uploads/7.png',
    slots: [{ x: 0.09, y: 0.244, width: 0.835, height: 0.613 }]
  },
  {
    id: 'design-8',
    name: 'Cosmic Aura',
    photoCount: 1,
    layout: 'single',
    color: 'bg-indigo-900',
    accent: 'border-blue-400',
    gradient: 'from-indigo-900 via-blue-900 to-black',
    icon: '👻',
    decorations: ['cool glow', 'soft gradient'],
    themeText: 'COSMIC AURA',
    frameUrl: '/uploads/8.png',
    slots: [{ x: 0.113, y: 0.068, width: 0.802, height: 0.515 }]
  },
  {
    id: 'design-9',
    name: 'Fuchsia Web',
    photoCount: 1,
    layout: 'single',
    color: 'bg-fuchsia-900',
    accent: 'border-fuchsia-400',
    gradient: 'from-fuchsia-900 via-purple-900 to-black',
    icon: '🕸️',
    decorations: ['fuchsia glow', 'web texture'],
    themeText: 'WEB VIBES',
    frameUrl: '/uploads/9.png',
    slots: [{ x: 0.169, y: 0.436, width: 0.682, height: 0.47 }]
  },
  {
    id: 'design-asset1',
    name: 'Obsidian Triple',
    photoCount: 3,
    layout: 'strip',
    color: 'bg-zinc-900',
    accent: 'border-teal-400',
    gradient: 'from-zinc-900 via-slate-900 to-black',
    icon: '🧟',
    decorations: ['minimal frames'],
    themeText: 'TRIPLE TAKE',
    frameUrl: '/uploads/Asset 1.png',
    slots: [
      { x: 0.107, y: 0.054, width: 0.758, height: 0.209 },
      { x: 0.107, y: 0.299, width: 0.758, height: 0.209 },
      { x: 0.107, y: 0.545, width: 0.758, height: 0.209 }
    ]
  },
  {
    id: 'design-asset2',
    name: 'Emerald Triple',
    photoCount: 3,
    layout: 'strip',
    color: 'bg-emerald-900',
    accent: 'border-emerald-400',
    gradient: 'from-emerald-900 via-teal-900 to-black',
    icon: '🧙‍♀️',
    decorations: ['emerald glow'],
    themeText: 'FOREST FRAME',
    frameUrl: '/uploads/Asset 2.png',
    slots: [
      { x: 0.116, y: 0.054, width: 0.774, height: 0.21 },
      { x: 0.116, y: 0.298, width: 0.767, height: 0.212 },
      { x: 0.116, y: 0.544, width: 0.774, height: 0.21 }
    ]
  },
  {
    id: 'design-asset3',
    name: 'Rose Glam',
    photoCount: 3,
    layout: 'strip',
    color: 'bg-rose-900',
    accent: 'border-rose-400',
    gradient: 'from-rose-900 via-pink-900 to-black',
    icon: '🪄',
    decorations: ['pink glow'],
    themeText: 'TRIPLE MAGIC',
    frameUrl: '/uploads/Asset 3.png',
    slots: [
      { x: 0.103, y: 0.054, width: 0.779, height: 0.211 },
      { x: 0.103, y: 0.299, width: 0.779, height: 0.211 },
      { x: 0.11, y: 0.544, width: 0.779, height: 0.211 }
    ]
  },
  {
    id: 'design-spooky',
    name: 'Frostbite Duo',
    photoCount: 2,
    layout: 'strip',
    color: 'bg-blue-900',
    accent: 'border-blue-400',
    gradient: 'from-blue-900 via-cyan-900 to-black',
    icon: '🧟‍♂️',
    decorations: ['cool blue'],
    themeText: 'EERIE PAIR',
    frameUrl: '/uploads/Spooky.png',
    slots: [
      { x: 0.189, y: 0.022, width: 0.687, height: 0.305 },
      { x: 0.154, y: 0.345, width: 0.746, height: 0.299 }
    ]
  }
];
