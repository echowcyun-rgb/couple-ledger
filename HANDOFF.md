# Cursor 对话交接 - 情侣记账 PWA

> 更新时间：2026-06-30（第三轮对话）

## 项目信息
- 路径：~/Documents/记账app/-pwav1-移植版
- 分支：main（本地 ahead of origin/main 1 commit，含优化 12+13 未推送）
- 生产地址：https://couple-ledger.vercel.app（当前线上为优化 11 版本，推送 fd9e448 后自动更新）
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
- ESLint flat config + vitest 接入（32 tests passed）
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

## 本轮新完成的优化（9-13）

### 优化 9：头像性别分组 + 我的界面布局 + 新版账本入口
- commit: `d9f0e85`
- `lib/constants.ts`：SYS_AVATARS 拆成 SYS_AVATARS_FEMALE / SYS_AVATARS_MALE
- `MemberPage.tsx`：按性别渲染头像组，「其他」只显示上传按钮
- `RoomSetup.tsx`：新版像素风 UI
- `public/avatars/girl.jpg` / `boy.jpg`
- 头像/背景图上传前压缩

### 优化 10：创建页样式 + 背景图云同步 + 流水筛选 + 复盘提示
- commit: `6655924` + `0b5cffc`
- 创建页按钮白字、背景图 coupleBg 云同步（`lib/storage.ts`）
- 复盘大额消费黄底提示框（big-spend-alert）
- 流水按月/按日筛选（后被优化 11 重构）
- xlsx 按需动态 import，修复 ChunkLoadError
- `lib/format.ts`：shiftDate / shiftMonth / formatFlowDateLabel / formatFlowMonthLabel

### 优化 11：流水日期选择重构
- commit: `f948729`（已推送 origin + Vercel 生产）
- 移除「按月/按日」切换、◀ ▶ 箭头、原生 date/month input
- 新增 `components/modals/FlowDateSheet.tsx`：可选月份 + 自定义时间区间
- `FlowTab.tsx`：日期下拉按钮（如 `2026-06 ▾`）
- `useLedger.ts`：`flowDateMode`（month | day | range）+ `flowRangeStart/End`

### 优化 12：移除外部依赖（不开代理也能访问）
- commit: `fd9e448`（本地，未推送）
- `app/layout.tsx`：`next/font/google` → `next/font/local`
- `public/fonts/`：Geist / GeistMono / PressStart2P / DotGothic16（jsDelivr 下载）
- 移除 `@vercel/analytics` 依赖及 `<Analytics />` 组件
- Supabase 云同步保留（核心功能）

### 优化 13：理财数据统计
- commit: `fd9e448`（本地，未推送）
- 理财作为收入子分类（`categoryKey="finance"`, `type="in"`）
- `lib/types.ts`：MonthSummary 加 `financeIncome`
- `lib/constants.ts` + `useLedger` 老数据自动合并「理财」分类
- `lib/stats.ts`：`getMonthSummary` 统计理财收入 + `getFinanceTrendData`
- `HomeTab`：本月总览 5 格（收入/支出/存钱/理财/结余）
- `UpdateGoalSheet`：第三种更新方式「当月理财收入」
- `FlowTab`：类型筛选加「理财」
- `ReviewTab`：理财趋势图 + 习惯分析「当月理财收入」行
- `ledger.css`：`.ico.finance` / `.grid-5` / `.upd-finance-display`

### Supabase 需用户手动执行（背景图云同步）
```sql
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_url TEXT DEFAULT '';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_x TEXT DEFAULT '50%';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_y TEXT DEFAULT 'center';
```

## 部署状态
- Vercel 项目：**couple-ledger**（echowcyun-3364s-projects）
- 生产 URL：https://couple-ledger.vercel.app
- 线上最新部署：commit `f948729`（优化 11），状态 READY
- 本地待推送：`fd9e448`（优化 12+13），推送后 Vercel 自动部署
- 部署方式：`git push origin main`（见 `Vercel操作指南.md`）

## 最近 commit 记录
```
fd9e448 feat: 优化9-13 全部完成（头像分组/背景图同步/日期重构/移除外部依赖/理财统计）
f948729 feat(ui): 优化11 — 流水日期下拉弹窗，支持月份与自定义区间筛选
0b5cffc feat(ui): 流水按月/按日筛选、成员其他性别空头像与 xlsx 按需加载
6655924 feat(ui): 优化10 — 创建页白字、背景图云同步、流水月份筛选与复盘提示
d9f0e85 feat(ui): 优化9 — 头像性别分组、我的页布局与新版账本入口
```

## 待办事项
- `git push origin main` 推送优化 12+13 到 GitHub / Vercel
- 确认 Supabase couples 表已加 couple_bg 三列并测试切换房间后背景图保留
- 优化 14（见 `优化14-Cursor指令.md`，尚未开始）

## 关键文件清单
- `lib/constants.ts` — TABS、INIT_CATS（含 finance）、SYS_AVATARS_FEMALE/MALE
- `lib/types.ts` — MonthSummary.financeIncome
- `lib/stats.ts` — getMonthSummary、getFinanceTrendData
- `lib/format.ts` — yuan()、日期格式化
- `lib/xlsx.ts` — xlsx 按需加载
- `lib/storage.ts` — pushToCloud/syncFromCloud（含 coupleBg 云同步）
- `hooks/useLedger.ts` — flowDateMode、理财分类合并、saveUpdateGoal finance 模式
- `app/layout.tsx` — 本地字体（next/font/local）
- `components/modals/FlowDateSheet.tsx` — 流水日期弹窗
- `components/modals/UpdateGoalSheet.tsx` — 存钱更新（含当月理财收入）
- `components/tabs/FlowTab.tsx` — 流水（日期下拉 + 理财筛选）
- `components/tabs/HomeTab.tsx` — 首页（5 格总览含理财）
- `components/tabs/ReviewTab.tsx` — 复盘（理财趋势 + 习惯分析）
- `components/styles/ledger.css` — 全局样式
- `public/fonts/` — 4 个本地 woff2 字体
- `.env.local` — Supabase 环境变量

## 注意事项
- 主开发目录是 `-pwav1-移植版`
- `.env.local` 不会随 git 推送，Vercel 需手动配置环境变量
- 沙箱可能无法启动 dev server，本地跑 `npm run dev`
- 不要删除 `.workbuddy/` 目录
- 理财记账方式：选「收入 → 理财」，不是独立 TxType
- 结余公式不变：`balance = income - expense - savings`（理财已含在 income 内）
- `npm run build` + `npm test` 已通过（2026-06-30 验证）

## 新对话继续方式
开新对话时说：**「读 HANDOFF.md 继续工作」**
