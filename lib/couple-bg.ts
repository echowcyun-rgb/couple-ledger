import type { CoupleBg } from "./types"

export const DEFAULT_COUPLE_BG: CoupleBg = {
  url: "",
  posX: "50%",
  posY: "center",
}

/** 兼容旧版 localStorage 中的纯 base64 字符串 */
export function normalizeCoupleBg(raw: unknown): CoupleBg {
  if (raw == null) return { ...DEFAULT_COUPLE_BG }
  if (typeof raw === "string") {
    if (!raw.trim()) return { ...DEFAULT_COUPLE_BG }
    return { url: raw, posX: "50%", posY: "center" }
  }
  if (typeof raw === "object" && "url" in raw) {
    const o = raw as Partial<CoupleBg>
    return {
      url: typeof o.url === "string" ? o.url : "",
      posX: o.posX || "50%",
      posY: o.posY || "center",
    }
  }
  return { ...DEFAULT_COUPLE_BG }
}

export function hasCoupleBg(bg: CoupleBg): boolean {
  return !!bg.url
}

export function coupleBgInlineStyle(bg: CoupleBg): {
  backgroundImage: string
  backgroundSize: string
  backgroundPosition: string
} | undefined {
  if (!hasCoupleBg(bg)) return undefined
  return {
    backgroundImage: `url(${bg.url})`,
    backgroundSize: "cover",
    backgroundPosition: `${bg.posX} ${bg.posY}`,
  }
}

export function percentToNumber(value: string, fallback = 50): number {
  if (value === "center") return 50
  const n = parseFloat(value)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fallback
}

export function numberToPercent(n: number): string {
  return `${Math.round(Math.min(100, Math.max(0, n)))}%`
}
