import { createDefaultState, INIT_CATS, STORAGE_KEY } from "./constants"
import { supabase, useCloud } from "./supabase"
import type { AppState, Goal, ImportBatch, Member, Transaction } from "./types"

// ===== 类型迁移工具（保持不变） =====

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

function parseState(raw: string): AppState {
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
    importBatches: parsed.importBatches || [],
  }
}

// ===== localStorage 基础读写 =====

export function loadState(): AppState {
  if (typeof window === "undefined") return createDefaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()
    return parseState(raw)
  } catch {
    return createDefaultState()
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return

  // 1. 立即写 localStorage（离线可用）
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      console.warn("localStorage save failed")
    }
  }, 300)

  // 2. 异步推送到云（用户无感）
  if (useCloud) {
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => pushToCloud(state), 1000)
  }
}

// ===== 云同步 =====

/** 将本地数据推送到 Supabase */
async function pushToCloud(state: AppState): Promise<void> {
  if (!supabase) return

  try {
    // 批量推送交易记录（逐条 upsert，按 id 去重）
    const CHUNK = 50
    for (let i = 0; i < state.transactions.length; i += CHUNK) {
      const chunk = state.transactions.slice(i, i + CHUNK).map((tx) => ({
        id: tx.id,
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        category_key: tx.categoryKey,
        member_id: tx.memberId,
        note: tx.note || "",
        status: tx.status || "confirmed",
        recorder: tx.recorder || null,
        created_at: tx.createdAt,
      }))
      const { error } = await supabase.from("transactions").upsert(chunk, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
      if (error) console.warn("push transactions chunk failed:", error.message)
    }

    // 推送成员
    for (const m of state.members) {
      const { error } = await supabase.from("members").upsert(
        {
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          gender: m.gender,
          payday: m.payday,
        },
        { onConflict: "id" }
      )
      if (error) console.warn("push member failed:", error.message)
    }

    // 推送存钱目标
    for (const g of state.goals) {
      const { error } = await supabase.from("goals").upsert(
        {
          id: g.id,
          name: g.name,
          emoji: g.emoji,
          current: g.current,
          target: g.target,
          contributions: g.contributions,
          history: g.history,
        },
        { onConflict: "id" }
      )
      if (error) console.warn("push goal failed:", error.message)
    }
  } catch (e: any) {
    console.warn("cloud push failed:", e?.message || e)
  }
}

/** 从 Supabase 拉取云端数据，与本地合并 */
export async function syncFromCloud(): Promise<number> {
  if (!supabase) return 0

  let mergedCount = 0
  const local = loadState()

  try {
    // 拉取交易记录
    const { data: txData, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })

    if (txErr) throw txErr

    if (txData && txData.length > 0) {
      const cloudTxns: Transaction[] = txData.map((r: any) => ({
        id: r.id,
        date: r.date,
        type: r.type,
        amount: Number(r.amount),
        categoryKey: r.category_key,
        memberId: r.member_id,
        note: r.note || "",
        status: r.status || "confirmed",
        recorder: r.recorder || undefined,
        createdAt: r.created_at,
        synced: true,
      }))

      // 合并：云端有则覆盖本地，云端没有则保留本地
      const localMap = new Map(local.transactions.map((t) => [t.id, t]))
      const cloudMap = new Map(cloudTxns.map((t) => [t.id, t]))

      // 云端有的 → 覆盖本地
      for (const [id, ct] of cloudMap) {
        if (!localMap.has(id)) mergedCount++
        localMap.set(id, ct)
      }

      local.transactions = Array.from(localMap.values()).sort(
        (a, b) => b.createdAt - a.createdAt
      )
    }

    // 拉取成员
    const { data: memberData, error: memberErr } = await supabase
      .from("members")
      .select("*")

    if (!memberErr && memberData && memberData.length > 0) {
      const cloudMembers: Member[] = memberData.map((r: any) => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar || "",
        gender: r.gender || "other",
        payday: r.payday ?? 10,
      }))

      // 合并：云端覆盖本地
      const localMembers = new Map(local.members.map((m) => [m.id, m]))
      for (const cm of cloudMembers) {
        localMembers.set(cm.id, cm)
      }
      local.members = Array.from(localMembers.values())
    }

    // 拉取存钱目标
    const { data: goalData, error: goalErr } = await supabase
      .from("goals")
      .select("*")

    if (!goalErr && goalData && goalData.length > 0) {
      const cloudGoals: Goal[] = goalData.map((r: any) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji || "★",
        current: Number(r.current ?? 0),
        target: Number(r.target),
        contributions: r.contributions || {},
        history: r.history || [],
      }))

      // 合并
      const localGoals = new Map(local.goals.map((g) => [g.id, g]))
      for (const cg of cloudGoals) {
        localGoals.set(cg.id, cg)
      }
      local.goals = Array.from(localGoals.values())
    }

    // 保存合并结果
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
    return mergedCount
  } catch (e: any) {
    console.warn("cloud sync failed:", e?.message || e)
    return 0
  }
}

// ===== 快照导入导出（不变） =====

export function exportSnapshot(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function importSnapshot(json: string): AppState {
  return parseState(json)
}
