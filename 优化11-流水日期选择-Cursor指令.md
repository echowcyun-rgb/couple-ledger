# 优化11：流水界面日期选择重构

## 背景

当前流水界面顶部日期选择模块包含：
1. **按月/按日切换按钮**（flow-view-toggle）
2. **月份/日期左右箭头切换**（◀ ▶ ms-btn）
3. **原生 `<input type="month">` / `<input type="date">`**（flow-date-input）

用户要求：
- **删除**现有的月份/日期左右箭头切换和原生 input 日期选择
- **删除**按月/按日切换按钮
- 在"全选本月"边上新增一个 **"年份-日期"格式的下拉菜单**
- 下拉菜单点进去后出现**弹窗**，含两个选项卡：
  1. **可选月份**：年份-月份滚动选择
  2. **自定义时间**：让用户选择"年/月/日"-"年/月/日"区间

## 涉及的文件

### 当前需要删除的模块（FlowTab.tsx 第 187-253 行）

```tsx
<!-- 删除整个 flow-view-toggle 区域 -->
<div className="flow-view-toggle">
  <button className={`filter ${isMonthView ? "on" : ""}`} onClick={() => setFlowViewMode("month")}>按月</button>
  <button className={`filter ${!isMonthView ? "on" : ""}`} onClick={() => setFlowViewMode("day")}>按日</button>
</div>

<!-- 删除整个 flow-month-switch 区域 -->
<div className="flow-month-switch">
  {isMonthView ? (
    <>
      <button className="ms-btn" onClick={prevFlowMonth}>◀</button>
      <span className="ms-now">{formatFlowMonthLabel(flowDate)}</span>
      <button className="ms-btn" onClick={nextFlowMonth}>▶</button>
      <input className="flow-date-input" type="month" ... />
    </>
  ) : (
    <>
      <button className="ms-btn" onClick={prevFlowDay}>◀</button>
      <span className="ms-now">{formatFlowDateLabel(flowDate)}</span>
      <button className="ms-btn" onClick={nextFlowDay}>▶</button>
      <input className="flow-date-input" type="date" ... />
    </>
  )}
</div>
```

以上两块全部删除，替换为新的日期选择下拉菜单。

---

## 改动1：新增 `components/modals/FlowDateSheet.tsx`

新建弹窗组件，支持「可选月份」和「自定义时间」两个选项卡：

```tsx
"use client"

import { useState, useRef, useEffect } from "react"

interface Props {
  open: boolean
  initialYear: number
  initialMonth: number
  onClose: () => void
  onMonthSelect: (year: number, month: number) => void
  onRangeSelect: (startDate: string, endDate: string) => void
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

  const yearRef = useRef<HTMLDivElement>(null)
  const monthRef = useRef<HTMLDivElement>(null)

  // 打开时滚动到当前年月
  useEffect(() => {
    if (open && tab === "month") {
      setTimeout(() => {
        yearRef.current?.querySelector(`[data-val="${selYear}"]`)?.scrollIntoView({ block: "center" })
        monthRef.current?.querySelector(`[data-val="${selMonth}"]`)?.scrollIntoView({ block: "center" })
      }, 50)
    }
  }, [open, tab, selYear, selMonth])

  if (!open) return null

  const years = Array.from({ length: 10 }, (_, i) => initialYear - 5 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="modal-overlay flow-date-overlay" onClick={onClose}>
      <div className="member-modal-panel flow-date-panel" onClick={(e) => e.stopPropagation()}>
        <div className="member-modal-header">
          <span className="member-modal-title">选择时间</span>
          <button className="member-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* 选项卡切换 */}
        <div className="flow-date-tabs">
          <button className={`flow-date-tab ${tab === "month" ? "on" : ""}`} onClick={() => setTab("month")}>可选月份</button>
          <button className={`flow-date-tab ${tab === "range" ? "on" : ""}`} onClick={() => setTab("range")}>自定义时间</button>
        </div>

        {tab === "month" && (
          <div className="flow-date-month-picker">
            <div className="flow-date-scroll-col">
              <div className="flow-date-scroll-label">年份</div>
              <div className="flow-date-scroll-list" ref={yearRef}>
                {years.map(y => (
                  <button key={y} data-val={y} className={`flow-date-scroll-item ${y === selYear ? "on" : ""}`} onClick={() => setSelYear(y)}>
                    {y}年
                  </button>
                ))}
              </div>
            </div>
            <div className="flow-date-scroll-col">
              <div className="flow-date-scroll-label">月份</div>
              <div className="flow-date-scroll-list" ref={monthRef}>
                {months.map(m => (
                  <button key={m} data-val={m} className={`flow-date-scroll-item ${m === selMonth ? "on" : ""}`} onClick={() => setSelMonth(m)}>
                    {m}月
                  </button>
                ))}
              </div>
            </div>
            <button className="px-btn flow-date-confirm" onClick={() => { onMonthSelect(selYear, selMonth); onClose() }}>
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

---

## 改动2：修改 `components/tabs/FlowTab.tsx`

### 2a. Props 类型变更

删除不再需要的 props：`flowViewMode, setFlowViewMode, prevFlowDay, nextFlowDay, prevFlowMonth, nextFlowMonth`

新增 props：`flowDateSheetOpen, setFlowDateSheetOpen, flowDateMode, setFlowDateMode, flowRangeStart, setFlowRangeStart, flowRangeEnd, setFlowRangeEnd`

### 2b. 删除旧模块，替换为下拉菜单

删除第 187-253 行（flow-view-toggle + flow-month-switch 整块）。

在 `flow-filter-row` 区域（第 186 行之后），替换为：

```tsx
<div className="flow-filter-row">
  {/* 日期选择下拉按钮 */}
  <button
    className="flow-date-dropdown"
    onClick={() => setFlowDateSheetOpen(true)}
    type="button"
  >
    {flowDateMode === "month"
      ? `${flowDate.slice(0,4)}-${flowDate.slice(5,7)}`
      : flowDateMode === "range"
        ? `${flowRangeStart} ~ ${flowRangeEnd}`
        : `${flowDate.slice(0,4)}-${flowDate.slice(5,7)}`
    }
    ▾
  </button>

  {/* 类型筛选 */}
  <div className="filters">
    {([{ k: "all" as const, label: "全部" }, { k: "out" as const, label: "支出" }, { k: "in" as const, label: "收入" }, { k: "save" as const, label: "存钱" }]).map(f => (
      <button key={f.k} className={`filter ${typeFilter === f.k ? "on" : ""}`} onClick={() => setTypeFilter(f.k)} type="button">{f.label}</button>
    ))}
  </div>

  {/* 分类筛选 */}
  <div className="rec-field flow-cat-select">
    ...（保持不变）
  </div>

  {/* 成员筛选 */}
  <div className="filters">
    ...（保持不变）
  </div>
</div>
```

### 2c. 日期弹窗组件

在 `FlowTab` 组件 return 末尾（`</section>` 之前），新增：

```tsx
<FlowDateSheet
  open={flowDateSheetOpen}
  initialYear={Number(flowDate.slice(0, 4))}
  initialMonth={Number(flowDate.slice(5, 7))}
  onClose={() => setFlowDateSheetOpen(false)}
  onMonthSelect={(year, month) => {
    setFlowDateMode("month")
    setFlowDate(`${year}-${String(month).padStart(2, "0")}-01`)
  }}
  onRangeSelect={(start, end) => {
    setFlowDateMode("range")
    setFlowRangeStart(start)
    setFlowRangeEnd(end)
  }}
/>
```

### 2d. 批量选择文案适配

找到第 282 行：
```tsx
{isMonthView ? "全选本月" : "全选当日"}
```

改为：
```tsx
{flowDateMode === "month" ? "全选本月" : flowDateMode === "day" ? "全选当日" : "全选区间"}
```

### 2e. 空状态文案适配

找到第 296-297 行：
```tsx
{isMonthView ? "这个月还没有账单，点 + 记第一笔吧" : "这一天还没有账单，点 + 记一笔吧"}
```

改为：
```tsx
{flowDateMode === "day" ? "这一天还没有账单，点 + 记一笔吧" : flowDateMode === "range" ? "这个时间段还没有账单" : "这个月还没有账单，点 + 记第一笔吧"}
```

### 2f. topbar 标题适配

找到第 181 行：
```tsx
{isMonthView ? `${formatFlowMonthLabel(flowDate)} · 全部账单` : `${formatFlowDateLabel(flowDate)} · 当日账单`}
```

改为：
```tsx
{flowDateMode === "day" ? `${formatFlowDateLabel(flowDate)} · 当日账单` : flowDateMode === "range" ? `${flowRangeStart} ~ ${flowRangeEnd}` : `${formatFlowMonthLabel(flowDate)} · 全部账单`}
```

---

## 改动3：修改 `hooks/useLedger.ts`

### 3a. 删除旧状态

删除以下状态和回调（约第 114-115 行 + 第 279-300 行）：
- `flowViewMode` / `setFlowViewMode`
- `prevFlowDay` / `nextFlowDay`
- `prevFlowMonth` / `nextFlowMonth`

### 3b. 新增状态

```ts
const [flowDateSheetOpen, setFlowDateSheetOpen] = useState(false)
const [flowDateMode, setFlowDateMode] = useState<"month" | "day" | "range">("month")
const [flowRangeStart, setFlowRangeStart] = useState("")
const [flowRangeEnd, setFlowRangeEnd] = useState("")
```

### 3c. 修改 filteredFlow 过滤逻辑

找到第 264-277 行，当前：
```ts
const filteredFlow = useMemo(
  () =>
    groupByDate(
      transactions.filter((t) => {
        if (flowViewMode === "day") return t.date === flowDate
        const d = new Date(t.date + "T12:00:00")
        const [y, m] = flowDate.split("-").map(Number)
        return d.getFullYear() === y && d.getMonth() + 1 === m
      }),
      cats,
      members,
      flowFilter === "all" ? undefined : flowFilter
    ),
  [transactions, cats, members, flowFilter, flowDate, flowViewMode]
)
```

改为：
```ts
const filteredFlow = useMemo(
  () =>
    groupByDate(
      transactions.filter((t) => {
        if (flowDateMode === "day") return t.date === flowDate
        if (flowDateMode === "range") return t.date >= flowRangeStart && t.date <= flowRangeEnd
        const d = new Date(t.date + "T12:00:00")
        const [y, m] = flowDate.split("-").map(Number)
        return d.getFullYear() === y && d.getMonth() + 1 === m
      }),
      cats,
      members,
      flowFilter === "all" ? undefined : flowFilter
    ),
  [transactions, cats, members, flowFilter, flowDate, flowDateMode, flowRangeStart, flowRangeEnd]
)
```

### 3d. 更新 ledger 返回对象

删除：`flowViewMode, setFlowViewMode, prevFlowDay, nextFlowDay, prevFlowMonth, nextFlowMonth`

新增：`flowDateSheetOpen, setFlowDateSheetOpen, flowDateMode, setFlowDateMode, flowRangeStart, setFlowRangeStart, flowRangeEnd, setFlowRangeEnd`

---

## 改动4：`components/styles/ledger.css`

### 4a. 删除旧样式

删除以下 CSS 规则（约第 137-142 行 + 第 343-344 行）：
- `.flow-month-switch` 及子规则（`.ms-now` `.ms-btn` `.ms-btn:active` `.ms-btn:disabled` `.flow-date-input`）
- `.flow-view-toggle` 及子规则

### 4b. 新增日期下拉菜单样式

```css
/* 流水日期下拉菜单 */
.app .flow-date-dropdown { display: flex; align-items: center; gap: 4px; font-family: var(--font-pixel-cjk), monospace; font-size: 13px; font-weight: 700; color: var(--ink); background: var(--card); border: 3px solid var(--ink); border-radius: 10px; padding: 8px 14px; cursor: pointer; box-shadow: 3px 3px 0 var(--ink); transition: transform .08s steps(2); margin-bottom: 12px; }
.app .flow-date-dropdown:active { transform: translate(2px, 2px); box-shadow: none; }

/* 日期弹窗 */
.app .flow-date-overlay { position: fixed; inset: 0; background: rgba(43,36,51,.5); z-index: 100; display: flex; align-items: flex-end; justify-content: center; }
.app .flow-date-panel { width: 100%; max-width: 480px; background: var(--cream); border: 4px solid var(--ink); border-bottom: none; border-radius: 16px 16px 0 0; overflow: hidden; max-height: 85vh; }

/* 选项卡 */
.app .flow-date-tabs { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 2px dashed rgba(43,36,51,.18); }
.app .flow-date-tab { flex: 1; border: 3px solid var(--ink); border-radius: 10px; background: var(--card); color: var(--text-sub); font-family: var(--font-pixel-cjk), monospace; font-size: 12px; padding: 8px; cursor: pointer; box-shadow: 2px 2px 0 var(--ink); text-align: center; }
.app .flow-date-tab.on { background: var(--accent); color: var(--cream); }

/* 年月滚动选择 */
.app .flow-date-month-picker { display: flex; gap: 12px; padding: 16px; align-items: flex-start; }
.app .flow-date-scroll-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.app .flow-date-scroll-label { font-family: var(--font-pixel-cjk), monospace; font-size: 11px; color: var(--text-sub); text-align: center; }
.app .flow-date-scroll-list { height: 180px; overflow-y: auto; border: 3px solid var(--ink); border-radius: 10px; background: var(--card); padding: 6px; display: flex; flex-direction: column; gap: 4px; scrollbar-width: thin; }
.app .flow-date-scroll-item { border: 2px solid transparent; border-radius: 8px; background: transparent; color: var(--ink); font-family: var(--font-pixel-cjk), monospace; font-size: 12px; padding: 8px; cursor: pointer; text-align: center; transition: all .08s; }
.app .flow-date-scroll-item.on { background: var(--accent); color: var(--cream); border-color: var(--ink); font-weight: 700; }

/* 确认按钮 */
.app .flow-date-confirm { width: 100%; margin-top: 12px; }

/* 自定义时间范围 */
.app .flow-date-range-picker { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.app .flow-date-range-row { display: flex; align-items: center; gap: 8px; }
.app .flow-date-range-label { font-family: var(--font-pixel-cjk), monospace; font-size: 12px; color: var(--ink); min-width: 5em; }
.app .flow-date-range-input { flex: 1; border: 3px solid var(--ink); border-radius: 10px; background: var(--card); color: var(--ink); font-family: var(--font-pixel), monospace; font-size: 12px; padding: 8px 12px; box-shadow: 2px 2px 0 var(--ink); }
.app .flow-date-range-error { font-family: var(--font-pixel-cjk), monospace; font-size: 11px; color: #D32F2F; text-align: center; }
```

---

## 验收标准

1. 流水界面顶部不再有"按月/按日"切换按钮
2. 流水界面顶部不再有◀ ▶左右箭头和原生日期input
3. 流水筛选区有一个"年份-月份"格式的下拉按钮（如 `2026-06 ▾`），点击弹出弹窗
4. 弹窗有"可选月份"和"自定义时间"两个选项卡
5. "可选月份"选项卡有年份和月份两列滚动列表，选中后高亮，点击确认查看对应月份数据
6. "自定义时间"选项卡有开始日期和结束日期两个 date input，选择后查看区间内数据
7. 选择月份后，流水列表显示该月全部收支明细
8. 选择自定义时间后，流水列表显示该区间全部收支明细
9. 批量选择文案适配（"全选本月"/"全选区间"/"全选当日"）
10. `npm run build` 通过
