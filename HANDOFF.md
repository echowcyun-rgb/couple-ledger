# Cursor 对话交接 - 情侣记账 PWA

> 更新时间：2026-06-30（第四轮对话）

## 项目信息
- 路径：~/Documents/记账app/-pwav1-移植版
- 分支：main（本地 ahead of origin/main 3 commits，含优化 12–14 未推送）
- 生产地址：https://couple-ledger.vercel.app（当前线上为优化 11 版本）
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

## 本轮新完成的优化（9-14）

### 优化 9：头像性别分组 + 我的界面布局 + 新版账本入口
- commit: `d9f0e85`
- SYS_AVATARS 按性别分组、RoomSetup 新版像素风 UI、头像压缩

### 优化 10：创建页样式 + 背景图云同步 + 流水筛选 + 复盘提示
- commit: `6655924` + `0b5cffc`
- coupleBg 云同步、大额消费提示框、xlsx 按需加载

### 优化 11：流水日期选择重构
- commit: `f948729`（已推送 origin + Vercel 生产）
- `FlowDateSheet.tsx`：可选月份 + 自定义时间区间
- `flowDateMode`（month | day | range）

### 优化 12：移除外部依赖（不开代理也能访问）
- commit: `fd9e448`（本地，未推送）
- `next/font/local` + `public/fonts/` 四字体本地托管
- 移除 `@vercel/analytics`

### 优化 13：理财数据统计
- commit: `fd9e448`（本地，未推送）
- 理财子分类 `categoryKey="finance"`，首页 5 格总览、存钱「当月理财收入」模式、复盘理财趋势

### 优化 14：滚轮日期选择 + 复盘配色 + 强制跳转创建账本
- 改动：
  - `FlowDateSheet.tsx`：年月选择改为 `WheelPicker` 滚轮（中间紫色高亮栏 + 滑动吸附）
  - `ledger.css`：`.wheel-picker` 滚轮样式；大额提醒背景 `#E8C547`、文字 `#5D2A1A`
  - `app/page.tsx`：每次打开 App 先显示 RoomSetup
  - `RoomSetup.tsx`：localStorage 有房间号时显示「进入账本 #xxxx」快捷入口
- `npm run build` 已通过（2026-06-30 验证）

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
- 本地待推送：`fd9e448` + `cd90c98` + `b212692`（优化 12–14），推送后 Vercel 自动部署
- 部署方式：`git push origin main`（见 `Vercel部署指令.md`）

## 最近 commit 记录
```
fff51b0 feat(ui): 优化14 — 滚轮日期选择、复盘配色与强制跳转 RoomSetup
cd90c98 docs: 更新 HANDOFF — 优化9-13 进度、Vercel 部署状态与待办
fd9e448 feat: 优化9-13 全部完成（头像分组/背景图同步/日期重构/移除外部依赖/理财统计）
f948729 feat(ui): 优化11 — 流水日期下拉弹窗，支持月份与自定义区间筛选
```

## 待办事项
- `git push origin main` 推送优化 12–14 到 GitHub / Vercel
- 确认 Supabase couples 表已加 couple_bg 三列并测试切换房间后背景图保留

## 关键文件清单
- `lib/constants.ts` — TABS、INIT_CATS（含 finance）、SYS_AVATARS_FEMALE/MALE
- `lib/types.ts` — MonthSummary.financeIncome
- `lib/stats.ts` — getMonthSummary、getFinanceTrendData
- `hooks/useLedger.ts` — flowDateMode、理财分类合并、saveUpdateGoal finance 模式
- `app/layout.tsx` — 本地字体（next/font/local）
- `app/page.tsx` — 启动时强制 RoomSetup
- `components/modals/FlowDateSheet.tsx` — 流水日期滚轮弹窗（WheelPicker）
- `components/modals/RoomSetup.tsx` — 创建/加入账本 +「进入已有账本」
- `components/modals/UpdateGoalSheet.tsx` — 存钱更新（含当月理财收入）
- `components/tabs/FlowTab.tsx` — 流水（日期下拉 + 理财筛选）
- `components/tabs/HomeTab.tsx` — 首页（5 格总览含理财）
- `components/tabs/ReviewTab.tsx` — 复盘（理财趋势 + 大额消费提示）
- `components/styles/ledger.css` — 全局样式（滚轮/理财/room-setup-existing）
- `public/fonts/` — 4 个本地 woff2 字体
- `.env.local` — Supabase 环境变量

## 注意事项
- 主开发目录是 `-pwav1-移植版`
- `.env.local` 不会随 git 推送，Vercel 需手动配置环境变量
- 每次打开链接会先进入 RoomSetup；有已存房间号可点「进入账本 #xxxx」一键进入
- 理财记账：选「收入 → 理财」，不是独立 TxType
- 结余公式：`balance = income - expense - savings`（理财已含在 income 内）
- `npm run build` 已通过（2026-06-30 验证）

## 新对话继续方式
开新对话时说：**「读 HANDOFF.md 继续工作」**
