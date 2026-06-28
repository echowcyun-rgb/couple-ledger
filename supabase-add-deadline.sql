-- 为已有 goals 表增加 deadline 字段（在 Supabase SQL Editor 执行一次即可）
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deadline TEXT DEFAULT '';
