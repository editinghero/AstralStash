export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  profile_color: string;
  created_at: number;
  updated_at: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface StashItem {
  id: string;
  user_id: string;
  type: 'link' | 'note' | 'idea';
  title: string;
  url?: string;
  description?: string;
  image?: string;
  favicon?: string;
  content?: string;
  color?: string;
  format?: 'md' | 'txt'; // For notes: markdown or plain text
  tags: string[];
  pinned: boolean;
  collection_id?: string | null;
  deleted: boolean;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  emoji?: string;
  created_at: number;
}
