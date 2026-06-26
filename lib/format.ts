export const yuan = (n: number) => "¥" + n.toLocaleString()

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
  const start = new Date(startDate + "T12:00:00")
  return Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000) + 1)
}
