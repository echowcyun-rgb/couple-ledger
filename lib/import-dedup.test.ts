import { describe, expect, it } from "vitest"
import { importDedupKey, markImportDuplicates } from "@/lib/import-dedup"
import type { Transaction } from "@/lib/types"

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: "1",
  date: "2026-01-15",
  type: "out",
  amount: 12.5,
  categoryKey: "food",
  memberId: "a",
  note: "",
  createdAt: 0,
  ...overrides,
})

describe("importDedupKey", () => {
  it("同一 date/type/amount 生成相同 key", () => {
    const a = importDedupKey(tx({ amount: 99.99 }))
    const b = importDedupKey(tx({ id: "2", amount: 99.99 }))
    expect(a).toBe(b)
  })

  it("金额分位不同则 key 不同", () => {
    expect(importDedupKey(tx({ amount: 10 }))).not.toBe(importDedupKey(tx({ amount: 10.01 })))
  })
})

describe("markImportDuplicates", () => {
  it("标记与已有流水重复的记录", () => {
    const existing = [tx({ id: "e1" })]
    const incoming = [tx({ id: "n1" }), tx({ id: "n2", date: "2026-01-16" })]
    const marked = markImportDuplicates(incoming, existing)
    expect(marked[0].isDuplicate).toBe(true)
    expect(marked[1].isDuplicate).toBe(false)
  })
})
