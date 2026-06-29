# Vercel 部署指令

## 前置检查

### 1. 确认 next.config.mjs 配置

项目 `next.config.mjs` **不应**包含 `output: 'export'`。Vercel 原生支持 Next.js，不需要静态导出。

当前应为：

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
- [ ] 存钱目标创建+更新+恭喜弹窗（居中显示）
- [ ] 导入账单（先选成员 → 选文件 → 预览删除 → 确认导入）
- [ ] 发薪日弹窗（如果当天是某成员发薪日，居中显示）
- [ ] 成员管理最多 2 人（刷新后不会变成 4 人）
- [ ] 流水/复盘界面无顶部汇总栏

---

## 常见问题

### Q: build 报错 "output: 'export' 与某些功能冲突"
A: 删除 `next.config.mjs` 中的 `output: 'export'`，Vercel 不需要静态导出。

### Q: 部署后页面白屏
A: 检查 Vercel 的 build 日志，确认环境变量已配置。打开浏览器控制台看报错。

### Q: Supabase 连接失败
A: 确认环境变量值正确（从 .env.local 复制），确认 Supabase 项目处于活跃状态。

### Q: 图标不显示
A: 确认 `public/tabbar/` 目录下的 10 张 PNG 已推送到 GitHub。

### Q: 云同步 401/42501 错误
A: Supabase 5 张表 RLS 已全部 DISABLE，如果还报错检查 anon key 是否正确。

### Q: 发薪日弹窗今天不弹出
A: 在浏览器控制台执行 `sessionStorage.removeItem('payday-alerted-' + new Date().toDateString())` 后刷新；并确认成员发薪日等于今天的日期。
