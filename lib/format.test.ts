import { afterEach, describe, expect, it, vi } from "vitest"
import { coupleDaysFrom } from "./format"

describe("coupleDaysFrom", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 1 when startDate is empty", () => {
    expect(coupleDaysFrom("")).toBe(1)
  })

  it("counts inclusive days from start date", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-02T08:30:00"))

    expect(coupleDaysFrom("2026-07-01")).toBe(2)
    expect(coupleDaysFrom("2026-07-02")).toBe(1)
  })

  it("handles month and year boundaries", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-01T01:00:00"))

    expect(coupleDaysFrom("2026-01-31")).toBe(2)
    expect(coupleDaysFrom("2025-12-31")).toBe(33)
  })
})
