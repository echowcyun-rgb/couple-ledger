import { describe, expect, it } from "vitest"
import { withRoomLock } from "./sync-lock"

describe("sync-lock", () => {
  it("空 roomId 时不加锁直接执行", async () => {
    let ran = false
    await withRoomLock("", async () => {
      ran = true
    })
    expect(ran).toBe(true)
  })

  it("同一 roomId 串行执行", async () => {
    const order: number[] = []
    const delay = (ms: number, value: number) =>
      new Promise<number>((resolve) => {
        setTimeout(() => {
          order.push(value)
          resolve(value)
        }, ms)
      })

    const p1 = withRoomLock("1234", () => delay(30, 1))
    const p2 = withRoomLock("1234", () => delay(10, 2))

    await Promise.all([p1, p2])
    expect(order).toEqual([1, 2])
  })

  it("不同 roomId 可并发", async () => {
    const order: string[] = []
    const mark = (tag: string, ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          order.push(tag)
          resolve()
        }, ms)
      })

    await Promise.all([
      withRoomLock("aaaa", () => mark("a1", 20)),
      withRoomLock("bbbb", () => mark("b1", 5)),
    ])

    expect(order[0]).toBe("b1")
    expect(order[1]).toBe("a1")
  })

  it("异常路径也会释放锁", async () => {
    const results: string[] = []

    await expect(
      withRoomLock("9999", async () => {
        throw new Error("boom")
      })
    ).rejects.toThrow("boom")

    await withRoomLock("9999", async () => {
      results.push("after-error")
    })

    expect(results).toEqual(["after-error"])
  })
})
