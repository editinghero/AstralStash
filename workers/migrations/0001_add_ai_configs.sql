-- Migration: Add AI configuration table
-- Created: 2026-05-11

CREATE TABLE IF NOT EXISTS ai_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  provider_type TEXT NOT NULL CHECK(provider_type IN ('gemini', 'openai-compat')),
  encrypted_api_key TEXT NOT NULL,
  model_id TEXT NOT NULL,
  base_url TEXT, -- For OpenAI-compatible providers
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_configs_user ON ai_configs(user_id);
