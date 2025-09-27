export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  lastModified: Date;
  created: Date;
  attachments?: Attachment[];
  drawings?: Drawing[];
  position?: { x: number; y: number }; // For spatial canvas
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  name: string;
  path: string;
  size: number;
}

export interface Drawing {
  id: string;
  strokes: Stroke[];
  thumbnail?: string;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  timestamp: Date;
  changeType: 'create' | 'update' | 'delete';
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  count: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'solar' | 'mono';
  autoTheme: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  language: string;
  fontSize: number;
  premiumUnlocked: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: Date;
  icon: string;
}

export type ThemeColors = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  success: string;
  warning: string;
  error: string;
};

export type ScreenNames =
  | 'Splash'
  | 'Notes'
  | 'Editor'
  | 'Canvas'
  | 'Graph'
  | 'TimeTravei'
  | 'Settings'
  | 'Search';