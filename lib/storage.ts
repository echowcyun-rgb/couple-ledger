import { createDefaultState, INIT_CATS, STORAGE_KEY } from "./constants"
import type { AppState, Goal } from "./types"

interface StoredGoal extends Partial<Goal> {
  wu?: number
  yun?: number
}

function migrateGoal(g: StoredGoal): Goal {
  const contributions: Record<string, number> = { ...(g.contributions || {}) }
  if (g.wu != null && contributions.wu == null) contributions.wu = g.wu
  if (g.yun != null && contributions.yun == null) contributions.yun = g.yun
  return {
    id: g.id!,
    name: g.name!,
    emoji: g.emoji || "★",
    current: g.current ?? 0,
    target: g.target!,
    contributions,
    history: (g.history || []).map((h) => ({
      date: h.date,
      amount: h.amount,
      note: h.note,
      memberId: h.memberId,
    })),
  }
}

function mergeCats(saved: AppState["cats"]) {
  const keys = new Set(saved.map((c) => c.key))
  const merged = [...saved]
  for (const c of INIT_CATS) {
    if (!keys.has(c.key)) merged.push(c)
  }
  return merged
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createDefaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()
    const parsed = JSON.parse(raw) as Partial<AppState> & { goals?: StoredGoal[] }
    const defaults = createDefaultState()
    return {
      transactions: parsed.transactions || [],
      members: parsed.members?.length ? parsed.members : defaults.members,
      goals: (parsed.goals || []).map(migrateGoal),
      activeGoalId: parsed.activeGoalId ?? null,
      cats: mergeCats(parsed.cats?.length ? parsed.cats : defaults.cats),
      theme: parsed.theme || defaults.theme,
      coupleBg: parsed.coupleBg || "",
      startDate: parsed.startDate || defaults.startDate,
      remindOn: parsed.remindOn ?? true,
    }
  } catch {
    return createDefaultState()
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      console.warn("localStorage save failed — data may be too large")
    }
  }, 300)
}

export function exportSnapshot(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function importSnapshot(json: string): AppState {
  const parsed = JSON.parse(json) as Partial<AppState> & { goals?: StoredGoal[] }
  const defaults = createDefaultState()
  return {
    transactions: parsed.transactions || [],
    members: parsed.members?.length ? parsed.members : defaults.members,
    goals: (parsed.goals || []).map(migrateGoal),
    activeGoalId: parsed.activeGoalId ?? null,
    cats: mergeCats(parsed.cats?.length ? parsed.cats : defaults.cats),
    theme: parsed.theme || defaults.theme,
    coupleBg: parsed.coupleBg || "",
    startDate: parsed.startDate || defaults.startDate,
    remindOn: parsed.remindOn ?? true,
  }
}
