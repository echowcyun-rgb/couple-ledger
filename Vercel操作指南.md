# Vercel 操作指南

## 项目地址
https://couple-ledger.vercel.app

---

## 一、改完代码如何上线

每次改完代码，终端运行这三行：

```bash
cd ~/Documents/记账app/-pwav1-移植版
git add .
git commit -m "这里写改了什么"
git push
```

Vercel 会自动检测到新提交，自动部署。等 1-2 分钟后刷新网页即可。

**如何写 commit 消息：**
让 AI（Cursor 或 Hermes）帮你总结，直接说：
> "帮我总结这次改了什么，生成一条 git commit 消息"

---

## 二、如何查看部署状态

1. 打开 https://vercel.com → 点项目 **couple-ledger**
2. 顶部导航栏点 **Deployments**
3. 查看最新记录的图标：
   - ✅ 绿色 = 部署成功
   - ⏳ 黄色 = 部署中
   - ❌ 红色 = 部署失败

---

## 三、部署失败怎么处理

1. 在 **Deployments** 里点那条红色记录
2. 查看 **Build Logs**（构建日志），里面有具体报错
3. 把报错复制给 AI 帮忙分析

**常见修复方法：**
- 点 **Redeploy** 按钮重新部署
- 检查 Vercel 的 Environment Variables 有没有配齐

---

## 四、环境变量设置（一次性操作）

如果需要新增或修改环境变量：

1. 打开项目 → **Settings** → **Environment Variables**
2. 点 **Add Environment Variable**
3. 填 Key / Value / Note
4. 点 **Save**
5. 回到 **Deployments** → 点 **Redeploy** 使其生效

**已有变量：**
| Key | Value |
|------|-------|
| NEXT_PUBLIC_SUPABASE_URL | https://shyoirivtyiepncwjygc.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 你的 anon key |

---

## 五、推代码前注意（重要）

如果你的终端出现这个报错：

```
error: RPC failed; curl 16 Error in the HTTP2 framing layer
```

先运行这行再 push：

```bash
git config http.version HTTP/1.1
```

---

## 六、本地启动

```bash
cd ~/Documents/记账app/-pwav1-移植版
npm run dev
```

浏览器打开 http://127.0.0.1:3006

或者直接双击项目里的 `start.command` 文件。
