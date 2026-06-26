import { PIE_COLORS } from "./constants"
import type {
  Category,
  FlowGroup,
  Member,
  MonthSummary,
  MemberSummary,
  PieSlice,
  StructureStats,
  TopCategoryStat,
  Transaction,
  TrendRow,
  TxType,
} from "./types"
import { yuan } from "./format"

function inMonth(tx: Transaction, year: number, month: number): boolean {
  const d = new Date(tx.date + "T12:00:00")
  return d.getFullYear() === year && d.getMonth() + 1 === month
}

function inYear(tx: Transaction, year: number): boolean {
  return new Date(tx.date + "T12:00:00").getFullYear() === year
}

function sumByType(txs: Transaction[], type: TxType): number {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)
}

export function getMonthSummary(transactions: Transaction[], year: number, month: number): MonthSummary {
  const txs = transactions.filter((t) => inMonth(t, year, month))
  const income = sumByType(txs, "in")
  const expense = sumByType(txs, "out")
  const savings = sumByType(txs, "save")
  return { income, expense, savings, balance: income - expense - savings }
}

export function getMemberSummary(
  transactions: Transaction[],
  members: Member[],
  year: number,
  month: number
): MemberSummary[] {
  const txs = transactions.filter((t) => inMonth(t, year, month))
  return members.map((m) => {
    const mine = txs.filter((t) => t.memberId === m.id)
    return {
      memberId: m.id,
      income: sumByType(mine, "in"),
      expense: sumByType(mine, "out"),
      savings: sumByType(mine, "save"),
    }
  })
}

function buildTrendRow(k: string, txs: Transaction[], members: Member[]): TrendRow {
  const row: TrendRow = { k, total: 0 }
  for (const m of members) row[m.id] = 0
  for (const t of txs) {
    row.total += t.amount
    if (row[t.memberId] !== undefined) {
      row[t.memberId] = (row[t.memberId] as number) + t.amount
    }
  }
  return row
}

export function getTrendData(
  transactions: Transaction[],
  members: Member[],
  scope: "year" | "month" | "day",
  refYear: number,
  refMonth: number,
  typeFilter: TxType
): TrendRow[] {
  const filtered = transactions.filter((t) => t.type === typeFilter)

  const buildRow = (k: string, txs: Transaction[]) => buildTrendRow(k, txs, members)

  if (scope === "year") {
    const years = new Set(filtered.map((t) => new Date(t.date + "T12:00:00").getFullYear()))
    years.add(refYear)
    return Array.from(years)
      .sort((a, b) => a - b)
      .slice(-5)
      .map((y) => buildRow(String(y), filtered.filter((t) => inYear(t, y))))
  }

  if (scope === "month") {
    return Array.from({ length: 12 }, (_, i) => i + 1).map((m) =>
      buildRow(`${m}月`, filtered.filter((t) => inMonth(t, refYear, m)))
    )
  }

  const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  const buckets = labels.map((k) => ({ k, txs: [] as Transaction[] }))
  filtered
    .filter((t) => inMonth(t, refYear, refMonth))
    .forEach((t) => {
      const dow = new Date(t.date + "T12:00:00").getDay()
      buckets[dow].txs.push(t)
    })
  return buckets.map((b) => buildRow(b.k, b.txs))
}

export function getInTrendData(
  transactions: Transaction[],
  members: Member[],
  scope: "year" | "month" | "day",
  refYear: number,
  refMonth: number
): TrendRow[] {
  return getTrendData(transactions, members, scope, refYear, refMonth, "in")
}

export function getOutTrendData(
  transactions: Transaction[],
  members: Member[],
  scope: "year" | "month" | "day",
  refYear: number,
  refMonth: number
): TrendRow[] {
  return getTrendData(transactions, members, scope, refYear, refMonth, "out")
}

export function getExpensePie(
  transactions: Transaction[],
  cats: Category[],
  year: number,
  month: number,
  scope: "month" | "year" = "month"
): PieSlice[] {
  const txs = transactions.filter(
    (t) => t.type === "out" && (scope === "year" ? inYear(t, year) : inMonth(t, year, month))
  )
  const map = new Map<string, number>()
  for (const t of txs) {
    map.set(t.categoryKey, (map.get(t.categoryKey) || 0) + t.amount)
  }
  return Array.from(map.entries()).map(([key, value], i) => {
    const cat = cats.find((c) => c.key === key)
    return { name: cat?.label || key, value, color: PIE_COLORS[i % PIE_COLORS.length] }
  })
}

export function getTopCategories(
  transactions: Transaction[],
  cats: Category[],
  year: number,
  month: number
): TopCategoryStat[] {
  const txs = transactions.filter((t) => t.type === "out" && inMonth(t, year, month))
  const total = txs.reduce((s, t) => s + t.amount, 0)
  const map = new Map<string, number>()
  for (const t of txs) map.set(t.categoryKey, (map.get(t.categoryKey) || 0) + t.amount)
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, amount]) => {
      const cat = cats.find((c) => c.key === key)
      return { name: cat?.label || key, amount, pct: total ? Math.round((amount / total) * 100) : 0 }
    })
}

export function getStructureStats(
  transactions: Transaction[],
  cats: Category[],
  year: number,
  month: number
): StructureStats {
  const top = getTopCategories(transactions, cats, year, month)
  const top3 =
    top.length === 0
      ? "—"
      : top.map((t) => `${t.name} ${yuan(t.amount)}(${t.pct}%)`).join(" · ")

  const cur = getMonthSummary(transactions, year, month).expense
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prev = getMonthSummary(transactions, prevYear, prevMonth).expense
  let momChange = "—"
  if (prev > 0 && cur > 0) {
    const pct = Math.round(((cur - prev) / prev) * 100)
    momChange = pct >= 0 ? `较上月 +${pct}%` : `较上月 ${pct}%`
  } else if (cur > 0) {
    momChange = "上月无支出"
  }

  let habit = "—"
  if (top.length > 0 && top[0].pct >= 40) {
    habit = `${top[0].name}占比偏高，注意控制`
  } else if (top.length > 0) {
    habit = "支出结构较均衡"
  }

  return { top3, momChange, habit }
}

export function groupByDate(
  transactions: Transaction[],
  cats: Category[],
  members: Member[],
  filterMemberId?: string
): FlowGroup[] {
  let txs = [...transactions].sort((a, b) => b.createdAt - a.createdAt)
  if (filterMemberId) txs = txs.filter((t) => t.memberId === filterMemberId)

  const groups = new Map<string, FlowGroup>()
  for (const t of txs) {
    if (!groups.has(t.date)) {
      groups.set(t.date, { date: t.date, sum: 0, items: [] })
    }
    const g = groups.get(t.date)!
    const cat = cats.find((c) => c.key === t.categoryKey)
    const member = members.find((m) => m.id === t.memberId)
    const signed = t.type === "in" ? t.amount : t.type === "out" ? -t.amount : t.amount
    g.sum += signed
    g.items.push({
      id: t.id,
      cat: t.categoryKey,
      catLabel: cat?.label || t.categoryKey,
      catGlyph: cat?.glyph || "?",
      note: t.note,
      member: t.memberId,
      memberName: member?.name || "",
      type: t.type,
      amount: t.amount,
    })
  }
  return Array.from(groups.values())
}
