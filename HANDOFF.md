# 项目进度交接文档（第三轮）

> 情侣记账 PWA（移植版）— 供新对话开场使用
> 更新时间：2026-06-29 21:24

---

## 0. ⚠️ 当前最紧急：优化 3 未完成 + build 未验证

**优化 3 代码已改，但未 commit、未 build 验证。** 新对话第一件事是跑 build 确认通过，然后 commit，再继续优化 4。

### 优化 3 改动状态

| 文件 | 改动 | 状态 |
|------|------|------|
| `components/tabs/HomeTab.tsx` | 卡片 onClick: `openEditGoal` → `openUpdateGoal`；aria-label 改"更新目标进度" | ✅ 已改 |
| `components/styles/ledger.css` | `.goal-card-days` font-size 9px→13px + 8 向 text-shadow 黑描边 | ✅ 已改 |
| `hooks/useLedger.ts` | `saveUpdateGoal` 按金额模式改为累加（`goal.current + num`）；history.amount 记录本次存入值 | ✅ 已改 |
| `components/modals/UpdateGoalSheet.tsx` | 按金额模式文案"已存金额(元)"→"本次存入(元)" | ✅ 已改 |

### 验证状态

| 检查 | 结果 |
|------|------|
| `npm test` | ✅ 32/32 通过 |
| `npm run build` | ❌ **未验证**（后台任务被中断，无输出） |
| `tsc --noEmit` | ❌ **未验证**（后台任务被中断，无输出） |
| git commit | ❌ **未提交** |

### 新对话第一步：验证 + 提交优化 3

```bash
# 先清锁和残留进程
pkill -f "next build"; rm -f ~/Documents/记账app/-pwav1-移植版/.next/lock

# 直接跑 build（不要 pipe tail）
cd ~/Documents/记账app/-pwav1-移植版 && npm run build

# build 通过后提交
git add -A
git commit -m "feat(ui): 首页存钱卡片点击改更新进度 + 还差xx天字体加大描边"
```

如果 build 报错，修完再提交。

---

## 1. 项目基本信息

| 项 | 内容 |
|----|------|
| **路径** | `~/Documents/记账app/-pwav1-移植版` |
| **分支** | `feature/review-income-fixes` |
| **技术栈** | Next.js 16.2.6 · React 19 · TypeScript 5.7 · Tailwind 4 · Supabase JS · async-mutex · @e965/xlsx |
| **开发启动** | `npm run dev` → `http://127.0.0.1:3006` |
| **生产启动** | `npm run build` → `npm run start` → 端口 **3005** |
| **环境变量** | `.env.local`：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **核心目录** | `app/` `components/` `hooks/useLedger.ts` `lib/supabase.ts` `lib/storage.ts` `lib/sync-utils.ts` `lib/sync-lock.ts` `lib/couple-bg.ts` `lib/category-keywords.ts` `lib/csv-decode.ts` |

---

## 2. 已完成阶段（按时间顺序）

### 自测修复

| 阶段 | Commit | 说明 |
|------|--------|------|
| 阶段 1｜安全 | `46377ce` | `xlsx` → `@e965/xlsx`，消除高危 CVE |
| 阶段 2｜同步 | `1877d88` | roomId 级 mutex、10s 超时、指数退避重试、upsert 替代 delete-insert、修 supabase 类型 |
| 阶段 3｜类型 | `9470c6f` | 删除 `next.config.mjs` 的 `ignoreBuildErrors`，构建启用 TS 校验 |
| 阶段 3.5｜UI 超时 | 待确认 | RoomSetup 移除独立 setTimeout，loading 跟随底层 withTimeout+withRetry（方案 B） |
| 阶段 4.1｜ESLint | 待确认 | 接入 ESLint flat config，22 个 error 修复 |
| 阶段 4.2｜单测 | 待确认 | vitest 单测，sync-utils / sync-lock / supabase mock |

> **注意：** 阶段 3.5 / 4.1 / 4.2 之前说"本地未提交"，新对话开场先 `git status` 确认。如果没提交，先提交再继续。

### UI 优化第一批

| 优化 | Commit | 说明 |
|------|--------|------|
| 分类管理 bug | `549ec10` | 单输入框、下滑手势仅绑 grab 条 |
| 首页存钱遮罩/字体 | `87681ad` | 遮罩仅标题区、剩余时间白字加粗 ❗️ |
| 卡片点击编辑 | `590c18c` | 首页 goal-card → `openEditGoal` → `EditGoalSheet`（优化 3 已改为 `openUpdateGoal`） |
| 复盘下月计划 | `1d9a488` | 间距 16px、保存按钮 `var(--out)` 红色、右对齐 |
| 背景图平移 | `cf375ea` | `coupleBg` 扩展 `{url,posX,posY}` + `CoupleBgAdjustSheet` |

### UI 优化第二批（导入功能增强）

| 优化 | Commit | 说明 |
|------|--------|------|
| 导入智能分类 | `5d2d4a9` | 60 条关键词映射 + `ImportPreviewSheet` 预览 + 未分类二次确认 |
| 支付宝 CSV 修复 | `d48d6b2` | GBK 解码 + 动态表头映射，修复"未识别类型" |
| 备注截取 | `7656afb` | `noteFromDesc` 截取商品说明前 5 字 |
| 撤销导入 | `4b3e06c` | `RevertImportSheet` + 批量删 transactions + 标记 reverted |
| **优化 3｜卡片更新进度** | **未提交** | 卡片点击改 `openUpdateGoal` + 字体加大描边 + 累加模式（见第 0 节） |

---

## 3. 关键决策记录

### Supabase upsert onConflict

| 表 | onConflict |
|----|------------|
| goals | `room_id,id` |
| members | `room_id,id` |
| import_batches | `room_id,time` |
| transactions | `id`（未改） |

### 锁 / 超时 / 重试

| 配置 | 值 / 实现 |
|------|-----------|
| 锁 | `async-mutex`，每 `roomId` 一把，`withRoomLock`（`lib/sync-lock.ts`） |
| 超时 | `CLOUD_TIMEOUT_MS = 10000`（`lib/sync-utils.ts`） |
| 重试 | `withRetry`，`retries: 2`，`baseDelay: 500`，指数退避 + jitter |
| push 防抖 | `saveState` 仍 **1s**（未改） |

### withRetry 错误分类

- **重试**：网络/超时、`RETRYABLE_POSTGREST_CODES` 白名单（08xxx、死锁、PGRST000/502-504）、message 含 5xx
- **不重试**：`PGRST1–4xx`、`23xxx` 约束、`42501` RLS、`PGRST116`、其它业务错误

### UI / 功能决策

| 项 | 决策 |
|----|------|
| xlsx 替换 | `@e965/xlsx`（drop-in） |
| 背景图调整 | 方案 A（平移 + 滑块，无新依赖） |
| UI 超时（RoomSetup） | 方案 B（删除独立超时，跟底层 withTimeout+withRetry） |
| 导入分类未命中 | categoryKey 存 `""`，UI 显示"未分类"，不瞎猜 |
| 撤销导入 | 物理删除 transactions，importBatches 标记 `status: "reverted"` 保留审计 |
| **优化 3 卡片点击** | 改为 `openUpdateGoal`（复用 UpdateGoalSheet，不新建） |
| **优化 3 字体** | 13px + 8 向 text-shadow 黑描边 |
| **优化 3 更新语义** | 按金额模式改为**累加**（`goal.current + num`），百分比模式不变 |

---

## 4. 当前代码状态

| 检查 | 结果 |
|------|------|
| `tsc --noEmit` | ⚠️ 未验证（优化 3 改动后未跑） |
| `npm run build` | ⚠️ 未验证（后台任务中断） |
| `npm test` | ✅ 32/32 通过 |
| `eslint .` | ⚠️ 未验证 |
| git 工作区 | ⚠️ 优化 3 改动未提交，可能有阶段 3.5/4 改动也未提交 |

---

## 5. Supabase 配置变更（全部已在控制台执行）

### UNIQUE 约束

```sql
ALTER TABLE import_batches ADD CONSTRAINT import_batches_room_time_unique UNIQUE (room_id, time);
ALTER TABLE goals ADD CONSTRAINT goals_room_id_id_unique UNIQUE (room_id, id);
ALTER TABLE members ADD CONSTRAINT members_room_id_id_unique UNIQUE (room_id, id);
```

### 列变更

```sql
ALTER TABLE goals ADD COLUMN "completedAt" TEXT DEFAULT NULL;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE import_batches ADD CONSTRAINT import_batches_status_check CHECK (status IN ('active', 'reverted'));
```

### RLS（5 张表全部关闭）

```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE couples DISABLE ROW LEVEL SECURITY;
```

**验证方法：**
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('transactions','import_batches','goals','members','couples');
-- 全部应为 false
```

### 相关 SQL 文件（项目根目录）

- `supabase-migration.sql` — 建表
- `supabase-fix-rls.sql` — 关 RLS
- `supabase-add-deadline.sql` — goals.deadline

---

## 6. 遗留问题清单

| # | 问题 | 阻塞 | 建议时机 |
|---|------|------|----------|
| 1 | **优化 3 未提交未验证** | 🔴 是 | 新对话第一件事 |
| 2 | 阶段 3.5/4.1/4.2 可能未提交 | 🟡 待确认 | 新对话开场 git status |
| 3 | 优化 4：我的页爱心居中 + 右侧玫红色 | 否 | 优化 3 完成后 |
| 4 | 优化 5：底部导航栏图标替换图片 | 否 | 等用户提供素材 |
| 5 | 已有背景图无法重新调整位置 | 否 | UI 小需求 |
| 6 | coupleBg 未同步 Supabase | 否 | 多设备需求时 |
| 7 | 启动加载慢 + 旧数据（诊断报告已有） | 否 | 产品评估后 |
| 8 | 单条 deleteTransaction 只删本地不删云端 | 否 | backlog |
| 9 | 撤销云端失败后 transactions 不会自动重删 | 否 | backlog |
| 10 | 导出 xlsx 空分类显示空白列 | 否 | backlog |
| 11 | fullPush 无 room 锁（当前无调用方） | 否 | 用到时再修 |
| 12 | npm audit 仍有 postcss/next 间接 moderate | 否 | 依赖升级时 |
| 13 | RLS 开发阶段用 DISABLE，上线前需补 policy | 否 | 上线前 |

---

## 7. 下一步待办（新对话执行顺序）

1. **🔴 优先：验证 + 提交优化 3**
   - `pkill -f "next build"; rm -f .next/lock`
   - `npm run build`（不要 pipe tail）
   - build 通过 → `git add -A && git commit`
   - build 失败 → 修 → 再 build

2. **确认工作区状态**
   - `git status` 看有没有阶段 3.5/4.1/4.2 未提交的改动
   - 有就一并提交

3. **优化 4：我的页置顶模块**
   - 爱心放到两个头像之间（flex 三段式或绝对定位居中）
   - 右侧文字改玫红色 `var(--out)`（#D96A7E）

4. **优化 5：底部导航栏图标替换**
   - 先输出素材需求清单（几张图、尺寸、格式、命名）
   - 等用户提供图片后再实现

5. **🧹 项目文件清理（先扫描列清单，确认后再删）**
   - 扫描项目根目录,列出所有 `.md` / `.sql` / 临时文件 / 备份文件
   - 判断哪些是废弃的(过期的修复记录、临时草稿、重复文档)
   - **不要直接删**,先输出清单给我确认:
     - 文件名 + 大小 + 最后修改时间 + 判断(保留/删除) + 理由
   - 确认要删的文件,用 `git rm` 或移到 `.trash/` 目录,不要直接 `rm`
   - **保留的文件**:HANDOFF.md / README.md / 所有 supabase-*.sql / .cursor-guide.md / docs/ / Vercel操作指南.md(除非确认废弃)
   - **可能废弃的**:fix-all.md / 其他修复过程文档 / 临时测试文件

6. **backlog（不急）**
   - 导出 xlsx 空分类显示"未分类"
   - 启动加载慢 + 旧数据问题评估
   - 单条 deleteTransaction 补云端删除

---

## 8. 真实账单文件格式（供后续参考）

### 支付宝 CSV

- 编码 **GBK**，文件名 `支付宝交易明细*.csv`
- 18 行表头，12 列：交易时间/交易分类/交易对方/对方账号/商品说明/收/支/金额/收/付款方式/交易状态/交易订单号/商家订单号/备注
- 前 17 行是说明文字需跳过
- 解析已修复：`lib/csv-decode.ts` GBK/UTF-8 双解码 + 动态表头映射

### 微信 XLSX

- 标准 xlsx（UTF-8），文件名 `微信支付账单流水文件*.xlsx`
- 18 行表头，11 列：交易时间/交易类型/交易对方/商品/收/支/金额(元)/支付方式/当前状态/交易单号/商户单号/备注
- 交易时间是 datetime 类型

---

## 新对话开场建议

直接粘贴本文档，并说明：

> 这是上一轮对话的进度交接，请阅读后先完成优化 3（验证 build + 提交），然后继续优化 4。

**关键提醒：**
- 跑 build 不要 pipe tail，直接跑
- 先 `pkill -f "next build"` 清残留进程
- 先 `git status` 确认工作区
- 优化 3 方案已确认，代码已改，只需验证 + 提交，不要重新走方案确认流程
