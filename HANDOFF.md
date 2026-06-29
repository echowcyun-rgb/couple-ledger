# Cursor 对话交接 - 情侣记账 PWA

> 更新时间：2026-06-30

## 项目信息
- 路径：~/Documents/记账app/-pwav1-移植版
- 分支：feature/review-income-fixes（本地 ahead 22+ commits，含未提交工作区改动）
- 技术栈：Next.js 16.2.6 + Turbopack + React 19 + TypeScript 5.7 + Tailwind 4 + Supabase + @e965/xlsx + async-mutex
- 启动命令：`npm run dev`（端口 3006）
- 生产：`npm run build` → `npm run start`（端口 3005）
- 主开发目录：`-pwav1-移植版`（不要用旧工作区 `-pwa-0-echowcyun-3364-84738c13`，那个是落后分支）

## 已完成的优化（全部 ✅）

### 阶段 0-4 自测+修复
- xlsx 漏洞修复（@e965/xlsx 替换高危 xlsx）
- Supabase 同步竞态+超时（async-mutex + withTimeout 10s + withRetry 指数退避）
- TypeScript 类型错误修复（构建启用 TS 校验）
- ESLint flat config + vitest 接入（32 tests passed）
- 5 张表（couples/members/transactions/goals/import_batches）RLS 已全部 DISABLE

### 优化 1：导入智能分类 + 撤销导入
- 60 条关键词映射（lib/category-keywords.ts，matchCategoryByKeywords）
- 导入预览页（ImportPreviewSheet）支持分类下拉 + 未分类二次确认
- 撤销导入功能（RevertImportSheet，按 batch.ids 删除）
- 支付宝 CSV GBK/UTF-8 双解码（lib/csv-decode.ts，按中文特征打分）

### 优化 2：支付宝 CSV 修复 + 备注截取
- 动态表头映射（parseAlipayCSV 改为按表头名定位列）
- noteFromDesc 截取商品说明前 5 字

### 优化 3：卡片点击 + 描边字体 + 累加模式
- 存钱卡片 onClick → openUpdateGoal
- goal-card-days 13px 描边
- saveUpdateGoal 从覆盖改累加（goal.current + num）

### 优化 4：爱心居中 + 玫红色
- couple-heart flex 居中到两个头像之间
- review-plan-save 改 var(--out) 玫红色（我的页天数后改为嫩黄色 #FFD700 一行排版）

### 优化 5：底部导航栏像素风图标
- 10 张像素风 PNG（public/tabbar/，128×128px）
- TABS 加 imgActive 字段
- TabBar 双图切换（选中 imgActive / 正常 img）
- 中间记账按钮：顶部裁切 15%、显示「记账」标签
- 旧 nav-*.png 已删除（commit `90cb0b2`）

### 优化 6：UI 修复批次
- 记账按钮绿底删除（.plus 去 background/border/shadow，record-img 44px）
- 结余计算核查（代码已是 income-expense-savings，console.log 已排查并移除）
- 存钱卡片字体描边：goal-card-days 改阴影；goal-card-amt/hint 加描边
- 流水+复盘数据汇总栏删除（flow-summary / review-top 整块删）
- 数字去逗号（yuan() 去 toLocaleString）

### 优化 7：功能增强
- 导入后可删除项目（ImportPreviewSheet 加 ✕ 按钮 + removeRow）
- 重复导入提醒（localStorage 存文件指纹 name|size|lastModified，最多 50 条）
- 导入导出前选成员（MineTab 加成员选择弹窗 + pendingImportMemberRef）
- 存钱卡片字体调整（hint 放大 + amt 改阴影）
- 底部导航栏水平对齐（.tabbar align-items flex-end + .tab min-height 56px）
- 我的界面改版（名字分列头像下方 +「开始记账 x 天啦」一行排版金黄色）

### 优化 8：存钱激励 + 发薪日提醒 + 成员限制
- 更新历史可修改（UpdateGoalSheet 加编辑/删除 + editGoalHistory/deleteGoalHistory + GoalHistoryEntry.id，删除后自动重算 current）
- 发薪日当天字幕「今天是发薪日，记得存一笔哦！」红色加粗 #D32F2F（条框背景保持 cream 不变）
- 发薪日弹窗居中（sessionStorage 仅在关闭时写入，防 Strict Mode 重复挂载 bug）
- 存钱恭喜弹窗（4 档随机文案 + celebrate-bounce，样式与发薪日弹窗一致居中）
- 成员管理最多 2 名（MemberPage 隐藏新增 + addMember 防御检查）

### backlog 修复 ✅
- 导出 xlsx 空分类显示「未分类」
- 启动加载慢 + 旧数据残留（cloudSynced 等待云同步；syncFromCloud 清理已删云端交易）
- 单条 deleteTransaction 补云端删除（deleteCloudTransaction）
- 成员 2→4 重复 bug（reconcileMembers 去重 + pushToCloud 先删后写 + 上限 2 人）
- 更新历史编辑：金额输入框与 ✓ 按钮宽度对调
- `npm run build` + `npm test`（32 passed）验证通过

## 待办 backlog
- Vercel 实际上线部署（见 `Vercel部署指令.md`）

## 关键文件清单
- `lib/constants.ts` — TABS 数组配置
- `lib/types.ts` — 类型定义（GoalHistoryEntry 加 id / Goal / Transaction 等）
- `lib/format.ts` — yuan() 金额格式化（已去逗号）
- `lib/supabase.ts` — 云同步（withTimeout/withRetry/upsert/deleteCloudTransaction）
- `lib/storage.ts` — pushToCloud/syncFromCloud（锁+超时+重试+成员 reconcile）
- `lib/sync-lock.ts` — withRoomLock（每 roomId 一个 mutex）
- `lib/sync-utils.ts` — withTimeout/withRetry/isRetryableError
- `lib/category-keywords.ts` — 60 条关键词映射
- `lib/csv-decode.ts` — GBK/UTF-8 双解码
- `lib/couple-bg.ts` — normalizeCoupleBg
- `hooks/useLedger.ts` — 核心 hook（所有业务逻辑）
- `components/TabBar.tsx` — 底部导航栏（双图切换）
- `components/tabs/HomeTab.tsx` — 首页（发薪日字幕）
- `components/tabs/FlowTab.tsx` — 流水
- `components/tabs/ReviewTab.tsx` — 复盘
- `components/tabs/MineTab.tsx` — 我的（含成员选择弹窗）
- `components/modals/UpdateGoalSheet.tsx` — 更新存钱进度（含历史编辑）
- `components/modals/ImportPreviewSheet.tsx` — 导入预览（含删除行）
- `components/modals/RevertImportSheet.tsx` — 撤销导入
- `components/modals/MemberPage.tsx` — 成员管理（最多 2 人）
- `components/modals/CoupleBgAdjustSheet.tsx` — 背景图平移
- `components/styles/ledger.css` — 全局样式
- `app/page.tsx` — 主页面（发薪日弹窗 + 恭喜弹窗挂载点）
- `public/tabbar/` — 10 张像素风图标
- `.env.local` — NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
- `next.config.mjs` — Vercel 部署用（已去掉 output: 'export'）

## Supabase 配置
- URL 和 anon key 在 `.env.local`
- 5 张表 RLS 已全部 DISABLE
- room_id=4230 是测试房间
- import_batches 表有 status 字段（active/reverted）

## 注意事项
- 主开发目录是 `-pwav1-移植版`，不是旧工作区
- 沙箱限制可能无法启动 dev server，需用户本地跑 `npm run dev`
- 不要删除 `.workbuddy/` 目录（WorkBuddy 工作区记忆）
- `tsconfig.tsbuildinfo` 已在 .gitignore
- `.env.local` 不会随 git 推送，Vercel 需手动配置环境变量

## commit 建议

```
feat: 优化1-8全部完成 + 云同步/backlog/UI修复

- 导入智能分类/撤销/成员选择/像素风导航
- 存钱激励/发薪日弹窗/恭喜弹窗/成员上限2人
- 云同步修复：deleteTransaction/deleteCloud、reconcileMembers、cloudSynced
- 弹窗居中、发薪日条框样式、导出未分类
```
