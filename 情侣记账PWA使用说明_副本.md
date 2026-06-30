# 情侣记账 PWA — 使用说明

> 技术栈：Next.js 16 + React 19 + Supabase + Tailwind CSS v4 + Recharts
>
> 线上地址：`https://couple-ledger-seven.vercel.app/`

---

## 一、用户侧

### 1. 添加桌面图标（PWA 安装）

情侣记账是一个 PWA 应用，安装到桌面后可以像原生 App 一样使用，有独立图标、无浏览器地址栏。

#### 1.1 iPhone / iPad（Safari）

1. 用 **Safari** 打开 `https://couple-ledger-seven.vercel.app/`（注意：**不支持微信内置浏览器、Chrome iOS**，只能用 Safari）
2. 点击底部工具栏中间的 **分享按钮**（方框+向上箭头）
3. 向下滑动菜单，找到并点击 **"添加到主屏幕"**
4. 确认名称"情侣记账"，点击右上角 **"添加"**
5. 桌面会出现"情侣记账"图标，点击即可以独立 App 形式打开

> 图标已配置 `apple-touch-icon.png`（180×180）和 `apple-mobile-web-app-capable`，添加到桌面后会隐藏 Safari 工具栏，体验接近原生 App。

#### 1.2 Android（Chrome / Edge / 系统浏览器）

1. 用 **Chrome** 或 **系统自带浏览器** 打开 `https://couple-ledger-seven.vercel.app/`
2. 浏览器会自动检测到 PWA 清单，通常会有以下提示之一：
   - 底部弹出 **"添加到主屏幕"** 横幅 → 点击添加
   - 地址栏右侧出现 **"安装"图标**（或三个点菜单 → "安装应用" / "添加到主屏幕"）
3. 确认安装，桌面会出现"情侣记账"图标

> Android 支持 **maskable 图标**（`icon-maskable.png`），安装后会适配不同启动器的图标形状（圆形、方形等）。

#### 1.3 桌面端（Chrome / Edge）

1. 用 Chrome 或 Edge 打开 `https://couple-ledger-seven.vercel.app/`
2. 地址栏右侧出现 **安装图标**（一个显示器+向下箭头），点击即安装
3. 安装后会在桌面生成快捷方式，作为独立窗口运行

---

### 2. 版本更新指南

情侣记账的 Service Worker（SW）会自动检测新版本并更新。

#### 2.1 自动更新机制

- 每次打开 App，SW 会在后台检查是否有新版本。
- 检测到新版本后，SW 会**自动激活并刷新页面**，你无需手动操作。
- 非 PWA 模式下（浏览器直接打开），每次刷新页面即获取最新代码。

#### 2.2 如果自动更新没生效（手动清理）

偶尔浏览器缓存可能导致没拿到最新版本，手动操作如下：

| 平台 | 操作步骤 |
|------|---------|
| **iPhone Safari** | 设置 → Safari → 清除历史记录与网站数据。或 PWA 桌面图标长按 → 删除，重新用 Safari 打开网址重新安装。 |
| **Android Chrome** | Chrome → 设置 → 隐私与安全 → 清除浏览数据 → 勾选"缓存的图片和文件" → 清除。然后刷新页面。 |
| **桌面 Chrome** | 打开 DevTools（F12）→ Application → Storage → Clear site data。刷新页面。 |
| **桌面桌面 PWA** | Chrome → `chrome://serviceworker-internals/` → 找到 `couple-ledger-seven.vercel.app` → 点击 Unregister。重新访问网址。 |

#### 2.3 查看当前版本

浏览器打开 DevTools（F12），切到 Application → Service Workers，找到注册的 SW，查看 Cache Name 中的版本号（当前为 `couple-ledger-v27`）。版本号越高说明越新。

---

### 3. 房间功能（两人一起记账）

情侣记账通过**房号**实现多人数据同步。

#### 3.1 创建房间

1. 打开 App，在 **"我的"** Tab 中点击"创建房间"
2. 系统自动生成 4 位房号（如 `3847`）
3. 把房号发给另一半

#### 3.2 加入房间

1. 另一半打开 App，在 **"我的"** Tab 中点击"加入房间"
2. 输入对方给的 4 位房号 → 确认
3. 加入成功后，**双方数据自动通过 Supabase 云端同步**

#### 3.3 切换 / 退出房间

- 在 **"我的"** Tab → 房间区域 → 可以切换房间或退出
- 退出房间后数据保留在本地，不会丢失

#### 3.4 注意事项

- 每个人都有属于自己的收入/支出记录（以成员区分），但存钱目标是共享的
- 双方同时操作不同账单不会冲突，云端以 ID 去重合并
- 如果 Supabase 不可用（网络问题），App 会降级为本地模式，数据只存在本机

---

### 4. 基础操作

#### 4.1 记账

- 点击底部 **"+"记账** Tab
- 选择支出/收入/存钱
- 输入金额、选择分类、选择经手人
- 点击保存

#### 4.2 存钱目标

- 首页 **"存钱目标"** 区域 → 点击 + 创建新目标
- 可设置目标金额和截止日期
- 支持手动存入、按比例更新、理财收入自动归入

#### 4.3 导入账单

- 支持 **支付宝 CSV**、**微信 CSV**、**通用 CSV/xlsx**
- 在"我的" Tab → 选择经手人 → 导入账单
- 导入预览会**自动标记重复账单**（灰色），全部重复时会拦截提示
- 支持**撤销导入**（最近 3 个批次）

#### 4.4 消费复盘

- **"复盘"** Tab 提供月度消费分析
- 支出饼图、TOP3 分类、环比变化、大额消费提醒
- 支持下月预算和存钱计划设定

#### 4.5 导出账单

- 在"我的" Tab → 选择成员 → 导出 xlsx

---

## 二、开发者侧

### 1. 技术栈概览

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16.2.6（App Router） |
| 前端 | React 19 + TypeScript |
| 样式 | Tailwind CSS v4 + tw-animate-css |
| 图表 | Recharts 3.9 |
| 数据库 | Supabase（PostgreSQL） |
| 部署 | Vercel（自动从 GitHub 部署） |
| 测试 | Vitest（35 个测试） |
| PWA | Service Worker（手写纯 JS）+ Web Manifest |
| 图标 | icon-192.png / icon-512.png / icon-maskable.png / apple-touch-icon.png + icon.svg |

---

### 2. 数据库管理（Supabase）

情侣账单中全部存储在 Supabase 的 PostgreSQL 数据库中，共 5 张表。

#### 2.1 表结构

```
couples                — 房间表
├── room_id  TEXT PK   — 4 位房号
└── created_at  BIGINT

transactions           — 交易记录表
├── id  TEXT PK        — 格式: tx_时间戳
├── room_id  TEXT FK   — 关联房间
├── date  TEXT         — yyyy-mm-dd
├── type  TEXT         — out / in / save
├── amount  REAL
├── category_key  TEXT
├── member_id  TEXT
├── note  TEXT
├── status  TEXT       — confirmed
├── recorder  TEXT
├── created_at  BIGINT
└── updated_at  BIGINT

goals                  — 存钱目标表
├── id  BIGINT PK      — 时间戳
├── room_id  TEXT FK
├── name  TEXT
├── emoji  TEXT
├── current  REAL
├── target  REAL
├── contributions  JSONB
├── history  JSONB
├── deadline  TEXT
└── updated_at  BIGINT

members                — 成员表
├── id  TEXT PK        — 如 wu / yun
├── room_id  TEXT FK
├── name  TEXT
├── avatar  TEXT
├── gender  TEXT
├── payday  INTEGER
└── updated_at  BIGINT

import_batches         — 导入批次表（用于撤销导入）
├── id  BIGINT AUTO PK
├── room_id  TEXT FK
├── ids  JSONB         — 批次包含的交易 ID 列表
├── source  TEXT       — alipay / wechat / generic
├── recorder  TEXT
├── count  INTEGER
├── time  TEXT
└── created_at  BIGINT
```

#### 2.2 建表 / 迁移

**首次建表**：在 Supabase 控制台 → SQL Editor，粘贴 `supabase-migration.sql` 执行。

**注意**：该脚本关闭了所有表的 Row Level Security（RLS），因为 App 使用匿名 key 访问，不走用户登录。**如果你的 Supabase 项目有其他敏感数据，请评估风险。**

#### 2.3 环境变量配置

Vercel 或本地 `.env.local` 中需要两个变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...（anon public key）
```

- 这两个变量带 `NEXT_PUBLIC_` 前缀，会被编译到前端 JS bundle 中。
- **必须使用 anon key（公开 key）**，不要用 service_role key——匿名 key 的权限由 RLS 控制，足够安全。

#### 2.4 数据备份

Supabase 免费层提供自动每日备份。在 Supabase 控制台 → Project Settings → Database → Backups 可以查看和恢复。

如需手动备份，在 Supabase SQL Editor 执行：

```sql
-- 导出所有房间的交易记录
SELECT * FROM transactions;
```

或使用 `pg_dump`（需要 Supabase 提供的连接字符串）：

```bash
pg_dump "postgresql://postgres:[password]@[host]:6543/postgres" \
  --table=transactions --table=goals --table=members --table=couples --table=import_batches \
  > backup-$(date +%Y%m%d).sql
```

#### 2.5 数据清理

如果需要清理某个房间的数据（用于测试或废弃房间），在 Supabase SQL Editor：

```sql
-- 删除指定房间的所有数据
DELETE FROM import_batches WHERE room_id = '1234';
DELETE FROM transactions WHERE room_id = '1234';
DELETE FROM goals WHERE room_id = '1234';
DELETE FROM members WHERE room_id = '1234';
DELETE FROM couples WHERE room_id = '1234';
```

---

### 3. 房间号管理

#### 3.1 工作原理

- 每个房间由 4 位随机数字（1000-9999）标识
- 用户创建房间 → Supabase `couples` 表插入一行（防碰撞重试最多 10 次）
- 用户加入房间 → 查询 `couples` 表验证房号是否存在
- 如果 Supabase 不可用：回退到**本地模式**，房号存在 `localStorage` 的 `couple-local-rooms` key 中

#### 3.2 查看所有房间

在 Supabase SQL Editor：

```sql
-- 查看所有房间及其成员数、交易数
SELECT
  c.room_id,
  c.created_at,
  COUNT(DISTINCT t.id) AS transaction_count,
  COUNT(DISTINCT m.id) AS member_count
FROM couples c
LEFT JOIN transactions t ON t.room_id = c.room_id
LEFT JOIN members m ON m.room_id = c.room_id
GROUP BY c.room_id, c.created_at
ORDER BY c.created_at DESC;
```

#### 3.3 手动创建房间（调试用）

```sql
INSERT INTO couples (room_id) VALUES ('9999');
```

#### 3.4 房间锁定

代码中使用 `async-mutex` 库实现房间级别的操作锁（`withRoomLock`），确保同一个房间的写操作不会并发冲突。锁的 key 为 `room_<roomId>`，存储在内存中，页面关闭即释放。

---

### 4. 部署与维护

#### 4.1 部署架构

- **代码托管**：GitHub
- **部署平台**：Vercel（免费层）
- **数据库**：Supabase（免费层）
- **域名**：Vercel 自动分配 `*.vercel.app` 域名，可绑定自定义域名

#### 4.2 部署流程

1. 本地开发和测试：
   ```bash
   pnpm dev      # 启动开发服务器 → http://127.0.0.1:3006
   pnpm test     # 运行测试
   pnpm build    # 生产构建
   pnpm start    # 本地预览生产构建 → http://127.0.0.1:3005
   ```

2. 推送到 GitHub：Vercel 自动检测 Git push 并触发部署。

3. 检查部署状态：在 Vercel Dashboard 查看构建日志。

#### 4.3 Service Worker 更新注意事项

- **SW 文件必须是纯 JavaScript**：`public/sw.js` 是浏览器原生执行的，不能包含 TypeScript 语法。
- 更新 SW 时只需改 `CACHE_NAME` 版本号（如 `v27` → `v28`），浏览器检测到新 SW 后会走 install → activate → skipWaiting → clients.claim 流程自动激活。
- 如果改了 `LOCAL_ASSETS` 列表（增加了新的静态资源），也需要改 CACHE_NAME。
- **本地开发时** SW 会被 PwaRegister 自动 unregister（`NODE_ENV !== "production"`），所以本地 dev 不会受到 SW 缓存影响。

#### 4.4 常见维护任务

| 任务 | 方法 |
|------|------|
| 升级依赖 | `pnpm update --latest`，然后 `pnpm test` + `pnpm build` 验证 |
| 清理旧房间数据 | 在 Supabase SQL Editor 中执行 DELETE 语句（见上文） |
| 新增分类 | 修改 `lib/constants.ts` 中的 `INIT_CATS`，或通过 App 内自定义分类功能 |
| 修改默认成员 | 修改 `lib/constants.ts` 中的 `DEFAULT_MEMBERS` |
| 新增图标 | 替换 `public/` 下的 PNG 文件，更新 `manifest.json` 和 `app/layout.tsx` metadata |
| PWA 图标更新 | 用 Pillow 从 1024×1024 源图生成各尺寸 → `public/` 覆盖 + 改 manifest 版本 |

---

### 5. 本地开发指南

#### 5.1 环境准备

```bash
# 安装依赖
pnpm install

# 创建 .env.local（从 Vercel 或 Supabase 获取值）
echo 'NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co' >> .env.local
echo 'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...' >> .env.local
```

#### 5.2 开发命令

```bash
pnpm dev       # http://127.0.0.1:3006 — 开发模式，热更新
pnpm test      # 运行 35 个单元测试
pnpm build     # 生产构建
pnpm lint      # ESLint 检查
```

#### 5.3 关键目录结构

```
public/               # 静态资源（SW、图标、字体、系统头像）
├── sw.js             # Service Worker — 纯 JS，禁止 TS
├── manifest.json     # PWA 清单
├── icon-*.png        # PWA 图标（4 个尺寸）
├── sys-av-*.png      # 系统头像（10 个）
└── tabbar/           # Tab 栏图标

components/           # React 组件
├── PwaRegister.tsx   # SW 注册与更新逻辑
├── modals/           # 弹窗（RoomSetup、记账、目标等）
└── tabs/             # 5 个 Tab 页面组件

hooks/
└── useLedger.ts      # 核心状态管理 Hook（1294 行，所有业务逻辑）

lib/
├── supabase.ts       # Supabase 客户端 + 云同步 API
├── constants.ts      # 常量、分类、成员配置
├── types.ts          # TypeScript 类型
├── storage.ts        # localStorage 读写 + 云同步编排
├── importers/        # 账单导入解析器（支付宝/微信/通用）
├── import-dedup.ts   # 导入查重逻辑
├── stats.ts          # 统计计算
├── goals.ts          # 目标逻辑
├── review.ts         # 复盘计划
├── sync-lock.ts      # 房间锁（async-mutex）
└── sync-utils.ts     # 重试 + 超时封装
```

---

### 6. 常见问题排查

#### 6.1 SW 注册失败

- **症状**：线上 PWA 不生效，桌面图标打开后还是浏览器模式
- **排查**：打开 DevTools → Application → Service Workers，检查 SW 状态
- **常见原因**：
  - `sw.js` 包含 TypeScript 语法（已修复为纯 JS）
  - SW 路径不在根目录（必须 `/sw.js`）
  - manifest.json 的 `start_url` 不匹配

#### 6.2 云同步失败

- **症状**：两人数据不对齐
- **排查**：
  1. 检查 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否正确
  2. Supabase 控制台 → SQL Editor → `SELECT * FROM couples` 检查房号是否存在
  3. 查看浏览器 Console 中 `console.warn` 的报错信息
  4. 检查 Supabase 项目的使用配额是否已满（免费层 500MB）

#### 6.3 构建失败

- 先跑 `pnpm test` 确保测试通过
- 检查 TypeScript 类型错误：`npx tsc --noEmit`
- 检查 ESLint：`pnpm lint`

#### 6.4 本地 dev 与线上表现不一致

- dev 模式下 SW 会被 unregister，所有页面刷新都是"拉最新"
- 如果线上有问题但 dev 正常，怀疑是 SW 缓存 ⇒ 参照用户侧"手动清理"步骤
