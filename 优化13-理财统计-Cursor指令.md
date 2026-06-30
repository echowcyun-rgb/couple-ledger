# 优化13：新增理财数据统计功能

## 设计思路

把"理财"作为**收入类型的一个特殊子分类**（`categoryKey="finance"`，`type="in"`），而不是新增 TxType。这样：
- 记账时选「收入 → 理财」就能记一笔理财收入
- 统计时单独把 `categoryKey="finance"` 的交易抽出来作为"理财收入"
- 存钱目标更新时新增"当月理财收入"模式，自动取当月所有理财类交易总额

涉及改动：
1. **`lib/types.ts`** — MonthSummary 加 financeIncome 字段
2. **`lib/constants.ts`** — INIT_CATS 加理财分类
3. **`lib/stats.ts`** — getMonthSummary 统计理财收入
4. **`hooks/useLedger.ts`** — saveUpdateGoal 加第3种模式 "finance"
5. **`components/tabs/HomeTab.tsx`** — 本月总览加"理财"格子
6. **`components/modals/UpdateGoalSheet.tsx`** — 加"当月理财收入"按钮
7. **`components/tabs/FlowTab.tsx`** — 类型筛选加"理财"
8. **`components/tabs/ReviewTab.tsx`** — 加理财趋势模块
9. **`components/styles/ledger.css`** — 新增 .ico.finance 样式 + 理财卡片样式

---

## 改动1：`lib/types.ts` — MonthSummary 加字段

找到第 104-109 行：

```ts
export interface MonthSummary {
  income: number
  expense: number
  savings: number
  balance: number
}
```

改为：

```ts
export interface MonthSummary {
  income: number
  expense: number
  savings: number
  balance: number
  financeIncome: number
}
```

---

## 改动2：`lib/constants.ts` — INIT_CATS 加理财分类

找到第 12-22 行：

```ts
export const INIT_CATS: Category[] = [
  { key: "food", glyph: "食", label: "餐饮", type: "out" },
  { key: "car", glyph: "车", label: "交通", type: "out" },
  { key: "shop", glyph: "袋", label: "购物", type: "out" },
  { key: "home", glyph: "家", label: "居家", type: "out" },
  { key: "fun", glyph: "玩", label: "娱乐", type: "out" },
  { key: "med", glyph: "医", label: "医疗", type: "out" },
  { key: "salary", glyph: "薪", label: "工资", type: "in" },
  { key: "gift", glyph: "礼", label: "红包", type: "in" },
  { key: "save", glyph: "储", label: "存钱", type: "save" },
]
```

改为（在 `gift` 后面加 `finance`）：

```ts
export const INIT_CATS: Category[] = [
  { key: "food", glyph: "食", label: "餐饮", type: "out" },
  { key: "car", glyph: "车", label: "交通", type: "out" },
  { key: "shop", glyph: "袋", label: "购物", type: "out" },
  { key: "home", glyph: "家", label: "居家", type: "out" },
  { key: "fun", glyph: "玩", label: "娱乐", type: "out" },
  { key: "med", glyph: "医", label: "医疗", type: "out" },
  { key: "salary", glyph: "薪", label: "工资", type: "in" },
  { key: "gift", glyph: "礼", label: "红包", type: "in" },
  { key: "finance", glyph: "理", label: "理财", type: "in" },
  { key: "save", glyph: "储", label: "存钱", type: "save" },
]
```

**⚠️ 注意**：已有用户的老数据中 `state.cats` 是从 localStorage 加载的，不会自动获得新的 `finance` 分类。需要在 `useLedger` 初始化时做合并：检查 `state.cats` 是否含 `finance`，没有就追加。见改动4。

---

## 改动3：`lib/stats.ts` — 统计理财收入

### 3a. 修改 getMonthSummary

找到第 30-36 行：

```ts
export function getMonthSummary(transactions: Transaction[], year: number, month: number): MonthSummary {
  const txs = transactions.filter((t) => inMonth(t, year, month))
  const income = sumByType(txs, "in")
  const expense = sumByType(txs, "out")
  const savings = sumByType(txs, "save")
  return { income, expense, savings, balance: income - expense - savings }
}
```

改为：

```ts
export function getMonthSummary(transactions: Transaction[], year: number, month: number): MonthSummary {
  const txs = transactions.filter((t) => inMonth(t, year, month))
  const income = sumByType(txs, "in")
  const expense = sumByType(txs, "out")
  const savings = sumByType(txs, "save")
  const financeIncome = txs
    .filter((t) => t.type === "in" && t.categoryKey === "finance")
    .reduce((s, t) => s + t.amount, 0)
  return { income, expense, savings, balance: income - expense - savings, financeIncome }
}
```

### 3b. 新增 getFinanceTrendData（理财趋势数据，给复盘用）

在 `getOutTrendData` 后面（约第 125 行之后）新增：

```ts
export function getFinanceTrendData(
  transactions: Transaction[],
  members: Member[],
  scope: "year" | "month" | "day",
  refYear: number,
  refMonth: number
): TrendRow[] {
  const financeTxs = transactions.filter((t) => t.type === "in" && t.categoryKey === "finance")
  return getTrendData(financeTxs, members, scope, refYear, refMonth, "in")
}
```

---

## 改动4：`hooks/useLedger.ts` — 合并理财分类 + 新增更新模式

### 4a. 初始化时合并新分类

在 `useLedger` 中找到 `loadState()` 调用处（约第 60-80 行附近，初始化 state 的地方），在加载完 state 后做合并：

```ts
// 合并默认分类中新增的理财分类（向后兼容老数据）
useEffect(() => {
  setState((s) => {
    if (s.cats.some((c) => c.key === "finance")) return s
    const financeCat = INIT_CATS.find((c) => c.key === "finance")
    if (!financeCat) return s
    return { ...s, cats: [...s.cats, financeCat] }
  })
}, [])
```

（在文件顶部 import 需要加 `useEffect`，如果还没引入的话）

### 4b. 修改 updateMode 类型

找到第 96 行：

```ts
const [updateMode, setUpdateMode] = useState<"amount" | "pct">("amount")
```

改为：

```ts
const [updateMode, setUpdateMode] = useState<"amount" | "pct" | "finance">("amount")
```

### 4c. 修改 saveUpdateGoal

找到第 547-586 行的 `saveUpdateGoal` 函数，在 `if (updateMode === "pct")` 分支后增加 `finance` 分支：

当前：
```ts
if (updateMode === "pct") {
  newCurrent = Math.round(updateGoal.target * (num / 100))
  historyAmount = newCurrent
  historyNote = updateNote || "手动更新"
} else {
  newCurrent = updateGoal.current + num
  historyAmount = num
  historyNote = updateNote || "存入"
}
```

改为：
```ts
if (updateMode === "pct") {
  newCurrent = Math.round(updateGoal.target * (num / 100))
  historyAmount = newCurrent
  historyNote = updateNote || "手动更新"
} else if (updateMode === "finance") {
  // 当月理财收入自动叠加
  const financeAmount = monthSummary.financeIncome
  newCurrent = updateGoal.current + financeAmount
  historyAmount = financeAmount
  historyNote = updateNote || "当月理财收入"
} else {
  newCurrent = updateGoal.current + num
  historyAmount = num
  historyNote = updateNote || "存入"
}
```

### 4d. 导出 getFinanceTrendData

在 ledger 返回对象中新增（约第 1118 行附近）：

```ts
getFinanceTrendData: useMemo(
  () => (scope: "year" | "month" | "day") =>
    getFinanceTrendData(transactions, members, scope, reviewYear, reviewMonth),
  [transactions, members, reviewYear, reviewMonth]
),
```

并在顶部 import 加 `getFinanceTrendData`。

---

## 改动5：`components/tabs/HomeTab.tsx` — 本月总览加理财格子

找到第 119-125 行：

```tsx
<div className="section-title">本月总览</div>
<div className="grid">
  <div className="stat"><div className="top"><span className="ico in">↗</span><span className="label">收入</span></div><div className="num">{yuan(monthSummary.income)}</div></div>
  <div className="stat"><div className="top"><span className="ico out">↘</span><span className="label">支出</span></div><div className="num">{yuan(monthSummary.expense)}</div></div>
  <div className="stat"><div className="top"><span className="ico save">⊙</span><span className="label">存钱</span></div><div className="num">{yuan(monthSummary.savings)}</div></div>
  <div className="stat"><div className="top"><span className="ico net">▤</span><span className="label">结余</span></div><div className="num">{yuan(monthSummary.balance)}</div></div>
</div>
```

改为（加第5个理财格子）：

```tsx
<div className="section-title">本月总览</div>
<div className="grid grid-5">
  <div className="stat"><div className="top"><span className="ico in">↗</span><span className="label">收入</span></div><div className="num">{yuan(monthSummary.income)}</div></div>
  <div className="stat"><div className="top"><span className="ico out">↘</span><span className="label">支出</span></div><div className="num">{yuan(monthSummary.expense)}</div></div>
  <div className="stat"><div className="top"><span className="ico save">⊙</span><span className="label">存钱</span></div><div className="num">{yuan(monthSummary.savings)}</div></div>
  <div className="stat"><div className="top"><span className="ico finance">★</span><span className="label">理财</span></div><div className="num">{yuan(monthSummary.financeIncome)}</div></div>
  <div className="stat"><div className="top"><span className="ico net">▤</span><span className="label">结余</span></div><div className="num">{yuan(monthSummary.balance)}</div></div>
</div>
```

---

## 改动6：`components/modals/UpdateGoalSheet.tsx` — 加"当月理财收入"按钮

找到第 88-92 行：

```tsx
<div className="upd-field-label">更新方式</div>
<div className="upd-modes">
  <button className={`upd-mode ${updateMode === "amount" ? "on" : ""}`} onClick={() => setUpdateMode("amount")}>按金额</button>
  <button className={`upd-mode ${updateMode === "pct" ? "on" : ""}`} onClick={() => setUpdateMode("pct")}>当月总存款百分比</button>
</div>
```

改为（加第3个按钮）：

```tsx
<div className="upd-field-label">更新方式</div>
<div className="upd-modes">
  <button className={`upd-mode ${updateMode === "amount" ? "on" : ""}`} onClick={() => setUpdateMode("amount")}>按金额</button>
  <button className={`upd-mode ${updateMode === "pct" ? "on" : ""}`} onClick={() => setUpdateMode("pct")}>当月总存款百分比</button>
  <button className={`upd-mode ${updateMode === "finance" ? "on" : ""}`} onClick={() => setUpdateMode("finance")}>当月理财收入</button>
</div>
```

找到第 93-106 行（金额输入区 + 提示），在 `updateMode === "finance"` 时需要隐藏金额输入框，改为显示理财收入金额：

当前：
```tsx
<div className="upd-field-label">{updateMode === "amount" ? "本次存入（元）" : "占当月总存款百分比（%）"}</div>
<input
  className="upd-input"
  type="number"
  inputMode="decimal"
  placeholder={updateMode === "amount" ? "0" : "0"}
  value={updateAmount}
  onChange={(e) => setUpdateAmount(e.target.value)}
/>
{updateMode === "amount" && updateAmount && !Number.isNaN(Number(updateAmount)) && Number(updateAmount) > 0 && (
  <div className="upd-field-hint">
    更新后将达到 ¥{updateGoal.current + Number(updateAmount)}
  </div>
)}
```

改为：

```tsx
{updateMode === "finance" ? (
  <>
    <div className="upd-field-label">当月理财收入</div>
    <div className="upd-finance-display">
      ¥{financeIncomeThisMonth}
    </div>
    <div className="upd-field-hint">
      更新后将达到 ¥{updateGoal.current + financeIncomeThisMonth}
    </div>
  </>
) : (
  <>
    <div className="upd-field-label">{updateMode === "amount" ? "本次存入（元）" : "占当月总存款百分比（%）"}</div>
    <input
      className="upd-input"
      type="number"
      inputMode="decimal"
      placeholder={updateMode === "amount" ? "0" : "0"}
      value={updateAmount}
      onChange={(e) => setUpdateAmount(e.target.value)}
    />
    {updateMode === "amount" && updateAmount && !Number.isNaN(Number(updateAmount)) && Number(updateAmount) > 0 && (
      <div className="upd-field-hint">
        更新后将达到 ¥{updateGoal.current + Number(updateAmount)}
      </div>
    )}
  </>
)}
```

在 `UpdateGoalSheet` 组件顶部 props 中新增 `monthSummary`：

```tsx
ledger: Pick<
  Ledger,
  | "updateGoalId"
  | "setUpdateGoalId"
  | "updateGoal"
  | "updateMode"
  | "setUpdateMode"
  | "updateAmount"
  | "setUpdateAmount"
  | "updateNote"
  | "setUpdateNote"
  | "updateMemberId"
  | "setUpdateMemberId"
  | "members"
  | "saveUpdateGoal"
  | "editGoalHistory"
  | "deleteGoalHistory"
  | "monthSummary"   // 新增
>
```

并在组件内解构：

```tsx
const {
  // ... 其他
  monthSummary,
} = ledger

const financeIncomeThisMonth = monthSummary?.financeIncome ?? 0
```

---

## 改动7：`components/tabs/FlowTab.tsx` — 类型筛选加"理财"

找到第 254-258 行：

```tsx
<div className="filters">
  {([{ k: "all" as const, label: "全部" }, { k: "out" as const, label: "支出" }, { k: "in" as const, label: "收入" }, { k: "save" as const, label: "存钱" }]).map(f => (
    <button key={f.k} className={`filter ${typeFilter === f.k ? "on" : ""}`} onClick={() => setTypeFilter(f.k)} type="button">{f.label}</button>
  ))}
</div>
```

改为（加第5个"理财"按钮）：

```tsx
<div className="filters">
  {([{ k: "all" as const, label: "全部" }, { k: "out" as const, label: "支出" }, { k: "in" as const, label: "收入" }, { k: "save" as const, label: "存钱" }, { k: "finance" as const, label: "理财" }]).map(f => (
    <button key={f.k} className={`filter ${typeFilter === f.k ? "on" : ""}`} onClick={() => setTypeFilter(f.k)} type="button">{f.label}</button>
  ))}
</div>
```

同时修改 `typeFilter` 的类型声明（约第 52 行）：

```ts
const [typeFilter, setTypeFilter] = useState<"all" | "out" | "in" | "save" | "finance">("all")
```

修改 `displayItems` 过滤逻辑（约第 65-74 行）：

当前：
```ts
const displayItems = filteredFlow
  .map(g => ({
    ...g,
    items: g.items.filter(i => {
      if (typeFilter !== "all" && i.type !== typeFilter) return false
      if (catFilter !== "all" && i.cat !== catFilter) return false
      return true
    })
  }))
  .filter(g => g.items.length > 0)
```

改为：

```ts
const displayItems = filteredFlow
  .map(g => ({
    ...g,
    items: g.items.filter(i => {
      if (typeFilter === "finance") {
        if (i.type !== "in" || i.cat !== "finance") return false
      } else if (typeFilter !== "all" && i.type !== typeFilter) {
        return false
      }
      if (catFilter !== "all" && i.cat !== catFilter) return false
      return true
    })
  }))
  .filter(g => g.items.length > 0)
```

---

## 改动8：`components/tabs/ReviewTab.tsx` — 加理财模块

### 8a. Props 新增

在 ReviewTab 的 Pick 类型中新增：

```ts
| "getFinanceTrendData"
```

并在解构中新增 `getFinanceTrendData`。

### 8b. 在"收入趋势"后面加"理财趋势"模块

找到第 115-118 行：

```tsx
<div className="section-title">收入趋势</div>
<TrendCard getData={getInTrendData} members={members} totalColor="#3DAE83" refYear={reviewYear} refMonth={reviewMonth} />
<div className="section-title">支出趋势</div>
<TrendCard getData={getOutTrendData} members={members} totalColor="#D96A7E" refYear={reviewYear} refMonth={reviewMonth} />
```

改为（在收入趋势和支出趋势之间插入理财趋势）：

```tsx
<div className="section-title">收入趋势</div>
<TrendCard getData={getInTrendData} members={members} totalColor="#3DAE83" refYear={reviewYear} refMonth={reviewMonth} />
<div className="section-title">理财趋势</div>
<TrendCard getData={getFinanceTrendData} members={members} totalColor="#A99BD6" refYear={reviewYear} refMonth={reviewMonth} />
<div className="section-title">支出趋势</div>
<TrendCard getData={getOutTrendData} members={members} totalColor="#D96A7E" refYear={reviewYear} refMonth={reviewMonth} />
```

### 8c. 在习惯分析 card 中加理财行

找到第 65-68 行：

```tsx
<div className="stat-table">
  <div className="st-row"><span className="st-l">TOP3支出分类</span><span className="st-v">{habitAnalysis.topCategories.length ? habitAnalysis.topCategories.map((t) => `${t.name} ${yuan(t.amount)}(${t.pct}%)`).join(" · ") : "—"}</span></div>
  <div className="st-row"><span className="st-l">环比变化</span><span className="st-v">{habitAnalysis.momChange}</span></div>
</div>
```

改为：

```tsx
<div className="stat-table">
  <div className="st-row"><span className="st-l">TOP3支出分类</span><span className="st-v">{habitAnalysis.topCategories.length ? habitAnalysis.topCategories.map((t) => `${t.name} ${yuan(t.amount)}(${t.pct}%)`).join(" · ") : "—"}</span></div>
  <div className="st-row"><span className="st-l">环比变化</span><span className="st-v">{habitAnalysis.momChange}</span></div>
  <div className="st-row"><span className="st-l">当月理财收入</span><span className="st-v">{reviewSummary.financeIncome > 0 ? yuan(reviewSummary.financeIncome) : "暂无"}</span></div>
</div>
```

在 ReviewTab 的 Props 中新增 `reviewSummary`（如果还没有的话）。

---

## 改动9：`components/styles/ledger.css` — 新增样式

### 9a. 新增 .ico.finance 颜色

找到第 104-107 行：

```css
.app .stat .ico.in { background: var(--in); }
.app .stat .ico.out { background: var(--out); }
.app .stat .ico.save { background: var(--save); }
.app .stat .ico.net { background: var(--in); }
```

改为（加 finance 紫色）：

```css
.app .stat .ico.in { background: var(--in); }
.app .stat .ico.out { background: var(--out); }
.app .stat .ico.save { background: var(--save); }
.app .stat .ico.finance { background: #A99BD6; }
.app .stat .ico.net { background: var(--in); }
```

### 9b. 新增 .grid-5 五列布局

找到第 100 行：

```css
.app .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 22px; }
```

在下面新增：

```css
.app .grid.grid-5 { grid-template-columns: 1fr 1fr; gap: 10px; }
.app .grid.grid-5 .stat { padding: 10px 12px; }
.app .grid.grid-5 .stat .num { font-size: 16px; margin-top: 8px; }
.app .grid.grid-5 .stat .label { font-size: 11px; }
.app .grid.grid-5 .stat .ico { width: 22px; height: 22px; font-size: 11px; }
```

（5 格仍按 2 列布局，只是稍微缩小尺寸）

### 9c. 新增理财收入显示样式

在 `.upd-input` 样式附近新增：

```css
.app .upd-finance-display { font-family: var(--font-pixel), monospace; font-size: 28px; color: #A99BD6; background: var(--cream); border: 3px solid var(--ink); border-radius: 12px; padding: 14px 16px; text-align: center; box-shadow: 3px 3px 0 var(--ink); margin-bottom: 8px; }
```

---

## 验收标准

1. 记账弹窗选「收入」类型时，分类列表能看到「理 理财」选项
2. 首页"本月总览"显示 5 个格子：收入 / 支出 / 存钱 / 理财 / 结余
3. 理财格子图标是紫色（#A99BD6）★
4. 点击存钱项目打开更新弹窗，更新方式有 3 个按钮：按金额 / 当月总存款百分比 / 当月理财收入
5. 选"当月理财收入"后，金额输入框隐藏，显示紫色大字「¥xxx」表示当月理财收入总额
6. 点保存后，存钱目标 current 自动加上当月理财收入金额
7. 流水界面类型筛选有 5 个按钮：全部 / 支出 / 收入 / 存钱 / 理财
8. 点"理财"只显示 categoryKey="finance" 的交易
9. 复盘界面"收入趋势"和"支出趋势"之间新增"理财趋势"模块
10. 习惯分析卡片新增"当月理财收入"一行
11. 老用户已有数据加载后，分类列表会自动补上"理财"分类（向后兼容）
12. `npm run build` 通过

---

## ⚠️ 注意事项

1. **老数据兼容**：已有用户的 localStorage 中 `cats` 数组没有 `finance` 分类，改动4a 的 useEffect 会自动补上
2. **理财不算独立 TxType**：理财仍然是 `type="in"`，只是 `categoryKey="finance"`。这样记账流程不需要改，选"收入 → 理财"即可
3. **结余公式不变**：`balance = income - expense - savings`，理财收入已经算在 income 里了，不会重复计算
4. **存钱目标 finance 模式**：选"当月理财收入"后，金额取自 `monthSummary.financeIncome`，即当月所有 categoryKey="finance" 的交易总和
