import type { Transaction } from "@/lib/types"

/** 与已有流水比对：date + type + amount（分）三元组 */
export function importDedupKey(t: Pick<Transaction, "date" | "type" | "amount">): string {
  return `${t.date}|${t.type}|${Math.round(t.amount * 100)}`
}

export function buildExistingDedupSet(transactions: Transaction[]): Set<string> {
  return new Set(transactions.map(importDedupKey))
}

export function markImportDuplicates(
  incoming: Transaction[],
  existing: Transaction[]
): (Transaction & { isDuplicate: boolean })[] {
  const existingSet = buildExistingDedupSet(existing)
  return incoming.map((t) => ({
    ...t,
    isDuplicate: existingSet.has(importDedupKey(t)),
  }))
}
