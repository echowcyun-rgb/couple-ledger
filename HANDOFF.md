# Cursor 对话交接 - 情侣记账 PWA

> 更新时间：2026-07-01（第十四轮：文件指纹管理重构 + 表结构验证 + goals.completedAt 补齐）

## 项目信息
- 路径：~/Documents/记账app/-pwav1-移植版
- 分支：cursor/fix-reimport-after-revert（待合并 main）
- 生产地址：https://couple-ledger-seven.vercel.app
- GitHub：https://github.com/echowcyun-rgb/couple-ledger
- 技术栈：Next.js 16.2.6 + Turbopack + React 19 + TypeScript 5.7 + Tailwind 4 + Supabase + @e965/xlsx + async-mutex + vitest
- 启动：`npm run dev`（端口 3006）
- 生产：`npm run build` → `npm run start`（端口 3005）
- Supabase：`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` 在 `.env.local`
- 主开发目录：`-pwav1-移植版`（不要用旧工作区 `-pwa-0-echowcyun-3364-84738c13`）

## 已完成优化（1-8）

### 阶段 0-4 自测+修复
- xlsx 漏洞修复（@e965/xlsx 替换高危 xlsx）
- Supabase 同步竞态+超时（async-mutex + withTimeout 10s + withRetry 指数退避）
- TypeScript 类型错误修复（构建启用 TS 校验）
- ESLint flat config + vitest 接入（37 tests passed）
- 5 张表（couples/members/transactions/goals/import_batches）RLS 已全部 DISABLE

### 优化 1-8 摘要
- 优化 1：导入智能分类 + 撤销导入 + 支付宝 GBK/UTF-8 双解码
- 优化 2：支付宝 CSV 动态表头 + 备注截取前 5 字
- 优化 3：存钱卡片点击更新 + saveUpdateGoal 累加模式
- 优化 4：爱心居中 + 复盘保存按钮玫红色
- 优化 5：底部导航栏像素风双态图标（commit `90cb0b2`）
- 优化 6：记账按钮去绿底、流水/复盘汇总栏删除、数字去逗号
- 优化 7：导入删行/重复提醒/成员选择、我的页改版
- 优化 8：存钱历史可编辑、发薪日弹窗、恭喜弹窗、成员上限 2 人

### backlog 修复 ✅
- 导出 xlsx 空分类显示「未分类」
- 启动加载慢 + 旧数据残留（cloudSynced）
- 单条 deleteTransaction 补云端删除
- 成员 2→4 重复 bug（reconcileMembers + pushToCloud 先删后写）

## 已完成优化（9-18）

### 优化 9：头像性别分组 + 我的界面布局 + 新版账本入口
- commit: `d9f0e85`

### 优化 10：创建页样式 + 背景图云同步 + 流水筛选 + 复盘提示
- commit: `6655924` + `0b5cffc`

### 优化 11：流水日期选择重构
- commit: `f948729`
- `FlowDateSheet.tsx`：可选月份 + 自定义时间区间

### 优化 12：移除外部依赖（不开代理也能访问）
- commit: `fd9e448`
- `next/font/local` + `public/fonts/` 四字体本地托管

### 优化 13：理财数据统计
- commit: `fd9e448`
- 理财子分类 `categoryKey="finance"`

### 优化 14：滚轮日期选择 + 复盘配色 + RoomSetup 快捷入口
- commit: `fff51b0`

### 优化 15：导入查重 + PWA 图标 + RoomSetup 进房修复
- commit: `e483c96`

### 优化 16：房间切换与云同步重构（去 reload、本地先显示）
- commit: `49e1569`

### 优化 17：开发环境 SW 修复
- commit: `49e1569`

### 优化 18：RoomSetup「进入账本」玫粉样式 + 三按钮等距
- commit: `49e1569`

## 已完成优化（19-20）

### 头像性别分组 + PWA 图片预缓存
- commit: `8da7fbe`
- `public/sw.js` v30→v31→v32

### 云推送房间保障 + 建表补列
- commit: `0cc5786`

### 云同步收敛 + 启动性能优化
- commit: `d3f4303`
- push 防抖 `PUSH_DEBOUNCE_MS = 2500`

### startDate 随房间云同步
- commit: `58fb4d4`

### 手机端卡加载中 + RoomSetup 进入流程修复
- commit: `929a152`
- `sw.js` v32：不缓存首页 HTML

## 已完成优化（21：导入速度 + 云同步 + 月份提醒 + 撤回指纹）

### 问题 1：手机端导入账单延迟
- commit: `c480bfa`
- **纯文本 CSV 快速解析**：`lib/importers.ts` 通用 CSV 不再加载 xlsx 库（省数秒）
- **CSV 解码优化**：`lib/csv-decode.ts` 仅当 UTF-8 出现乱码时才尝试 GBK
- **加载提示遮罩**：`importParsing` 状态 + 「正在解析账单…」遮罩

### 问题 2：导入账单云同步修复
- commit: `c480bfa`
- **导入后立即推送**：`confirmImportPreview` 新增 `pushTransactions` + `pushImportBatches`
- **合并式同步防覆盖**：保留本地未同步（`synced !== true`）的交易
- **定期 + 页面可见性同步**：每 30 秒 + `visibilitychange` 拉取云端数据

### 问题 3：导入月份提醒
- commit: `2b49cfd`
- 导入确认后检查交易日期分布，不在当前月份时提示「📅 导入的账单集中在 X年X月，请在流水页切换月份查看」

### 问题 4：撤回导入后无法重新导入同一文件
- commit: `2b49cfd` + `257dad5` + `ddb3d9b`
- **根因 1**（`2b49cfd`）：撤回时未清除 `localStorage["imported-files"]` 中的文件指纹
- **根因 2**（`257dad5`）：`syncFromCloud` 拉取云端 `import_batches` 时覆盖本地 batch，云端无 `fileFingerprint` 列
- **根因 3**（`ddb3d9b`）：`imported-files` 与 `importBatches.fileFingerprint` 两套存储不同步——导入时前者立即写入、后者经 300ms debounce 落盘，云同步 `setState` 用 `loadState()` 覆盖内存中的指纹；撤回只按 `batch.fileFingerprint` 清 `imported-files`，但 `onImportFile` 拦截仍读 `imported-files`
- **修复 1**（`2b49cfd`）：`ImportBatch` 增加 `fileFingerprint`，撤回时清除指纹
- **修复 2**（`257dad5`）：`syncFromCloud` 合并 batch 时保留本地 `fileFingerprint`
- **修复 3**（`ddb3d9b`）：
  - `confirmImportPreview` / `revertImportBatch` 内 `flushStateSync` 立即落盘
  - `mergeStateAfterCloudSync` 云同步后保留内存指纹及未落盘新批次
  - `syncImportedFilesFromBatches` 以活跃 batch 为准重写 `imported-files`
  - `onImportFile` 改查活跃 `importBatches` 的 `fileFingerprint`，不再单独依赖 `imported-files`

## 部署状态
- Vercel 项目：**couple-ledger-seven**（echowcyun-3364s-projects）
- 生产 URL：https://couple-ledger-seven.vercel.app
- 线上最新部署：commit `ddb3d9b`（文件指纹重构 + goals.completedAt 补齐）
- 部署方式：`git push origin main`（Vercel 自动部署）

## Supabase 已执行 SQL（表结构修复）
用户已在 Supabase SQL Editor 执行以下修复（验证通过 ✅）：
```sql
-- couples 背景图与起始日期
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_url TEXT DEFAULT '';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_x TEXT DEFAULT '50%';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_y TEXT DEFAULT 'center';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT '';

-- goals completedAt 列
ALTER TABLE goals ADD COLUMN IF NOT EXISTS "completedAt" TEXT DEFAULT NULL;

-- import_batches status 列
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 唯一约束（upsert onConflict 依赖）
CREATE UNIQUE INDEX IF NOT EXISTS uq_members_room_id ON members(room_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_goals_room_id ON goals(room_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_import_batches_room_time ON import_batches(room_id, time);

-- RLS 全部关闭
ALTER TABLE couples DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches DISABLE ROW LEVEL SECURITY;
```
验证结果：5 张表列结构完全匹配代码，3 个唯一索引已建，RLS 全部关闭 ✅

## 测试要求
- ✅ `npm run build` + `npm test`（37 passed）
- ✅ `npx tsc --noEmit` 无错误
- ✅ Lint 无错误

## 最近 commit 记录
```
ddb3d9b fix: 撤回导入后允许重新导入同一账单文件
e46e980 docs: 更新 HANDOFF.md（第十三轮撤回重导修复）
082d692 docs: 更新 HANDOFF.md（云同步保留fileFingerprint修复）
257dad5 fix: 云同步合并batch时保留本地fileFingerprint
a6941fe docs: 更新 HANDOFF.md（导入速度+云同步+月份提醒+撤回指纹）
2b49cfd fix: 导入月份提醒 + 撤回导入后清除文件指纹
c480bfa fix: 优化手机端导入速度 & 修复导入账单云同步
929a152 fix: 手机端卡加载中(SW v32) + RoomSetup 进入流程修复 + UI 重构
```

## 关键文件清单
- `lib/constants.ts` — TABS、INIT_CATS（含 finance）、SYS_AVATARS_FEMALE/MALE
- `lib/types.ts` — Transaction/ImportBatch（含 fileFingerprint）/MonthSummary.financeIncome
- `lib/storage.ts` — saveState/push 分离、syncFromCloud 合并模式（batch 保留 fileFingerprint）、云同步失败收敛
- `lib/supabase.ts` — createRoom 异步后台 insert、pushTransactions/pullTransactions
- `lib/importers.ts` — 支付宝/微信/通用 CSV 解析 + 纯文本快速路径（不加载 xlsx）
- `lib/csv-decode.ts` — UTF-8/GBK 智能解码（仅乱码时才尝试 GBK）
- `lib/import-dedup.ts` — 导入三元组查重
- `hooks/useLedger.ts` — confirmImportPreview（flushStateSync+指纹同步）、revertImportBatch（syncImportedFilesFromBatches）、mergeStateAfterCloudSync、onImportFile 查活跃 batch
- `app/page.tsx` — RoomSetup 路由、云同步横幅、导入解析中遮罩
- `components/modals/ImportPreviewSheet.tsx` — 导入预览 + 查重
- `components/styles/ledger.css` — 全局样式（含 import-parsing-overlay）
- `public/sw.js` — SW v32
- `.env.local` — Supabase 环境变量

## 注意事项
- 主开发目录是 `-pwav1-移植版`
- `.env.local` 不会随 git 推送，Vercel 需手动配置环境变量（**关键：未配置则云同步完全不工作**）
- 有已存房间号时每次进入显示 RoomSetup，老用户点「进入 #xxxx 房间」按钮进首页
- 理财记账：选「收入 → 理财」，不是独立 TxType
- 结余公式：`balance = income - expense - savings`（理财已含在 income 内）
- dev 环境不注册 SW；生产 PWA 安装需 HTTPS
- 当前 SW 缓存版本：`couple-ledger-v32`
- 导入的账单默认显示当月，历史月份需在流水页切换月份查看
- 撤回导入后可重新导入同一文件（`syncImportedFilesFromBatches` + 活跃 batch 去重）
- `import_batches` 表建表脚本缺少 `status` 列，`pushImportBatches` 写入 `status` 可能失败（不影响 transactions 同步）

## 新对话继续方式
开新对话时说：**「读 HANDOFF.md 继续工作」**
