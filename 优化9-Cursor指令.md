# 优化 9：头像性别分组 + 我的界面布局 + 新版账本创建界面（Cursor 执行指令）

> 对应用户问题：
> 1. 成员管理界面系统头像按性别显示，女显示女头像、男显示男头像、其他只显示上传
> 2.「我的」界面顶部左边头像下的名字再向左调整 20%
> 3. 账本创建界面整体按 `/Users/Zhuanz/Documents/记账app/zip` 重新构建

---

## 一、头像性别分组方案

已按视觉特征把现有 10 张系统头像分组：

| 性别 | 头像路径 |
|------|----------|
| **female** | `sys-av-1.png`（黑发蝴蝶结）、`sys-av-3.png`（双马尾橙发）、`sys-av-5.png`（紫发帽衫）、`sys-av-7.png`（丸子头白发）、`sys-av-9.png`（短发棕发绿衣） |
| **male** | `sys-av-2.png`（红发夹克）、`sys-av-4.png`（眼镜蓝衣）、`sys-av-6.png`（白发黑夹克）、`sys-av-8.png`（金发红衣）、`sys-av-10.png`（脏辫紫衣） |

如果用户对分组不满意，后续可调整；本次按上表执行。

---

## 二、需要修改的文件

### 1. `lib/constants.ts` — 拆分系统头像数组

当前：
```ts
export const SYS_AVATARS = Array.from({ length: 10 }, (_, i) => `/sys-av-${i + 1}.png`)
```

改为：
```ts
export const SYS_AVATARS_FEMALE = [
  "/sys-av-1.png",
  "/sys-av-3.png",
  "/sys-av-5.png",
  "/sys-av-7.png",
  "/sys-av-9.png",
]

export const SYS_AVATARS_MALE = [
  "/sys-av-2.png",
  "/sys-av-4.png",
  "/sys-av-6.png",
  "/sys-av-8.png",
  "/sys-av-10.png",
]

/** @deprecated 保留兼容，请按性别使用 SYS_AVATARS_FEMALE / SYS_AVATARS_MALE */
export const SYS_AVATARS = [...SYS_AVATARS_FEMALE, ...SYS_AVATARS_MALE]
```

---

### 2. `components/modals/MemberPage.tsx` — 按性别显示头像

当前 `me-av-section-label` 下直接渲染 `SYS_AVATARS.map`，改成按 `editGender` 选择数组：

```tsx
import { SYS_AVATARS_FEMALE, SYS_AVATARS_MALE } from "@/lib/constants"
// ...

const genderedAvatars = editGender === "female" ? SYS_AVATARS_FEMALE : editGender === "male" ? SYS_AVATARS_MALE : []
```

把头像网格部分改成：

```tsx
{editGender === "other" ? (
  <div className="me-av-empty">选择「其他」性别后，请上传自定义头像</div>
) : (
  <div className="me-av-grid">
    {genderedAvatars.map((src) => (
      <button
        key={src}
        className={`me-av-opt ${editAvatar === src ? "on" : ""}`}
        onClick={() => setEditAvatar(src)}
        aria-label={src}
        type="button"
      >
        <img src={src} alt="" />
      </button>
    ))}
    <button className="me-av-opt me-av-upload" onClick={() => avatarRef.current?.click()} aria-label="上传本地图片" type="button">
      <span className="me-av-upload-ico">+</span>
    </button>
  </div>
)}
```

同时在性别选择按钮上增加视觉提示：当选择 female/male 时自动显示对应头像；选择 other 时清空系统头像选择（如果当前选的是系统头像）。

建议增加：切换性别时，如果当前头像不在新的性别组里，则把 `editAvatar` 重置为空字符串，避免男选女头像。

```tsx
// 在 gender button 的 onClick 里
onClick={() => {
  const nextGender = g
  setEditGender(nextGender)
  const pool = nextGender === "female" ? SYS_AVATARS_FEMALE : nextGender === "male" ? SYS_AVATARS_MALE : []
  if (editAvatar && !pool.includes(editAvatar) && !editAvatar.startsWith("data:")) {
    setEditAvatar("")
  }
}}
```

---

### 3. `components/styles/ledger.css` — 头像样式调整

#### 3.1 系统头像做成「方圆形」+ 放大尺寸

当前 `.me-av-opt` 是 `border-radius: 12px` 的圆角，`.me-avatar` 是 72px 圆角 16px。

改为：

```css
/* 顶部大头像：方圆形 */
.app .me-avatar {
  width: 88px;
  height: 88px;
  border: 4px solid var(--ink);
  border-radius: 24px;
  display: block;
  margin: 0 auto;
  image-rendering: pixelated;
  background: var(--cream);
}

/* 系统头像选项：方圆形 + 放大 */
.app .me-av-opt {
  width: 100%;
  aspect-ratio: 1;
  border: 3px solid var(--ink);
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  background: var(--cream);
  padding: 0;
  transition: transform .1s;
  box-shadow: 2px 2px 0 var(--ink);
}

.app .me-av-opt img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
  display: block;
}

.app .me-av-opt.on {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent), 2px 2px 0 var(--ink);
  transform: scale(1.06);
}

.app .me-av-opt:active { transform: scale(.93); }
```

#### 3.2 空状态提示

```css
.app .me-av-empty {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 12px;
  color: var(--text-sub);
  text-align: center;
  padding: 20px 12px;
  border: 2px dashed var(--text-sub);
  border-radius: 12px;
  margin-bottom: 18px;
}
```

---

### 4. `components/styles/ledger.css` —「我的」界面名字往左再调 20%

当前：
```css
.app .couple-av-name { margin-left: -20%; }
```

改为：
```css
.app .couple-av-name { margin-left: -40%; }
```

注意：`-40%` 是相对于名字自身宽度的，因为 `margin-left: -20%` 已经存在，用户要求「再向左调整 20%」，所以直接翻倍到 `-40%`。如果视觉上还不够，可以继续减小。

---

### 5. 新版账本创建界面 — 整体迁移

从 `/Users/Zhuanz/Documents/记账app/zip` 迁移到主项目 `components/modals/RoomSetup.tsx`。

#### 设计目标

把新版像素风设计移植到主项目现有样式体系（不直接依赖 zip 的 globals.css / shadcn tokens，而是复用主项目的 `ledger.css` 变量和 Tailwind 类）：

- 顶部标题「俩人账本」+ 副标题
- 中间双人角色展示：左女（girl.jpg）+ 像素爱心 + 右男（boy.jpg）
- 两个大按钮：「创建账本」（绿色）+「加入账本」（琥珀色）
- 点击后弹窗（新版 create-modal / join-modal 的样式）
- 保留原有业务逻辑：createRoom → 显示房号 → 进入账本；validateRoom → 进入账本

#### 5.1 准备素材文件

把 zip 目录下的头像图片复制到主项目 `public/`：

```bash
cp "/Users/Zhuanz/Documents/记账app/zip/public/avatars/girl.jpg" "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/avatars/girl.jpg"
cp "/Users/Zhuanz/Documents/记账app/zip/public/avatars/boy.jpg" "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/avatars/boy.jpg"
```

> 如果主项目 `public/avatars/` 不存在，先创建。

#### 5.2 重写 `components/modals/RoomSetup.tsx`

保留原组件的 props 和 3 个 mode（choose / create / join），但 UI 完全替换。

核心结构：

```tsx
"use client"

import { useState } from "react"
import { createRoom, validateRoom, isCloudReady } from "@/lib/supabase"

interface Props {
  onDone: (roomId: string) => void
}

export default function RoomSetup({ onDone }: Props) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [createdRoom, setCreatedRoom] = useState("")

  // 保留原有 handleCreate / handleJoin / handleStartUsing 逻辑
  // ...（原逻辑不变）

  if (!mode || mode === "choose") {
    return (
      <main className="room-setup">
        <header className="room-setup-header">
          <h1 className="room-setup-title">俩人账本</h1>
          <p className="room-setup-subtitle">创建或加入账本，和TA一起记账</p>
        </header>

        <div className="room-setup-couple">
          <div className="room-setup-av">
            <div className="room-setup-av-box">
              <img src="/avatars/girl.jpg" alt="女生角色" />
            </div>
            <span className="room-setup-av-label">我</span>
          </div>
          <PixelHeart />
          <div className="room-setup-av">
            <div className="room-setup-av-box">
              <img src="/avatars/boy.jpg" alt="男生角色" />
            </div>
            <span className="room-setup-av-label">Ta</span>
          </div>
        </div>

        <div className="room-setup-actions">
          <button className="room-setup-btn green" onClick={handleCreate} disabled={loading}>
            <span className="room-setup-ico"><PixelPlus /></span>
            <span className="room-setup-btn-text">
              <strong>创建账本</strong>
              <small>新建共享账本，获取邀请码</small>
            </span>
            <PixelArrow />
          </button>

          <button className="room-setup-btn amber" onClick={() => setMode("join")} disabled={loading}>
            <span className="room-setup-ico"><PixelKey /></span>
            <span className="room-setup-btn-text">
              <strong>加入账本</strong>
              <small>输入邀请码，加入伴侣账本</small>
            </span>
            <PixelArrow />
          </button>
        </div>

        <p className="room-setup-footer">START YOUR JOURNEY</p>
      </main>
    )
  }

  if (mode === "create") {
    return createdRoom ? (
      <div className="room-setup-modal">
        <div className="room-setup-modal-panel">
          <div className="room-setup-modal-head green">
            <span>创建成功！</span>
            <button onClick={() => setMode("choose")}>×</button>
          </div>
          <div className="room-setup-modal-body">
            <p className="room-setup-modal-hint">将邀请码发给你的伴侣</p>
            <div className="room-setup-code">
              <small>邀请码</small>
              <strong>{createdRoom}</strong>
            </div>
            <button className="px-btn solid" onClick={handleStartUsing}>进入账本</button>
          </div>
        </div>
      </div>
    ) : (
      // 创建中 loading
      <div className="room-setup-loading">正在创建...</div>
    )
  }

  if (mode === "join") {
    return (
      <div className="room-setup-modal">
        <div className="room-setup-modal-mask" onClick={() => setMode("choose")} />
        <div className="room-setup-modal-panel">
          <div className="room-setup-modal-head amber">
            <span>加入账本</span>
            <button onClick={() => setMode("choose")}>×</button>
          </div>
          <div className="room-setup-modal-body">
            <p className="room-setup-modal-hint">输入伴侣分享的邀请码，加入共享账本</p>
            <label className="me-label">邀请码</label>
            <input
              className="me-input room-setup-code-input"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="LVE-XXXX"
              maxLength={8}
            />
            {error && <p className="room-setup-error">{error}</p>}
            <button className="px-btn solid" onClick={handleJoin} disabled={joinCode.trim().length < 4}>
              加入共享账本
            </button>
            <button className="px-btn ghost" onClick={() => setMode("choose")}>取消</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function PixelHeart() { /* svg */ }
function PixelPlus() { /* svg */ }
function PixelKey() { /* svg */ }
function PixelArrow() { /* svg */ }
```

> 实际代码中，`handleCreate` 成功后原本会把 `createdRoom` 写入并切到 `mode="create"`，这里需要修改逻辑：点「创建账本」后进入 loading 状态，成功后显示邀请码弹窗。原有 `handleCreate` 已经会 `setCreatedRoom` 和 `setMode("create")`，所以直接复用。

> 房号显示格式：zip 里写死是 `LVE-2847`，但主项目是 4 位数字 roomId，建议保持数字房号，或包装成 `LVE-${createdRoom}` 都可以。用户没特别要求，保持数字房号即可。

#### 5.3 在 `components/styles/ledger.css` 末尾新增 RoomSetup 样式

```css
/* ===== RoomSetup 新版入口 ===== */
.app .room-setup {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 32px;
  background: var(--bg);
  color: var(--ink);
}

.app .room-setup-header { text-align: center; }
.app .room-setup-title {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 8px;
  letter-spacing: 0.08em;
}
.app .room-setup-subtitle {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 12px;
  color: var(--text-sub);
  margin: 0;
}

.app .room-setup-couple {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16px;
}
.app .room-setup-av { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.app .room-setup-av-box {
  width: 96px;
  height: 96px;
  border: 3px solid var(--ink);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  background: var(--card);
  box-shadow: 4px 4px 0 var(--ink);
}
.app .room-setup-av-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
  display: block;
}
.app .room-setup-av-label {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
}
.app .room-setup-heart {
  margin-bottom: 36px;
  image-rendering: pixelated;
}

.app .room-setup-actions {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.app .room-setup-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 3px solid var(--ink);
  border-radius: 12px;
  background: var(--card);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  position: relative;
  box-shadow: 4px 4px 0 var(--ink);
  transition: transform .08s steps(2), box-shadow .08s steps(2);
}
.app .room-setup-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--ink);
}
.app .room-setup-btn.green { background: #6BBF8A; }
.app .room-setup-btn.amber { background: #F0A03C; }
.app .room-setup-btn:disabled { opacity: .5; cursor: not-allowed; }
.app .room-setup-ico {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--ink);
  border-radius: 8px;
  background: rgba(255,255,255,.25);
}
.app .room-setup-ico svg { width: 20px; height: 20px; }
.app .room-setup-btn-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.app .room-setup-btn-text strong {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 13px;
  font-weight: 700;
}
.app .room-setup-btn-text small {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 10px;
  color: var(--text-sub);
}

.app .room-setup-footer {
  font-family: var(--font-pixel), monospace;
  font-size: 8px;
  color: var(--text-sub);
  letter-spacing: 0.12em;
  margin: 0;
}

.app .room-setup-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 14px;
  color: var(--text-sub);
}

.app .room-setup-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.app .room-setup-modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.45);
}
.app .room-setup-modal-panel {
  position: relative;
  width: 100%;
  max-width: 320px;
  border: 3px solid var(--ink);
  border-radius: 16px;
  background: var(--card);
  box-shadow: 4px 4px 0 var(--ink);
  overflow: hidden;
}
.app .room-setup-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 3px solid var(--ink);
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.app .room-setup-modal-head.green { background: #6BBF8A; }
.app .room-setup-modal-head.amber { background: #F0A03C; }
.app .room-setup-modal-head button {
  width: 24px;
  height: 24px;
  border: 2px solid var(--ink);
  background: rgba(255,255,255,.25);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.app .room-setup-modal-body {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.app .room-setup-modal-hint {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 11px;
  color: var(--text-sub);
  text-align: center;
  margin: 0;
}
.app .room-setup-code {
  border: 3px solid var(--ink);
  border-radius: 12px;
  background: var(--cream);
  padding: 16px;
  text-align: center;
  position: relative;
  box-shadow: 3px 3px 0 var(--ink);
}
.app .room-setup-code small {
  display: block;
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 10px;
  color: var(--text-sub);
  margin-bottom: 6px;
}
.app .room-setup-code strong {
  font-family: var(--font-pixel), monospace;
  font-size: 22px;
  letter-spacing: 0.1em;
  color: var(--ink);
}
.app .room-setup-code-input { text-align: center; letter-spacing: 0.2em; font-size: 16px; }
.app .room-setup-error {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 11px;
  color: var(--out);
  text-align: center;
  margin: 0;
}
```

#### 5.4 在 `app/page.tsx` 中确保 RoomSetup 层级正确

当前 `RoomSetup` 是条件渲染，确认它的容器在 `ledger` 外层或内层不影响。新版 `RoomSetup` 自己已经是全屏弹窗/页面，所以保持现有调用即可：

```tsx
{showSetup && <RoomSetup onDone={(roomId) => { setShowSetup(false); ledger.setRoomId(roomId) }} />}
```

> 注意：原 `page.tsx` 里 `onDone` 可能只 `setShowSetup(false)`，如果 `ledger` 在 `RoomSetup` 里通过 `localStorage` 已经保存了 roomId，主页面只需隐藏弹窗即可。具体以现有代码为准。

#### 5.5 删除旧 RoomSetup 的冗余样式（可选）

如果 `ledger.css` 中还有 `.room-setup-choose` 等旧样式，可删除或保留。删除前确认没有引用。

---

## 三、注意事项

1. **头像分组**：按现有 10 张图的视觉特征分的。如果用户对分组不满意，后续需要调整 `lib/constants.ts` 中的 `SYS_AVATARS_FEMALE` / `SYS_AVATARS_MALE` 数组即可。
2. **其他性别**：选择「其他」时隐藏系统头像，只显示上传按钮。需要用户自己上传头像。
3. **切换性别自动清空头像**：如果当前头像是系统头像但不在新性别组里，切换性别时自动清空，避免 mismatch。
4. **账本创建 UI 迁移**：新版设计用了独立配色（绿/琥珀），与主项目原有变量不完全一致。这里用的是近似色值（绿 `#6BBF8A`、琥珀 `#F0A03C`），如果觉得不搭可以改成 `var(--accent)` 或项目里已有颜色。
5. ** girl.jpg / boy.jpg**：如果图片不存在或路径不对，请确认从 zip 复制成功。

---

## 四、验收标准

1. 进入成员管理 → 编辑成员 → 选择「女」只显示 5 张女头像，选择「男」只显示 5 张男头像，选择「其他」只显示上传按钮
2. 切换性别时，若当前系统头像不在新性别组里，自动清空头像
3. 系统头像选项为「方圆形」（border-radius 18px）、尺寸比当前稍大
4. 顶部大头像改为 88×88px、方圆形 24px 圆角
5.「我的」界面顶部左边头像下的名字比当前再向左移动 20%（即 `margin-left: -40%`）
6. 账本创建入口改为新版设计：标题 + 双人角色 + 两个大按钮 + 创建/加入弹窗
7. 新版弹窗保留原有业务逻辑：创建生成房号、加入验证房号、成功后进入主账本
8. `npm run build` 通过
9. `npm run lint` 通过（如无 ESLint 报错）
10. 头像图片能正常加载，控制台无 404

---

## 五、执行前准备

先复制新版素材：

```bash
mkdir -p "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/avatars"
cp "/Users/Zhuanz/Documents/记账app/zip/public/avatars/girl.jpg" "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/avatars/girl.jpg"
cp "/Users/Zhuanz/Documents/记账app/zip/public/avatars/boy.jpg" "/Users/Zhuanz/Documents/记账app/-pwav1-移植版/public/avatars/boy.jpg"
```

然后再开始修改代码。

---

## 六、检查清单

- [ ] 复制 girl.jpg / boy.jpg 到主项目 public/avatars/
- [ ] `lib/constants.ts` 拆分 SYS_AVATARS_FEMALE / SYS_AVATARS_MALE
- [ ] `MemberPage.tsx` 按性别渲染头像 + 切换性别清空头像
- [ ] `ledger.css` 调整头像为方圆形、放大尺寸
- [ ] `ledger.css` 调整 couple-av-name 为 margin-left: -40%
- [ ] `RoomSetup.tsx` 重写为新版像素风入口 + 弹窗
- [ ] `ledger.css` 新增 RoomSetup 样式
- [ ] `npm run build` 通过
- [ ] 手动测试创建/加入房号流程
- [ ] commit
