
export enum AppView {
  AUTH = 'AUTH',
  HOME = 'HOME',
  SOURCE_SELECT = 'SOURCE_SELECT',
  CAPTURE = 'CAPTURE',
  EDIT = 'EDIT',
  GALLERY = 'GALLERY'
}

export type LayoutType = 'strip' | 'grid' | 'single';

export interface User {
  id: number;
  username: string;
}

export interface Template {
  id: string;
  name: string;
  photoCount: number;
  layout: LayoutType;
  color: string;
  accent: string;
  gradient: string;
  icon: string;
  decorations: string[];
  themeText: string;
  // Optional overlay frame; when provided we auto-detect transparent holes to place photos behind the frame
  frameUrl?: string;
  // Optional manual slots (normalized 0-1) for placing photos when auto-detect is not possible
  slots?: { x: number; y: number; width: number; height: number }[];
}

export interface SavedPhoto {
  id: string;
  url: string;
  timestamp: number;
}
