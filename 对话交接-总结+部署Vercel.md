# 对话交接：总结进度 + 部署 Vercel

## 第一步：更新 HANDOFF.md

请把当前所有工作进度总结覆盖写入项目根目录的 `HANDOFF.md`，供下一个 Cursor 对话和部署参考。格式如下：

```markdown
# Cursor 对话交接 - 情侣记账 PWA

## 项目信息
- 路径：~/Documents/记账app/-pwav1-移植版
- 技术栈：Next.js 16.2.6 + Turbopack + React 19 + TypeScript 5.7 + Tailwind 4 + Supabase + @e965/xlsx + async-mutex
- 启动命令：npm run dev（端口 3006）
- 主开发目录：-pwav1-移植版（不要用旧工作区 -pwa-0-echowcyun-3364-84738c13，那个是落后分支）

## 已完成的优化（全部 ✅）

### 阶段 0-4 自测+修复
- xlsx 漏洞修复（@e965/xlsx 替换高危 xlsx）
- Supabase 同步竞态+超时（async-mutex + withTimeout 10s + withRetry 指数退避）
- TypeScript 31 个类型错误修复
- ESLint flat config + vitest 接入
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
- review-plan-save 改 var(--out) 玫红色

### 优化 5：底部导航栏像素风图标
- 10 张像素风 PNG（public/tabbar/，128×128px）
- TABS 加 imgActive 字段
- TabBar 双图切换（选中 imgActive/正常 img）
- 中间记账按钮用 record.png 替换文字 +
- 旧 nav-*.png 已删除

### 优化 6：UI 修复批次
- 记账按钮绿底删除（.plus 去 background/border/shadow，record-img 44px）
- 结余计算核查（代码已是 income-expense-savings，加 console.log 排查）
- 存钱卡片字体描边：goal-card-days 改阴影；goal-card-amt/hint 加描边
- 流水+复盘数据汇总栏删除（flow-summary / review-top 整块删）
- 数字去逗号（yuan() 去 toLocaleString + HomeTab 3 处替换）

### 优化 7：功能增强
- 导入后可删除项目（ImportPreviewSheet 加 ✕ 按钮 + removeRow）
- 重复导入提醒（localStorage 存文件指纹 name|size|lastModified，最多 50 条）
- 导入导出前选成员（MineTab 加成员选择弹窗 + useLedger 加 pendingImportMemberRef）
- 存钱卡片字体调整（hint 放大 + amt 改阴影）
- 底部导航栏水平对齐（.tabbar align-items flex-end + .tab min-height 56px）
- 我的界面改版（名字分列头像下方 + "开始记账x天啦"一行排版金黄色 #FFD700）

### 优化 8：存钱激励 + 发薪日提醒 + 成员限制
- 更新历史可修改（UpdateGoalSheet 加编辑/删除按钮 + editGoalHistory/deleteGoalHistory + GoalHistoryEntry 加 id 字段，删除后自动重算 current）
- 发薪日当天字幕改"今天是发薪日，记得存一笔哦！"红色加粗 #D32F2F
- 发薪日弹窗（app/page.tsx 加 showPaydayAlert + sessionStorage 防同日重复）
- 存钱恭喜弹窗（按金额分大/中/小/完成 4 档随机文案 + celebrate-bounce 动画）
- 成员管理最多 2 名（MemberPage 隐藏新增按钮 + addMember 加防御性检查）

## 待办 backlog（非紧急）
- 导出 xlsx 空分类显示"未分类"
- 启动加载慢 + 旧数据残留
- 单条 deleteTransaction 补云端删除

## 关键文件清单
- lib/constants.ts — TABS 数组配置
- lib/types.ts — 类型定义（GoalHistoryEntry 加 id / Goal / Transaction 等）
- lib/format.ts — yuan() 金额格式化（已去逗号）
- lib/supabase.ts — 云同步（withTimeout/withRetry/upsert onConflict）
- lib/storage.ts — pushToCloud/syncFromCloud（走锁+超时+重试）
- lib/sync-lock.ts — withRoomLock（每 roomId 一个 mutex）
- lib/sync-utils.ts — withTimeout/withRetry/isRetryableError
- lib/category-keywords.ts — 60 条关键词映射
- lib/csv-decode.ts — GBK/UTF-8 双解码
- lib/couple-bg.ts — normalizeCoupleBg
- hooks/useLedger.ts — 核心 hook（所有业务逻辑）
- components/TabBar.tsx — 底部导航栏（双图切换）
- components/tabs/HomeTab.tsx — 首页
- components/tabs/FlowTab.tsx — 流水
- components/tabs/ReviewTab.tsx — 复盘
- components/tabs/MineTab.tsx — 我的（含成员选择弹窗）
- components/modals/UpdateGoalSheet.tsx — 更新存钱进度（含历史编辑）
- components/modals/ImportPreviewSheet.tsx — 导入预览（含删除行）
- components/modals/RevertImportSheet.tsx — 撤销导入
- components/modals/MemberPage.tsx — 成员管理（最多 2 人）
- components/modals/CoupleBgAdjustSheet.tsx — 背景图平移
- components/styles/ledger.css — 全局样式
- app/page.tsx — 主页面（发薪日弹窗 + 恭喜弹窗挂载点）
- public/tabbar/ — 10 张像素风图标
- .env.local — NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

## Supabase 配置
- URL 和 anon key 在 .env.local
- 5 张表 RLS 已全部 DISABLE
- room_id=4230 是测试房间
- import_batches 表有 status 字段（active/reverted）

## 注意事项
- 主开发目录是 -pwav1-移植版，不是旧工作区
- 沙箱限制可能无法启动 dev server，需用户本地跑 npm run dev
- 不要删除 .workbuddy/ 目录（WorkBuddy 工作区记忆）
- next.config.mjs 已加 output: 'export' 用于静态导出（如恢复 Vercel 部署可删除此行）
```

## 第二步：生成 Vercel 部署指令

HANDOFF.md 写完后，在项目根目录创建 `Vercel部署指令.md` 文件，内容如下：

````markdown
# Vercel 部署指令

## 前置检查

### 1. 确认 next.config.mjs 配置

项目当前 `next.config.mjs` 已加 `output: 'export'` 用于静态导出。**Vercel 部署前需要删除这行**，因为 Vercel 原生支持 Next.js，不需要静态导出。

改为：
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

### 2. 确认环境变量

项目根目录 `.env.local` 有：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

这两个变量需要在 Vercel 后台手动配置（见下方步骤 3）。

### 3. 确认 build 能通过

在本地终端执行：
```bash
cd ~/Documents/记账app/-pwav1-移植版
npm run build
```

如果 build 失败，先修复错误再部署。

---

## 部署步骤

### 步骤 1：推送代码到 GitHub

如果项目还没有 GitHub 远程仓库：

```bash
cd ~/Documents/记账app/-pwav1-移植版

# 初始化 git（如果还没有）
git init

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送所有代码
git add -A
git commit -m "feat: 情侣记账 PWA 完整版（优化1-8）"
git branch -M main
git push -u origin main
```

如果已有远程仓库：
```bash
cd ~/Documents/记账app/-pwav1-移植版
git add -A
git commit -m "feat: 优化1-8 全部完成"
git push origin main
```

### 步骤 2：在 Vercel 导入项目

1. 打开 https://vercel.com 并登录
2. 点击「Add New...」→「Project」
3. 选择「Import Git Repository」
4. 找到并选择你的 GitHub 仓库
5. Framework Preset 会自动识别为「Next.js」

### 步骤 3：配置环境变量

在 Vercel 项目的「Settings」→「Environment Variables」中添加：

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | （从 .env.local 复制实际值） | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | （从 .env.local 复制实际值） | Production, Preview, Development |

> ⚠️ 注意：`.env.local` 不会随 git 推送（已在 .gitignore），必须在 Vercel 后台手动配置。

### 步骤 4：部署

1. 回到项目「Deployments」页面
2. 点击「Redeploy」或推送新代码触发自动部署
3. 等待 build 完成（约 1-2 分钟）
4. 部署成功后会拿到 `https://你的项目名.vercel.app` 地址

### 步骤 5：验证

部署完成后访问 Vercel 给的 URL，检查：
- [ ] 首页正常显示，像素风图标加载
- [ ] 输入房间号进入（或用已有 room_id=4230）
- [ ] 记账功能正常（记一笔后数据出现在流水）
- [ ] 云同步正常（Supabase 表有数据写入）
- [ ] 存钱目标创建+更新+恭喜弹窗
- [ ] 导入账单（先选成员 → 选文件 → 预览删除 → 确认导入）
- [ ] 发薪日弹窗（如果当天是某成员发薪日）
- [ ] 成员管理最多 2 人
- [ ] 流水/复盘界面无顶部汇总栏

---

## 常见问题

### Q: build 报错 "output: 'export' 与某些功能冲突"
A: 已在步骤 1 删除 `output: 'export'`，Vercel 不需要静态导出。

### Q: 部署后页面白屏
A: 检查 Vercel 的 build 日志，确认环境变量已配置。打开浏览器控制台看报错。

### Q: Supabase 连接失败
A: 确认环境变量值正确（从 .env.local 复制），确认 Supabase 项目处于活跃状态。

### Q: 图标不显示
A: 确认 `public/tabbar/` 目录下的 10 张 PNG 已推送到 GitHub。

### Q: 云同步 401/42501 错误
A: Supabase 5 张表 RLS 已全部 DISABLE，如果还报错检查 anon key 是否正确。
````

## 完成标志

1. `HANDOFF.md` 已覆盖写入完整进度总结
2. `Vercel部署指令.md` 已创建在项目根目录
3. 简述两个文件的写入结果
