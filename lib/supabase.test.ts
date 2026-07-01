import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockFrom = vi.fn()

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}))

function makeChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockResolvedValue(result),
    upsert: vi.fn().mockResolvedValue(result),
  }
  return chain
}

describe("supabase cloud helpers", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    mockFrom.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  async function loadSupabase() {
    return import("./supabase")
  }

  it("validateRoom 存在时返回 true", async () => {
    const chain = makeChain({ data: { room_id: "1234" }, error: null })
    mockFrom.mockReturnValue(chain)

    const { validateRoom } = await loadSupabase()
    await expect(validateRoom("1234")).resolves.toBe(true)
  })

  it("validateRoom 不存在时返回 false", async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const { validateRoom } = await loadSupabase()
    await expect(validateRoom("9999")).resolves.toBe(false)
  })

  it("validateRoom 业务错误向上抛出", async () => {
    const chain = makeChain({
      data: null,
      error: { code: "PGRST301", message: "bad request" },
    })
    mockFrom.mockReturnValue(chain)

    const { validateRoom } = await loadSupabase()
    await expect(validateRoom("1234")).rejects.toMatchObject({ code: "PGRST301" })
  })

  it("createRoom 在房号可用时插入并返回房号", async () => {
    const selectChain = makeChain({ data: null, error: null })
    const insertChain = makeChain({ data: null, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === "couples") {
        return {
          select: vi.fn().mockReturnValue(selectChain),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return insertChain
    })

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.234)

    const { createRoom } = await loadSupabase()
    await expect(createRoom()).resolves.toMatch(/^\d{4}$/)

    randomSpy.mockRestore()
  })

  it("pullTransactions 正常返回映射后的交易", async () => {
    vi.useRealTimers()
    const row = {
      id: "tx1",
      date: "2026-01-01",
      type: "out",
      amount: 12.5,
      category_key: "food",
      member_id: "wu",
      note: "午餐",
      status: "confirmed",
      recorder: null,
      created_at: 1,
    }
    const chain = makeChain({ data: [row], error: null })
    chain.order = vi.fn().mockResolvedValue({ data: [row], error: null })
    mockFrom.mockReturnValue(chain)

    const { pullTransactions } = await loadSupabase()
    const txns = await pullTransactions("1234")
    expect(txns).toHaveLength(1)
    expect(txns[0]).toMatchObject({
      id: "tx1",
      categoryKey: "food",
      memberId: "wu",
      synced: true,
    })
    vi.useFakeTimers()
  })

  it("可重试错误会重试后成功", async () => {
    const chain = makeChain({ data: [], error: null })
    let calls = 0
    chain.order = vi.fn().mockImplementation(() => {
      calls += 1
      if (calls === 1) {
        return Promise.resolve({
          data: null,
          error: { code: "PGRST503", message: "upstream unavailable" },
        })
      }
      return Promise.resolve({ data: [], error: null })
    })
    mockFrom.mockReturnValue(chain)

    const { pullTransactions } = await loadSupabase()
    const promise = pullTransactions("1234")
    await vi.advanceTimersByTimeAsync(600)
    await expect(promise).resolves.toEqual([])
    expect(calls).toBe(2)
  })
})
