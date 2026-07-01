import type { Transaction } from "@/lib/types"

/** 与已有流水比对：date + type + amount（分）+ memberId + note 前缀 */
export function importDedupKey(
  t: Pick<Transaction, "date" | "type" | "amount" | "memberId" | "note">
): string {
  const notePart = (t.note || "").slice(0, 20)
  return `${t.date}|${t.type}|${Math.round(t.amount * 100)}|${t.memberId}|${notePart}`
}

export function buildExistingDedupSet(transactions: Transaction[]): Set<string> {
  return new Set(transactions.map(importDedupKey))
}

export function markImportDuplicates(
  incoming: Transaction[],
  existing: Transaction[]
): (Transaction & { isDuplicate: boolean })[] {
  const existingSet = buildExistingDedupSet(existing)
  const seenIncoming = new Set<string>()
  return incoming.map((t) => {
    const key = importDedupKey(t)
    const isDuplicate = existingSet.has(key) || seenIncoming.has(key)
    if (!isDuplicate) seenIncoming.add(key)
    return {
      ...t,
      isDuplicate,
    }
  })
}

/** 提交前再次去重（同文件内重复行） */
export function dedupeImportTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Set<string>()
  return transactions.filter((t) => {
    const key = importDedupKey(t)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
