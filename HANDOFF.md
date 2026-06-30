# Cursor 对话交接 - 情侣记账 PWA

> 更新时间：2026-06-30（第二轮对话）

## 项目信息
- 路径：~/Documents/记账app/-pwav1-移植版
- 分支：main（本地 ahead of origin/main 3 commits）
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

### 优化 1：导入智能分类 + 撤销导入
- 60 条关键词映射（lib/category-keywords.ts）
- 导入预览页（ImportPreviewSheet）支持分类下拉 + 未分类二次确认
- 撤销导入功能（RevertImportSheet）
- 支付宝 CSV GBK/UTF-8 双解码（lib/csv-decode.ts）

### 优化 2：支付宝 CSV 修复 + 备注截取
- 动态表头映射（parseAlipayCSV）
- noteFromDesc 截取商品说明前 5 字

### 优化 3：卡片点击 + 描边字体 + 累加模式
- 存钱卡片 onClick → openUpdateGoal
- saveUpdateGoal 从覆盖改累加

### 优化 4：爱心居中 + 玫红色
- couple-heart flex 居中
- review-plan-save 改 var(--out) 玫红色

### 优化 5：底部导航栏像素风图标
- 10 张像素风 PNG（public/tabbar/）
- TABS 加 imgActive 字段，TabBar 双图切换
- commit `90cb0b2`

### 优化 6：UI 修复批次
- 记账按钮绿底删除
- 流水+复盘数据汇总栏删除
- 数字去逗号（yuan()）

### 优化 7：功能增强
- 导入后可删除项目、重复导入提醒、导入导出前选成员
- 我的界面改版（名字分列头像下方 +「开始记账 x 天啦」一行排版）

### 优化 8：存钱激励 + 发薪日提醒 + 成员限制
- 更新历史可修改、发薪日弹窗、存钱恭喜弹窗
- 成员管理最多 2 名

### backlog 修复 ✅
- 导出 xlsx 空分类显示「未分类」
- 启动加载慢 + 旧数据残留（cloudSynced）
- 单条 deleteTransaction 补云端删除
- 成员 2→4 重复 bug（reconcileMembers + pushToCloud 先删后写）

## 本轮新完成的优化

### 优化 9：头像性别分组 + 我的界面布局 + 新版账本入口
- commit: `d9f0e85`
- 改动：
  - `lib/constants.ts`：SYS_AVATARS 拆成 SYS_AVATARS_FEMALE(1/3/5/7/9) + SYS_AVATARS_MALE(2/4/6/8/10)
  - `components/modals/MemberPage.tsx`：按性别渲染对应头像组，「其他」只显示上传按钮；切换性别时自动清空头像
  - `components/styles/ledger.css`：couple-av-name margin-left -40%；头像方圆形 88px/18px
  - `components/modals/RoomSetup.tsx`：迁移 zip 新版像素风 UI，保留 createRoom/validateRoom 逻辑
  - `public/avatars/girl.jpg` / `boy.jpg`：从 zip 目录复制
  - `hooks/useLedger.ts`：头像/背景图上传前压缩

### 优化 10：创建页样式 + 背景图云同步 + 流水筛选 + 复盘提示
- commit: `6655924` + `0b5cffc`（两步提交）
- 改动：
  - `components/styles/ledger.css`：room-setup 按钮 small/footer 改 #FFFFFF；副标题按用户后续要求改回 `var(--ink)` 黑色
  - `lib/storage.ts`：pushToCloud 推送 coupleBg；syncFromCloud 拉取 coupleBg
  - `components/tabs/ReviewTab.tsx`：大额消费合并为黄底 #FFD600 白字提示框（big-spend-alert）
  - `hooks/useLedger.ts` + `components/tabs/FlowTab.tsx`：流水支持**按月/按日**双模式（flowViewMode + flowDate），◀ ▶ 切换 + 月份/日期选择器，分组全选 checkbox
  - `lib/xlsx.ts`：xlsx 按需动态 import，修复 ChunkLoadError
  - `components/modals/MemberPage.tsx`：选「其他」性别时顶部头像显示虚线空框
  - `lib/format.ts`：shiftDate / shiftMonth / formatFlowDateLabel / formatFlowMonthLabel

### Supabase 需用户手动执行（背景图云同步）
```sql
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_url TEXT DEFAULT '';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_x TEXT DEFAULT '50%';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_y TEXT DEFAULT 'center';
```

## 最近 commit 记录
```
0b5cffc feat(ui): 流水按月/按日筛选、成员其他性别空头像与 xlsx 按需加载
6655924 feat(ui): 优化10 — 创建页白字、背景图云同步、流水月份筛选与复盘提示
d9f0e85 feat(ui): 优化9 — 头像性别分组、我的页布局与新版账本入口
fde9bcf feat: 优化1-8全部完成 + 云同步/UI修复 + Vercel部署准备
```

## 待办事项
- Vercel 部署（代码 ready，见 `Vercel部署指令.md`）
- 确认 Supabase couples 表已加 couple_bg 三列并测试切换房间后背景图保留

## 关键文件清单
- `lib/constants.ts` — TABS、SYS_AVATARS_FEMALE/MALE
- `lib/format.ts` — yuan()、日期格式化与 shiftDate/shiftMonth
- `lib/xlsx.ts` — xlsx 按需加载
- `lib/storage.ts` — pushToCloud/syncFromCloud（含 coupleBg 云同步）
- `lib/supabase.ts` — 云同步 API
- `hooks/useLedger.ts` — 核心 hook（flowViewMode/flowDate、导入导出、成员等）
- `components/modals/RoomSetup.tsx` — 新版账本创建/加入入口
- `components/modals/MemberPage.tsx` — 成员管理（性别头像分组）
- `components/tabs/FlowTab.tsx` — 流水（按月/按日筛选 + 批量选择）
- `components/tabs/ReviewTab.tsx` — 复盘（大额消费黄底提示）
- `components/styles/ledger.css` — 全局样式
- `app/page.tsx` — 主页面
- `public/avatars/` — girl.jpg / boy.jpg
- `.env.local` — Supabase 环境变量

## 注意事项
- 主开发目录是 `-pwav1-移植版`
- `.env.local` 不会随 git 推送，Vercel 需手动配置环境变量
- 沙箱可能无法启动 dev server，本地跑 `npm run dev`
- 不要删除 `.workbuddy/` 目录
- 工作区已清理：`next-env.d.ts` 已还原，重复文件 `lib/couple-bg 2.ts` / `vitest.config 2.ts` 已删除
- `npm run build` 已通过（2026-06-30 验证）

## 新对话继续方式
开新对话时说：**「读 HANDOFF.md 继续工作」**
