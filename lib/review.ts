import type { Category, ReviewHabitAnalysis, ReviewPlan, Transaction } from "./types"
import { yuan } from "./format"

const YEAR_MONTH = /^\d{4}-\d{2}$/

function monthKeyFromParts(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function inMonth(tx: Transaction, year: number, month: number) {
  return tx.date.startsWith(monthKeyFromParts(year, month))
}

function groupMonthTotals(transactions: Transaction[], year: number, month: number) {
  const txs = transactions.filter((t) => inMonth(t, year, month))
  const income = txs.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0)
  const savings = txs.filter((t) => t.type === "save").reduce((s, t) => s + t.amount, 0)
  return { txs, income, expense, savings, balance: income - expense - savings }
}

export function buildReviewHabitAnalysis(
  transactions: Transaction[],
  cats: Category[],
  year: number,
  month: number
): ReviewHabitAnalysis {
  const cur = groupMonthTotals(transactions, year, month)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prev = groupMonthTotals(transactions, prevYear, prevMonth)

  const outTxs = cur.txs.filter((t) => t.type === "out")
  const map = new Map<string, number>()
  for (const t of outTxs) map.set(t.categoryKey, (map.get(t.categoryKey) || 0) + t.amount)
  const topCategories = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, amount]) => {
      const cat = cats.find((c) => c.key === key)
      return {
        name: cat?.label || key,
        amount,
        pct: cur.expense ? Math.round((amount / cur.expense) * 100) : 0,
      }
    })

  const momChange = prev.expense > 0 ? `${cur.expense >= prev.expense ? "较上月 +" : "较上月 "}${Math.abs(Math.round(((cur.expense - prev.expense) / prev.expense) * 100))}%` : "上月无支出"

  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyAverage = daysInMonth ? cur.expense / daysInMonth : 0
  const threshold = dailyAverage * 3
  const bigSpends = outTxs
    .filter((t) => t.amount > threshold && threshold > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((t) => ({
      date: t.date,
      note: t.note || cats.find((c) => c.key === t.categoryKey)?.label || t.categoryKey,
      amount: t.amount,
      flag: `单笔超过日均×3（${yuan(threshold)}）`,
    }))

  return { topCategories, momChange, bigSpends, dailyAverage }
}

export function loadReviewPlan(monthKey: string): ReviewPlan | null {
  if (typeof window === "undefined" || !YEAR_MONTH.test(monthKey)) return null
  try {
    const raw = localStorage.getItem(`review-plan:${monthKey}`)
    return raw ? (JSON.parse(raw) as ReviewPlan) : null
  } catch {
    return null
  }
}

export function saveReviewPlan(plan: ReviewPlan) {
  if (typeof window === "undefined") return
  localStorage.setItem(`review-plan:${plan.monthKey}`, JSON.stringify(plan))
}

export function currentPlanKey(year: number, month: number) {
  return monthKeyFromParts(year, month)
}

export { REVIEW_INSIGHT_RULES } from "./constants"
