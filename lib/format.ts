export const yuan = (n: number) => "¥" + Math.round(n)

export function formatFlowDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, today)) return "今天"
  if (sameDay(d, yesterday)) return "昨天"
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function coupleDaysFrom(startDate: string): number {
  if (!startDate) return 1
  const start = new Date(startDate + "T12:00:00")
  if (Number.isNaN(start.getTime())) return 1
  const now = new Date()
  const today = new Date(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T12:00:00`
  )
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1)
}

/** 2026-06-28 → 2026年6月28日 */
export function formatStartDateLabel(startDate: string): string {
  if (!startDate) return ""
  const [y, m, d] = startDate.split("-").map(Number)
  if (!y || !m || !d) return ""
  return `${y}年${m}月${d}日`
}

export function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

export function formatFlowDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return `${y}年${m}月${d}日`
}

export function formatFlowMonthLabel(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number)
  return `${y}年${m}月`
}

export function shiftMonth(dateStr: string, deltaMonths: number): string {
  const [y, m] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1 + deltaMonths, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
}
