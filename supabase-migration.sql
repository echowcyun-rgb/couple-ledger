-- ==========================================
-- 情侣记账 PWA - Supabase 建表脚本
-- 在 Supabase 面板 → SQL Editor → 粘贴执行
-- ==========================================

-- 1. 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- 2. 存钱目标表
CREATE TABLE IF NOT EXISTS goals (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '★',
  current REAL DEFAULT 0,
  target REAL NOT NULL,
  contributions JSONB DEFAULT '{}',
  history JSONB DEFAULT '[]',
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- 3. 成员表
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  gender TEXT DEFAULT 'other',
  payday INTEGER DEFAULT 10,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- 4. 导入批次表
CREATE TABLE IF NOT EXISTS import_batches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ids JSONB NOT NULL,
  source TEXT NOT NULL,
  recorder TEXT NOT NULL,
  count INTEGER NOT NULL,
  time TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- ==========================================
-- Row Level Security (可选，目前用 anon key 直连)
-- 如果后续要加用户登录，取消下面注释
-- ==========================================
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
