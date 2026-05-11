export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ALLOW_SIGNUPS: string;
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

export interface AIConfig {
  id: string;
  user_id: string;
  provider_type: 'gemini' | 'openai-compat';
  encrypted_api_key: string;
  model_id: string;
  base_url?: string;
  created_at: number;
  updated_at: number;
}

export interface AIConfigRequest {
  provider_type: 'gemini' | 'openai-compat';
  api_key: string; // Plain text, will be encrypted server-side
  model_id: string;
  base_url?: string;
}

export interface AIConfigResponse {
  provider_type: 'gemini' | 'openai-compat';
  model_id: string;
  base_url?: string;
  has_api_key: boolean; // Don't send the actual key back
}

