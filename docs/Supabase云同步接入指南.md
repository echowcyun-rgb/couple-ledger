# 情侣记账 PWA — Supabase 云同步接入指南

## 已完成的改动

### 1. 新增文件
| 文件 | 说明 |
|------|------|
| `.env.local` | Supabase 连接凭证（URL + anon key，已配置） |
| `lib/supabase.ts` | Supabase 客户端初始化 |
| `setup-db.sql` | 4 张表的 DDL 脚本，需要在 Supabase SQL Editor 执行 |

### 2. 修改文件
| 文件 | 改动 |
|------|------|
| `lib/storage.ts` | 重写：保留原 localStorage 读写接口 + 新增 `syncFromCloud()` + 自动云推送 |
| `hooks/useLedger.ts` | 初始化后自动调用 `syncFromCloud()`，有云端数据则合并后 toast 提示 |

### 3. 新增依赖
- `@supabase/supabase-js`（已 `npm install`）

---

## 你需要在 Supabase 面板中执行

1. 打开 https://supabase.com/dashboard → 进入你的项目
2. 左侧导航 → **SQL Editor**
3. 点击 **New Query** → 复制 `setup-db.sql` 的全部内容 → 粘贴 → 运行
4. 确认 4 张表创建成功（可在 Table Editor 看到）

---

## 数据流说明

```
用户操作 → 立即写 localStorage → 1 秒后自动推云端
                  ↓
应用启动 → 读 localStorage → 从云端拉取合并 → 更新 UI
```

- 离线可用：所有数据操作都先走 localStorage
- 云同步在后台进行，用户无感
- 如果两台手机同时记账：先推先赢，后拉时合并（按 id 去重）

---

## 验证方式

1. 运行 `npm run dev` 启动
2. 在浏览器中打开
3. 记一笔账 → 检查浏览器 DevTools Console，没报错即可
4. 去 Supabase Table Editor → `transactions` 表 → 应该能看到刚记的这笔

---

## 如遇到问题

- **「@supabase/supabase-js 找不到」** → 在终端重新跑 `npm install`
- **「环境变量不生效」** → 重跑 `npm run dev`（Next.js 需要重启读取 .env.local）
- **「云同步没反应」** → 检查 Console 有无 `cloud push failed` 或 `cloud sync failed` 的 warn 日志
