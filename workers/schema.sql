-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_color TEXT DEFAULT '#FFF0F3',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Login attempts tracking (brute force protection)
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  success INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at);

-- Account locks
CREATE TABLE IF NOT EXISTS account_locks (
  email TEXT PRIMARY KEY,
  locked_until INTEGER NOT NULL,
  attempt_count INTEGER DEFAULT 0
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);

-- Stash items
CREATE TABLE IF NOT EXISTS stash_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('link', 'note', 'idea')),
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  image TEXT,
  favicon TEXT,
  content TEXT,
  color TEXT,
  tags TEXT, -- JSON array
  pinned INTEGER DEFAULT 0,
  collection_id TEXT,
  deleted INTEGER DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stash_user ON stash_items(user_id, deleted, created_at);
CREATE INDEX IF NOT EXISTS idx_stash_collection ON stash_items(collection_id);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

-- Sessions (optional, for refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token);
