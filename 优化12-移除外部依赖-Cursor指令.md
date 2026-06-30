# 优化12：移除外部依赖让 App 不开代理也能访问

## 根因分析

当前 App 必须开代理才能访问，有 **3 个外部依赖**：

| 依赖 | 位置 | 问题 |
|------|------|------|
| **next/font/google** | `app/layout.tsx` 第 4 行 | 运行时从 `fonts.googleapis.com` / `fonts.gstatic.com` 下载字体，国内被墙 |
| **@vercel/analytics** | `app/layout.tsx` 第 1、70 行 + `package.json` 第 17 行 | 向 Vercal 服务器发送分析数据，国内访问慢/失败 |
| Supabase 云同步 | `lib/supabase.ts` + `.env.local` | Supabase 服务器在海外，但**这是核心功能不能删** |

**解决方案：** 把 Google Fonts 改为本地字体文件，移除 Vercel Analytics。Supabase 保留（它的服务器虽然海外但可以直连，不需要代理）。

---

## 改动1：下载 4 种字体文件到本地

在终端执行以下命令，下载 4 种字体的 woff2 文件到 `public/fonts/` 目录：

```bash
mkdir -p "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/fonts"

# Geist Sans（正文字体）
curl -L -o "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/fonts/Geist-Variable.woff2" \
  "https://github.com/vercel/geist-font/raw/main/packages/next/dist/fonts/geist-sans/Geist-Variable.woff2"

# Geist Mono（等宽字体）
curl -L -o "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/fonts/GeistMono-Variable.woff2" \
  "https://github.com/vercel/geist-font/raw/main/packages/next/dist/fonts/geist-mono/GeistMono-Variable.woff2"

# Press Start 2P（像素字体）
curl -L -o "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/fonts/PressStart2P-Regular.woff2" \
  "https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf"

# DotGothic16（像素CJK字体）
curl -L -o "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/fonts/DotGothic16-Regular.woff2" \
  "https://github.com/google/fonts/raw/main/ofl/dotgothic16/DotGothic16-Regular.ttf"
```

**⚠️ 注意**：如果 curl 下载失败（GitHub 也可能需要代理），可以：
1. 开代理下载这 4 个文件
2. 或者用浏览器手动下载，放到 `public/fonts/` 目录
3. Press Start 2P 和 DotGothic16 下载的是 .ttf 格式，也可以用（next/font/local 支持 ttf）

下载完成后验证文件存在：
```bash
ls -la "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/fonts/"
```

---

## 改动2：修改 `app/layout.tsx`

### 删除 Google Fonts 导入，改为本地字体

找到第 1-21 行：

```tsx
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Press_Start_2P, DotGothic16 } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const pressStart = Press_Start_2P({
  variable: '--font-pixel',
  subsets: ['latin'],
  weight: '400',
})
const dotGothic = DotGothic16({
  variable: '--font-pixel-cjk',
  subsets: ['latin'],
  weight: '400',
})
```

替换为：

```tsx
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({
  src: '../public/fonts/Geist-Variable.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = localFont({
  src: '../public/fonts/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
})

const pressStart = localFont({
  src: '../public/fonts/PressStart2P-Regular.woff2',
  variable: '--font-pixel',
  display: 'swap',
})

const dotGothic = localFont({
  src: '../public/fonts/DotGothic16-Regular.woff2',
  variable: '--font-pixel-cjk',
  display: 'swap',
})
```

### 删除 Vercel Analytics

找到第 70 行（在 `<body>` 标签内）：

```tsx
{process.env.NODE_ENV === 'production' && <Analytics />}
```

**删除这一整行。**

---

## 改动3：修改 `package.json`

找到第 17 行：

```json
"@vercel/analytics": "1.6.1",
```

**删除这一行**（包括末尾逗号）。

然后在终端执行：

```bash
cd "/Users/Zhuanz/Documents/记账app/-pwav1-移植版"
npm install
```

重新安装依赖，移除 @vercel/analytics。

---

## 改动4：清理 Analytics 相关代码

全局搜索 `@vercel/analytics` 或 `Analytics`，确认没有其他地方引用。如果找到，一并删除。

常见位置：
- `app/layout.tsx`（已在改动2中处理）
- 其他页面组件（一般不会有）

```bash
cd "/Users/Zhuanz/Documents/记账app/-pwav1-移植版"
grep -r "@vercel/analytics" --include="*.tsx" --include="*.ts" . | grep -v node_modules
```

---

## 验证步骤

### 1. 关闭代理

完全关闭代理软件（Clash/Surge/V2Ray 等），确保网络是直连状态。

### 2. 清除 Next.js 缓存

```bash
cd "/Users/Zhuanz/Documents/记账app/-pwav1-移植版"
rm -rf .next
```

### 3. 启动 dev server

```bash
npm run dev
```

### 4. 浏览器访问

打开 `http://127.0.0.1:3006`，确认：
- ✅ 页面正常加载，不卡白屏
- ✅ 像素字体正常显示（Press Start 2P / DotGothic16）
- ✅ 正文字体正常显示（Geist Sans）
- ✅ 数字字体正常显示（Geist Mono）
- ✅ 浏览器控制台无 `fonts.googleapis.com` 相关报错
- ✅ 浏览器控制台无 `vercel.com` 相关报错

### 5. Build 测试

```bash
npm run build
```

确认 build 通过，没有 Google Fonts 下载失败错误。

---

## 验收标准

1. `app/layout.tsx` 不再 import `next/font/google`，改为 `next/font/local`
2. `public/fonts/` 目录下有 4 个字体文件
3. `app/layout.tsx` 不再 import `@vercel/analytics/next`
4. `package.json` 不再有 `@vercel/analytics` 依赖
5. **关闭代理后** App 能正常访问，字体正常显示
6. `npm run build` 通过
7. Supabase 云同步功能仍然正常（这个需要代理才能访问海外服务器，但 App 本身不需要代理就能打开）

---

## ⚠️ 关于 Supabase 的说明

Supabase 服务器在海外，**云同步功能在网络不稳定时可能失败**，但：
- Supabase 的域名（`*.supabase.co`）在国内**可以直连**，不需要代理
- 只是速度可能比国内服务器稍慢
- 如果 Supabase 也连不上，那是网络问题不是代码问题

App 的本地功能（记账、查看流水、复盘等）在 Supabase 连不上时仍然可用，数据存在 localStorage，等网络恢复后会自动同步。
