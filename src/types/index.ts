// src/types/index.ts
export interface SavedSong {
  id: number;
  title: string;
  html: string;
  original_key?: string; 
  user_key?: string;
  type?: 'song' | 'talk' | 'break' | 'note';
  color?: string;
}