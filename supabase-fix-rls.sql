-- ==========================================
-- 修复云同步 RLS 报错（42501 row-level security）
-- 在 Supabase → SQL Editor 粘贴执行
-- ==========================================

-- 方式 1：关闭 RLS（与 supabase-migration.sql 一致，最简单）
ALTER TABLE couples DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches DISABLE ROW LEVEL SECURITY;

-- 方式 2（可选）：若需保留 RLS，改用匿名读写策略
-- CREATE POLICY "anon_all_couples" ON couples FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "anon_all_transactions" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "anon_all_goals" ON goals FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "anon_all_members" ON members FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "anon_all_import_batches" ON import_batches FOR ALL TO anon USING (true) WITH CHECK (true);
