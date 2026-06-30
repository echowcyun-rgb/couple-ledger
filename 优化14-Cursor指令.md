# 优化14：流水日期滚动选择 + 复盘提示配色 + 强制跳转创建账本

## 问题1：流水日期滚动选择改造为「选中行固定 + 滑动跳转」

### 当前问题
`FlowDateSheet.tsx` 当前是普通滚动列表 + 点击高亮选中，用户需要手动点击每一年/每一月。期望改为**滚轮选择器**：选中行固定在中间高亮栏，用户上下滑动列表，数字自动跳到选中栏（类似 iOS 原生 date picker）。

### 改动1：`components/modals/FlowDateSheet.tsx` — 重写为滚轮选择器

整个文件替换为：

```tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface Props {
  open: boolean
  initialYear: number
  initialMonth: number
  onClose: () => void
  onMonthSelect: (year: number, month: number) => void
  onRangeSelect: (startDate: string, endDate: string) => void
}

const ITEM_HEIGHT = 40
const VISIBLE_COUNT = 5

function WheelPicker({
  values,
  value,
  onChange,
  itemHeight = ITEM_HEIGHT,
  visibleCount = VISIBLE_COUNT,
}: {
  values: number[]
  value: number
  onChange: (v: number) => void
  itemHeight?: number
  visibleCount?: number
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const isScrolling = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerHeight = itemHeight * visibleCount
  const centerOffset = (containerHeight - itemHeight) / 2

  // 滚动到指定值
  const scrollToValue = useCallback((v: number, smooth = true) => {
    const list = listRef.current
    if (!list) return
    const idx = values.indexOf(v)
    if (idx < 0) return
    const top = idx * itemHeight
    list.scrollTo({ top, behavior: smooth ? "smooth" : "auto" })
  }, [values, itemHeight])

  // 初始滚动（无动画）
  useEffect(() => {
    scrollToValue(value, false)
  }, [scrollToValue, value])

  // 滚动结束后计算选中项
  const handleScroll = useCallback(() => {
    const list = listRef.current
    if (!list) return
    isScrolling.current = true
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const scrollTop = list.scrollTop
      const idx = Math.round(scrollTop / itemHeight)
      const clamped = Math.max(0, Math.min(values.length - 1, idx))
      const newValue = values[clamped]
      if (newValue !== value) {
        onChange(newValue)
      }
      // 吸附到最近项
      list.scrollTo({ top: clamped * itemHeight, behavior: "smooth" })
      isScrolling.current = false
    }, 120)
  }, [values, value, onChange, itemHeight])

  // 上下箭头按钮（备选交互）
  const step = (delta: number) => {
    const idx = values.indexOf(value)
    const next = Math.max(0, Math.min(values.length - 1, idx + delta))
    onChange(values[next])
    scrollToValue(values[next], true)
  }

  return (
    <div className="wheel-picker" style={{ height: containerHeight }}>
      {/* 上箭头 */}
      <button className="wheel-arrow wheel-arrow-up" type="button" onClick={() => step(-1)} aria-label="上一个">▲</button>
      {/* 中间高亮栏 */}
      <div className="wheel-highlight" style={{ top: centerOffset, height: itemHeight }} />
      {/* 滚动列表 */}
      <div
        className="wheel-list"
        ref={listRef}
        onScroll={handleScroll}
        style={{
          height: containerHeight,
          paddingTop: centerOffset,
          paddingBottom: centerOffset,
        }}
      >
        {values.map(v => (
          <div
            key={v}
            className={`wheel-item ${v === value ? "on" : ""}`}
            style={{ height: itemHeight, lineHeight: `${itemHeight}px` }}
            onClick={() => {
              onChange(v)
              scrollToValue(v, true)
            }}
          >
            {v}
          </div>
        ))}
      </div>
      {/* 下箭头 */}
      <button className="wheel-arrow wheel-arrow-down" type="button" onClick={() => step(1)} aria-label="下一个">▼</button>
    </div>
  )
}

export function FlowDateSheet({
  open,
  initialYear,
  initialMonth,
  onClose,
  onMonthSelect,
  onRangeSelect,
}: Props) {
  const [tab, setTab] = useState<"month" | "range">("month")
  const [selYear, setSelYear] = useState(initialYear)
  const [selMonth, setSelMonth] = useState(initialMonth)
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")

  useEffect(() => {
    if (open) {
      setSelYear(initialYear)
      setSelMonth(initialMonth)
      setTab("month")
    }
  }, [open, initialYear, initialMonth])

  if (!open) return null

  const years = Array.from({ length: 12 }, (_, i) => initialYear - 6 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="modal-overlay flow-date-overlay" onClick={onClose}>
      <div className="member-modal-panel flow-date-panel" onClick={(e) => e.stopPropagation()}>
        <div className="member-modal-header">
          <span className="member-modal-title">选择时间</span>
          <button className="member-modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="flow-date-tabs">
          <button className={`flow-date-tab ${tab === "month" ? "on" : ""}`} onClick={() => setTab("month")} type="button">可选月份</button>
          <button className={`flow-date-tab ${tab === "range" ? "on" : ""}`} onClick={() => setTab("range")} type="button">自定义时间</button>
        </div>

        {tab === "month" && (
          <div className="flow-date-month-picker">
            <div className="flow-date-scroll-col">
              <div className="flow-date-scroll-label">年份</div>
              <WheelPicker values={years} value={selYear} onChange={setSelYear} />
            </div>
            <div className="flow-date-scroll-col">
              <div className="flow-date-scroll-label">月份</div>
              <WheelPicker values={months} value={selMonth} onChange={setSelMonth} />
            </div>
            <button className="px-btn flow-date-confirm" onClick={() => { onMonthSelect(selYear, selMonth); onClose() }} type="button">
              查看 {selYear}年{selMonth}月
            </button>
          </div>
        )}

        {tab === "range" && (
          <div className="flow-date-range-picker">
            <div className="flow-date-range-row">
              <span className="flow-date-range-label">开始日期</span>
              <input className="flow-date-range-input" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </div>
            <div className="flow-date-range-row">
              <span className="flow-date-range-label">结束日期</span>
              <input className="flow-date-range-input" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
            {rangeStart && rangeEnd && rangeStart > rangeEnd && (
              <div className="flow-date-range-error">开始日期不能晚于结束日期</div>
            )}
            <button
              className="px-btn flow-date-confirm"
              disabled={!rangeStart || !rangeEnd || rangeStart > rangeEnd}
              onClick={() => { onRangeSelect(rangeStart, rangeEnd); onClose() }}
              type="button"
            >
              查看 {rangeStart} ~ {rangeEnd}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 改动2：`components/styles/ledger.css` — 替换滚动列表样式为滚轮样式

找到第 159-161 行的 `.flow-date-scroll-list` 和 `.flow-date-scroll-item`（以及 `.flow-date-scroll-item.on`），**全部删除**，替换为：

```css
/* 滚轮选择器 */
.app .wheel-picker { position: relative; width: 100%; }
.app .wheel-highlight { position: absolute; left: 4px; right: 4px; background: rgba(169, 155, 214, 0.18); border: 2px solid #A99BD6; border-radius: 10px; pointer-events: none; z-index: 1; }
.app .wheel-list { overflow-y: auto; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.app .wheel-list::-webkit-scrollbar { display: none; }
.app .wheel-item { text-align: center; font-family: var(--font-pixel-cjk), monospace; font-size: 16px; color: var(--ink); cursor: pointer; transition: color .15s, opacity .15s; opacity: 0.35; }
.app .wheel-item.on { color: #6B4FB8; opacity: 1; font-weight: 700; }
.app .wheel-arrow { position: absolute; left: 50%; transform: translateX(-50%); z-index: 2; width: 28px; height: 18px; border: 2px solid var(--ink); border-radius: 6px; background: var(--card); color: var(--ink); font-size: 8px; cursor: pointer; box-shadow: 1px 1px 0 var(--ink); display: flex; align-items: center; justify-content: center; }
.app .wheel-arrow-up { top: 0; }
.app .wheel-arrow-down { bottom: 0; }
.app .wheel-arrow:active { transform: translateX(-50%) translate(1px, 1px); box-shadow: none; }
```

---

## 问题2：复盘大额消费提醒配色调整

### 当前问题
`.big-spend-alert` 背景色是 `#FFD600`（亮黄色），文字是 `#FFFFFF`（白色），太刺眼。

### 改动3：`components/styles/ledger.css` — 调整大额提醒配色

找到第 247-252 行：

```css
.app .big-spend-alert { background: #FFD600; border: 3px solid var(--ink); border-radius: 14px; padding: 14px; margin-top: 12px; box-shadow: 4px 4px 0 var(--ink); }
.app .big-spend-alert-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-pixel-cjk), monospace; font-size: 13px; font-weight: 700; color: #FFFFFF; text-shadow: 1px 1px 0 var(--ink); margin-bottom: 10px; }
.app .warn-ico { background: #D32F2F !important; }
.app .big-spend-list { display: flex; flex-direction: column; gap: 6px; }
.app .big-spend-row { display: flex; align-items: center; gap: 8px; font-family: var(--font-pixel-cjk), monospace; font-size: 11px; font-weight: 700; color: #FFFFFF; text-shadow: 1px 1px 0 rgba(0,0,0,.4); }
.app .big-spend-amt { font-family: var(--font-pixel), monospace; color: #FFFFFF; }
```

替换为（背景色降低亮度，文字改棕红色 #5D2A1A）：

```css
.app .big-spend-alert { background: #E8C547; border: 3px solid var(--ink); border-radius: 14px; padding: 14px; margin-top: 12px; box-shadow: 4px 4px 0 var(--ink); }
.app .big-spend-alert-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-pixel-cjk), monospace; font-size: 13px; font-weight: 700; color: #5D2A1A; text-shadow: 1px 1px 0 rgba(255,255,255,.3); margin-bottom: 10px; }
.app .warn-ico { background: #D32F2F !important; }
.app .big-spend-list { display: flex; flex-direction: column; gap: 6px; }
.app .big-spend-row { display: flex; align-items: center; gap: 8px; font-family: var(--font-pixel-cjk), monospace; font-size: 11px; font-weight: 700; color: #5D2A1A; text-shadow: 1px 1px 0 rgba(255,255,255,.25); }
.app .big-spend-amt { font-family: var(--font-pixel), monospace; color: #5D2A1A; }
```

关键改动：
- 背景：`#FFD600`（亮黄）→ `#E8C547`（降亮度的暖黄）
- 标题文字：`#FFFFFF`（白）→ `#5D2A1A`（棕红）
- 列表文字：`#FFFFFF`（白）→ `#5D2A1A`（棕红）
- 金额文字：`#FFFFFF`（白）→ `#5D2A1A`（棕红）
- text-shadow 从黑色阴影改为白色半透明阴影（让棕红色在黄底上更柔和）

---

## 问题3：每次打开链接都跳转到创建账本界面

### 当前逻辑
`app/page.tsx` 第 38-45 行：只在 `localStorage` 没有 `couple-room-id` 时才显示 `RoomSetup`。用户已创建过房间后，再次打开链接会直接进入主界面。

### 改动4：`app/page.tsx` — 改为始终先显示 RoomSetup

找到第 38-45 行：

```tsx
useEffect(() => {
  if (ledger.hydrated) {
    const savedRoom = localStorage.getItem("couple-room-id")
    if (!savedRoom) {
      setShowSetup(true)
    }
  }
}, [ledger.hydrated])
```

改为（始终显示，但同时保留已存的房间号供 RoomSetup 使用）：

```tsx
useEffect(() => {
  if (ledger.hydrated) {
    setShowSetup(true)
  }
}, [ledger.hydrated])
```

### 改动5：`components/modals/RoomSetup.tsx` — 支持已有房间号时默认填充

读取 `RoomSetup.tsx`，在创建账本和加入账本两个入口之外，**新增一个「进入已有账本」入口**，自动读取 localStorage 中的 `couple-room-id` 并填充。

在 RoomSetup 组件中：

```tsx
// 顶部新增 state
const [existingRoom, setExistingRoom] = useState<string>("")

// useEffect 读取已存房间号
useEffect(() => {
  const saved = localStorage.getItem("couple-room-id")
  if (saved) setExistingRoom(saved)
}, [])

// 在主面板内，render 一个「进入已有账本」卡片（仅当 existingRoom 非空时显示）
{existingRoom && (
  <button
    type="button"
    className="room-setup-existing"
    onClick={() => onDone(existingRoom)}
  >
    <div className="room-setup-existing-title">进入账本 #{existingRoom}</div>
    <div className="room-setup-existing-hint">点击继续使用上次账本</div>
  </button>
)}
```

### 改动6：`components/styles/ledger.css` — 新增「进入已有账本」卡片样式

在 RoomSetup 相关样式区域新增：

```css
.app .room-setup-existing { display: block; width: 100%; padding: 16px; margin-bottom: 16px; background: var(--card); border: 3px solid var(--ink); border-radius: 14px; box-shadow: 4px 4px 0 var(--ink); cursor: pointer; transition: transform .08s steps(2); text-align: left; }
.app .room-setup-existing:active { transform: translate(2px, 2px); box-shadow: none; }
.app .room-setup-existing-title { font-family: var(--font-pixel-cjk), monospace; font-size: 14px; font-weight: 700; color: var(--ink); margin-bottom: 4px; }
.app .room-setup-existing-hint { font-family: var(--font-pixel-cjk), monospace; font-size: 10px; color: var(--text-sub); }
```

---

## 验收标准

1. 流水日期选择弹窗的年月选择器改为滚轮样式，中间有紫色高亮栏
2. 上下滑动列表，数字自动吸附到中间高亮栏并更新选中值
3. 点击列表项也能直接选中并滚动到该项
4. 上下箭头按钮可微调
5. 复盘界面大额消费提醒背景色为降亮度的暖黄（#E8C547），文字为棕红色（#5D2A1A）
6. 每次打开 App 链接都先进入 RoomSetup 界面
7. RoomSetup 界面顶部显示「进入账本 #xxxx」卡片（仅当 localStorage 有已存房间号时）
8. 点「进入账本」直接进入主界面，点「创建新账本」或「加入账本」走原流程
9. `npm run build` 通过

---

## ⚠️ 注意事项

1. **滚轮选择器滚动惯性**：`scroll-behavior: smooth` + `-webkit-overflow-scrolling: touch` 保证移动端流畅
2. **滚动节流**：handleScroll 用 120ms 延时判断滚动停止，避免频繁更新 state
3. **强制跳转 RoomSetup**：用户每次打开都会看到，点「进入已有账本」一键回到主界面，不影响体验
4. **已有房间号读取**：RoomSetup 的 useEffect 在挂载时读取 localStorage，避免 SSR 问题
