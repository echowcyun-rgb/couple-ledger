import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  CLOUD_TIMEOUT_MS,
  isPostgrestError,
  isRetryableError,
  RETRYABLE_POSTGREST_CODES,
  sleep,
  withRetry,
  withTimeout,
} from "./sync-utils"

describe("sync-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("isPostgrestError", () => {
    it("识别 PostgREST 形状错误", () => {
      expect(isPostgrestError({ code: "PGRST116", message: "not found" })).toBe(true)
      expect(isPostgrestError(new Error("network"))).toBe(false)
    })
  })

  describe("isRetryableError", () => {
    it("网络/超时错误可重试", () => {
      expect(isRetryableError(new Error("fetch failed"))).toBe(true)
      expect(isRetryableError(new Error("云同步超时"))).toBe(true)
    })

    it("白名单 PostgREST 码可重试", () => {
      for (const code of RETRYABLE_POSTGREST_CODES) {
        expect(isRetryableError({ code, message: "retry me" })).toBe(true)
      }
    })

    it("业务/客户端错误不重试", () => {
      expect(isRetryableError({ code: "PGRST116", message: "not found" })).toBe(false)
      expect(isRetryableError({ code: "23505", message: "unique violation" })).toBe(false)
      expect(isRetryableError({ code: "42501", message: "rls" })).toBe(false)
      expect(isRetryableError({ code: "PGRST301", message: "bad request" })).toBe(false)
    })

    it("message 含 5xx 可重试", () => {
      expect(isRetryableError({ code: "UNKNOWN", message: "upstream 503" })).toBe(true)
    })
  })

  describe("withTimeout", () => {
    it("正常完成时返回结果", async () => {
      const result = withTimeout(Promise.resolve("ok"), 1000)
      await expect(result).resolves.toBe("ok")
    })

    it("超时时拒绝", async () => {
      const result = withTimeout(new Promise<string>(() => {}), 50)
      const assertion = expect(result).rejects.toThrow("云同步超时")
      await vi.advanceTimersByTimeAsync(50)
      await assertion
    })
  })

  describe("withRetry", () => {
    it("成功时不重试", async () => {
      const fn = vi.fn().mockResolvedValue("done")
      await expect(withRetry(fn, { retries: 2, baseDelay: 100 })).resolves.toBe("done")
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it("可重试错误会指数退避后重试", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("fetch failed"))
        .mockResolvedValue("ok")

      const promise = withRetry(fn, { retries: 2, baseDelay: 100 })
      await vi.runAllTimersAsync()
      await expect(promise).resolves.toBe("ok")
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it("不可重试错误立即抛出", async () => {
      const err = { code: "PGRST116", message: "not found" }
      const fn = vi.fn().mockRejectedValue(err)
      await expect(withRetry(fn, { retries: 2 })).rejects.toEqual(err)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it("耗尽重试次数后抛出最后错误", async () => {
      const err = new Error("fetch failed")
      const fn = vi.fn().mockRejectedValue(err)
      const promise = withRetry(fn, { retries: 2, baseDelay: 100 })
      const assertion = expect(promise).rejects.toThrow("fetch failed")
      await vi.advanceTimersByTimeAsync(1000)
      await assertion
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })

  describe("sleep", () => {
    it("按指定毫秒延迟", async () => {
      const promise = sleep(200)
      await vi.advanceTimersByTimeAsync(199)
      let settled = false
      promise.then(() => {
        settled = true
      })
      await Promise.resolve()
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      await promise
    })
  })

  it("默认超时为 10 秒", () => {
    expect(CLOUD_TIMEOUT_MS).toBe(10_000)
  })
})
