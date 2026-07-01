-- ==========================================
-- 情侣记账 PWA - Supabase 建表脚本（房号版）
-- 在 Supabase 面板 → SQL Editor → 粘贴执行
-- 先删旧表，再建新表
-- ==========================================

-- 先删旧表
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS couples CASCADE;

-- 1. 情侣房间表
CREATE TABLE IF NOT EXISTS couples (
  room_id TEXT PRIMARY KEY,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  couple_bg_url TEXT DEFAULT '',
  couple_bg_pos_x TEXT DEFAULT '50%',
  couple_bg_pos_y TEXT DEFAULT 'center'
);

-- 2. 交易记录表（带 room_id）
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES couples(room_id),
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('out', 'in', 'save')),
  amount REAL NOT NULL,
  category_key TEXT NOT NULL,
  member_id TEXT NOT NULL,
  note TEXT DEFAULT '',
  status TEXT DEFAULT 'confirmed',
  recorder TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
CREATE INDEX IF NOT EXISTS idx_transactions_room_date ON transactions(room_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_room_type ON transactions(room_id, type);

-- 3. 存钱目标表（带 room_id）
CREATE TABLE IF NOT EXISTS goals (
  id BIGINT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES couples(room_id),
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '★',
  current REAL DEFAULT 0,
  target REAL NOT NULL,
  contributions JSONB DEFAULT '{}',
  history JSONB DEFAULT '[]',
  deadline TEXT DEFAULT '',
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
CREATE INDEX IF NOT EXISTS idx_goals_room ON goals(room_id);

-- 4. 成员表（带 room_id）
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES couples(room_id),
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  gender TEXT DEFAULT 'other',
  payday INTEGER DEFAULT 10,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
CREATE INDEX IF NOT EXISTS idx_members_room ON members(room_id);

-- 5. 导入批次表（带 room_id）
CREATE TABLE IF NOT EXISTS import_batches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES couples(room_id),
  ids JSONB NOT NULL,
  source TEXT NOT NULL,
  recorder TEXT NOT NULL,
  count INTEGER NOT NULL,
  time TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);
CREATE INDEX IF NOT EXISTS idx_import_batches_room ON import_batches(room_id);

-- 关闭行级安全（匿名 key 需要读写权限）
ALTER TABLE couples DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches DISABLE ROW LEVEL SECURITY;
