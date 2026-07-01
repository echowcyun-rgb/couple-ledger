# Cursor 对话交接 - 情侣记账 PWA

> 更新时间：2026-07-01（第九轮：startDate 随房间云同步）

## 项目信息
- 路径：~/Documents/记账app/-pwav1-移植版
- 分支：main（优化 12–18 已推送并部署）
- 生产地址：https://couple-ledger-seven.vercel.app（当前线上为优化 12–18 + 头像/PWA 修复版本）
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
- ESLint flat config + vitest 接入（35 tests passed）
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
- SYS_AVATARS 按性别分组、RoomSetup 新版像素风 UI、头像压缩

### 优化 10：创建页样式 + 背景图云同步 + 流水筛选 + 复盘提示
- commit: `6655924` + `0b5cffc`
- coupleBg 云同步、大额消费提示框、xlsx 按需加载

### 优化 11：流水日期选择重构
- commit: `f948729`（已推送 origin + Vercel 生产）
- `FlowDateSheet.tsx`：可选月份 + 自定义时间区间
- `flowDateMode`（month | day | range）

### 优化 12：移除外部依赖（不开代理也能访问）
- commit: `fd9e448`
- `next/font/local` + `public/fonts/` 四字体本地托管
- 移除 `@vercel/analytics`

### 优化 13：理财数据统计
- commit: `fd9e448`
- 理财子分类 `categoryKey="finance"`，首页 5 格总览、存钱「当月理财收入」模式、复盘理财趋势

### 优化 14：滚轮日期选择 + 复盘配色 + RoomSetup 快捷入口
- commit: `fff51b0`
- `FlowDateSheet.tsx`：年月选择改为 `WheelPicker` 滚轮
- `ledger.css`：滚轮样式；大额提醒背景 `#E8C547`、文字 `#5D2A1A`
- `RoomSetup.tsx`：localStorage 有房间号时显示「进入账本 #xxxx」

### 优化 15：导入查重 + PWA 图标 + RoomSetup 进房修复
- commit: `e483c96`
- **导入查重**：`lib/import-dedup.ts` + `ImportPreviewSheet` 按 date/type/amount 标记重复，灰色显示，可跳过，全部重复 toast 拦截
- **PWA 图标**：`icon-192/512/maskable.png`、`apple-touch-icon.png`、`manifest.json`、`public/sw.js`、`PwaRegister.tsx`
- **进房修复**：`sessionStorage` 标记本会话已进入，避免 reload 后反复卡在 RoomSetup

### 优化 16：房间切换与云同步重构（去 reload、本地先显示）
- commit: `49e1569`
- **问题**：换房/创建账本 `window.location.reload()` 卡顿；空数据在同步前 push 覆盖云端；调试刷新数据不同步
- **改动**：
  - `hooks/useLedger.ts`：`enterRoom()` / `leaveRoom()` 内存切换，无全页 reload
  - `lib/storage.ts`：`cancelPendingSync`、`flushStateSync`、`resetLocalStateForRoom`、`flushAndPushState`；`saveState(state, { push })` 分离本地保存与云推送
  - `app/page.tsx`：有房间号自动进首页；云同步后台进行，顶部「云同步中…」横幅；换房间走 `leaveRoom` + RoomSetup
  - `MineTab.tsx`：换房间不再 reload
- 初始云同步完成前禁止云推送，避免空数据覆盖云端

### 优化 17：开发环境 SW 修复（刷新卡在「加载中」）
- commit: `49e1569`
- **根因**：Service Worker 在 dev 缓存旧版 `_next` JS，React 无法 hydration
- **改动**：
  - `PwaRegister.tsx`：开发模式自动 `unregister` 所有 SW；生产环境才注册
  - `public/sw.js` v26：仅缓存 manifest/图标，不缓存 `/` 与 `/_next/*`
  - `useLedger` hydration 加 try/finally，读取失败也不卡加载

### 优化 18：RoomSetup「进入账本」玫粉样式 + 三按钮等距
- commit: `49e1569`
- `RoomSetup.tsx`：「进入账本」并入 `room-setup-actions`，与创建/加入同结构
- `ledger.css`：`.room-setup-btn.rose` 背景 `#D96A7E`；三按钮统一 `gap: 16px`；操作区 `margin-top: 24px` 下移

## 已完成优化（19 + 线上反馈修复）

### 头像性别分组 + PWA 图片预缓存
- commit: `8da7fbe`
- `lib/constants.ts`：按视觉性别重排 `SYS_AVATARS_FEMALE/MALE`，修正默认成员头像
- `hooks/useLedger.ts`：`addMember` 按性别分配默认头像
- `public/sw.js` v30：预缓存 tabbar / sys-av / avatars 静态图

### 云推送房间保障 + 建表补列
- commit: `0cc5786`
- `lib/storage.ts`：`pushToCloud` 开头 upsert `couples`，避免外键写入失败
- `supabase-migration.sql`：`couples` 表增加 `couple_bg_url/pos_x/pos_y` 三列

### 云同步收敛 + 启动性能优化
- commit: `d3f4303`
- **云同步失败收敛**（`lib/storage.ts`）：
  - `consecutivePushFailures` 计数，连续失败 ≥3 次后仅 `console.warn`，不再弹 toast
  - `reportCloudSyncFailure` / `resetCloudSyncFailures` 供 pull/push 共用
- **syncFromCloud 后不再回推**（`hooks/useLedger.ts`）：`saveState(..., { push: false })`
- **push 前校验房间**：`validateRoom` 不存在则 `localStorage.removeItem("couple-room-id")`
- **push 防抖**：`PUSH_DEBOUNCE_MS = 2500`（原 1s）

### PWA 启动加速（图片压缩 + SW v31）
- commit: `d3f4303`
- **图片压缩**（约 2.8MB → 240KB）：
  - `sys-av-*.png`（10 张）：320×320 PNG8，每张 18–32KB
  - `avatars/girl.jpg` / `boy.jpg`：512×512 JPEG q82，32KB / 24KB
- **`public/sw.js` v31**：
  - install 逐张 `fetch` + `cache.put`，单张失败不阻塞整体
  - `LOCAL_ASSETS` 增加 `"./"` 缓存首页 HTML，桌面启动可走缓存
  - fetch 时对 `/` 增加 `caches.match("./")` 回退

### 创建房间即时返回
- commit: `d3f4303`
- `lib/supabase.ts`：`createRoom` 本地生成房号立即返回，后台异步 `insert`
- 后台 insert 失败通过 `ledger-cloud-error` 事件 toast 提示

### startDate 随房间云同步
- commit: `58fb4d4`
- **`couples.start_date`**：`supabase-migration.sql` 建表 + 增量 `ALTER TABLE`
- **`createRoom`**：创建时写入当天日期
- **`fullPull` / `fullPush` / `pushToCloud`**：拉取/推送 `startDate`
- **`syncFromCloud`**：云端有值覆盖本地，无值保留本地（兼容旧房间）

### Supabase 需用户手动执行（背景图 + 在一起天数）
```sql
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_url TEXT DEFAULT '';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_x TEXT DEFAULT '50%';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_y TEXT DEFAULT 'center';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT '';
```

## 部署状态
- Vercel 项目：**couple-ledger-seven**（echowcyun-3364s-projects）
- 生产 URL：https://couple-ledger-seven.vercel.app
- 线上最新部署：commit `3eeeb92`（Cursor 指令文档），本地待推送 startDate 云同步
- 部署方式：`git push origin main`（见 `Vercel部署指令.md`）

## 新发现待修复问题（已全部修复 ✅）

### 问题 1：成员管理编辑界面头像性别分类错误 ✅
- **位置**：`lib/constants.ts` 中 `SYS_AVATARS_FEMALE` / `SYS_AVATARS_MALE`
- **根因**：当前按文件名奇偶数分组，但实际图片视觉性别与分组不一致
- **修复**（2026-07-01）：
  - 女性头像：1、3、5、6、8；男性头像：2、4、7、9、10
  - `DEFAULT_MEMBERS` 小五→`/sys-av-1.png`（女）、小云→`/sys-av-2.png`（男）
  - `addMember` 按性别分配默认头像（第 1 人 female、第 2 人 male）

### 问题 2：PWA 桌面图标首次/离线打开图片加载慢 ✅
- **位置**：`public/sw.js` Service Worker 缓存白名单
- **根因**：SW 仅缓存 manifest/应用图标，未缓存 tabbar/系统头像/RoomSetup 角色图
- **修复**（2026-07-01）：
  - `CACHE_NAME` 升级至 `couple-ledger-v31`（v30 起预缓存静态图，v31 加首页 HTML + install 容错）
  - `LOCAL_ASSETS` 扩展 tabbar 10 张、sys-av 10 张、avatars 2 张
  - 保持不缓存 `/_next/*` 与 `/api/*`

## 测试要求
- ✅ `npm run build` + `npm test`（35 passed，2026-07-01 startDate 云同步后验证）
- 验证换房间/换设备后「在一起天数」与云端一致
- 运行 Supabase 真实集成测试（或至少验证 build/dev 无错）
- 验证成员编辑页性别切换后头像分组正确
- 验证生产构建后 SW 缓存含 tabbar/avatars/sys-av 及首页 HTML（v31）
- 验证创建账本 UI 即时显示房号，弱网下后台 insert 失败有 toast

## 最近 commit 记录
```
d3f4303 perf: 云同步收敛 + 图片压缩 + SW v31 + 创建房间优化
0cc5786 fix: 云推送前 upsert couples 房间并补全建表背景图列
28570bb docs: 更新生产地址为 couple-ledger-seven.vercel.app
8da7fbe fix: 头像性别分组修正 + PWA 图片缓存 v30
49e1569 feat: 优化16-18 — 房间切换重构、SW 修复、RoomSetup 玫粉等距
e483c96 feat: 导入查重、PWA 图标与 RoomSetup 进入修复
9a1431e chore(docs): 清理冗余 Cursor 指令与交接文档，统一以 HANDOFF 为准
fff51b0 feat(ui): 优化14 — 滚轮日期选择、复盘配色与强制跳转 RoomSetup
fd9e448 feat: 优化9-13 全部完成（头像分组/背景图同步/日期重构/移除外部依赖/理财统计）
f948729 feat(ui): 优化11 — 流水日期下拉弹窗，支持月份与自定义区间筛选
```

## 文档说明
- 项目交接以 **`HANDOFF.md`** 为唯一入口（优化 1–18 进度已汇总）
- 部署步骤见 **`Vercel部署指令.md`**

## 待办事项
- ✅ `git push origin main` 推送优化 12–18 到 GitHub / Vercel
- ✅ 修复成员管理头像性别分组错误
- ✅ 修复 PWA 图片缓存，提升桌面图标启动速度
- ✅ 修复后整体跑一遍 `npm run build` + `npm test`
- ✅ 提交并推送云同步收敛 + SW v31 + 图片压缩 + 创建房间优化（commit `d3f4303`）
- ✅ 提交并推送 startDate 随房间云同步
- 确认 Supabase couples 表已加 couple_bg 三列 + start_date 并测试切换房间后背景图/在一起天数保留
- 若 dev 刷新仍异常：DevTools → Application → Service Workers → Unregister，再硬刷新

## 关键文件清单
- `lib/constants.ts` — TABS、INIT_CATS（含 finance）、SYS_AVATARS_FEMALE/MALE
- `lib/types.ts` — MonthSummary.financeIncome
- `lib/stats.ts` — getMonthSummary、getFinanceTrendData
- `lib/storage.ts` — saveState/push 分离、换房 flush、syncFromCloud、云同步失败收敛、push 前房间校验
- `lib/supabase.ts` — createRoom 异步后台 insert、fullPull/fullPush startDate
- `lib/import-dedup.ts` — 导入三元组查重
- `hooks/useLedger.ts` — enterRoom/leaveRoom、flowDateMode、理财分类
- `app/layout.tsx` — 本地字体、PWA metadata
- `app/page.tsx` — RoomSetup 路由、云同步横幅
- `components/PwaRegister.tsx` — SW 注册（仅生产）
- `components/modals/FlowDateSheet.tsx` — 流水日期滚轮弹窗
- `components/modals/RoomSetup.tsx` — 创建/加入/进入账本（玫粉快捷入口）
- `components/modals/ImportPreviewSheet.tsx` — 导入预览 + 查重
- `components/tabs/MineTab.tsx` — 换房间（无 reload）
- `components/styles/ledger.css` — 全局样式（room-setup/sw banner）
- `public/manifest.json`、`public/sw.js`、PWA PNG 图标
- `public/fonts/` — 4 个本地 woff2 字体
- `.env.local` — Supabase 环境变量

## 注意事项
- 主开发目录是 `-pwav1-移植版`
- `.env.local` 不会随 git 推送，Vercel 需手动配置环境变量
- 有已存房间号时自动进首页；无房间或「换房间」时显示 RoomSetup
- RoomSetup 三按钮：进入（玫粉）/ 创建（绿）/ 加入（橙），等距 16px
- 理财记账：选「收入 → 理财」，不是独立 TxType
- 结余公式：`balance = income - expense - savings`（理财已含在 income 内）
- dev 环境不注册 SW；生产 PWA 安装需 HTTPS
- `npm run build` + `npm test`（35 passed）已通过（2026-07-01 云同步/SW/图片压缩优化后验证）
- `startDate`（在一起天数）存于 `couples.start_date`，随房间云同步；旧房间云端无值时保留本地
- 当前 SW 缓存版本：`couple-ledger-v31`；生产 PWA 更新后若异常可 Unregister SW 再硬刷新

## 新对话继续方式
开新对话时说：**「读 HANDOFF.md 继续工作」**
