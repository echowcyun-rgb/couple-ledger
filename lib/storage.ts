import { createDefaultState, INIT_CATS, STORAGE_KEY } from "./constants"
import { normalizeCoupleBg } from "./couple-bg"
import { supabase, useCloud } from "./supabase"
import { withRoomLock } from "./sync-lock"
import { withRetry, withTimeout } from "./sync-utils"
import type { AppState, Goal, Member, Transaction } from "./types"
import type { PostgrestError } from "@supabase/supabase-js"

// ===== 类型迁移工具（保持不变） =====

interface StoredGoal extends Partial<Goal> {
  wu?: number
  yun?: number
}

interface TransactionRow {
  id: string
  date: string
  type: Transaction["type"]
  amount: number
  category_key: string
  member_id: string
  note?: string
  status?: Transaction["status"]
  recorder?: string
  created_at: number
}

interface MemberRow {
  id: string
  name: string
  avatar?: string
  gender?: Member["gender"]
  payday?: number
}

interface GoalRow {
  id: number
  name: string
  emoji?: string
  current?: number
  target: number
  contributions?: Record<string, number>
  history?: Goal["history"]
  deadline?: string
  completedAt?: string
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
    deadline: g.deadline || "",
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

function emitCloudError(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ledger-cloud-error", { detail: message }))
  }
}

/** 将 Supabase 错误转为用户可理解的提示 */
function formatCloudSyncError(message: string): string {
  if (/row-level security|42501/i.test(message)) {
    return `云同步失败：数据库权限不足（RLS）。请在 Supabase SQL Editor 执行项目根目录 supabase-fix-rls.sql`
  }
  return `云同步失败：${message || "请检查网络"}`
}

function resolveRoomId(state: AppState): string {
  return state.roomId || (typeof window !== "undefined" ? localStorage.getItem("couple-room-id") || "" : "")
}

type SupabaseResult<T> = { data: T | null; error: PostgrestError | null }

async function runSupabaseVoid(op: () => PromiseLike<SupabaseResult<unknown>>): Promise<void> {
  await withRetry(async () => {
    const { error } = await withTimeout(op())
    if (error) throw error
  })
}

async function runSupabaseQuery<T>(op: () => PromiseLike<SupabaseResult<T>>): Promise<T | null> {
  return withRetry(async () => {
    const { data, error } = await withTimeout(op())
    if (error) throw error
    return data
  })
}

function txToRow(tx: Transaction, roomId: string) {
  return {
    id: tx.id,
    room_id: roomId,
    date: tx.date,
    type: tx.type,
    amount: tx.amount,
    category_key: tx.categoryKey,
    member_id: tx.memberId,
    note: tx.note || "",
    status: tx.status || "confirmed",
    recorder: tx.recorder || null,
    created_at: tx.createdAt,
  }
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
    coupleBg: normalizeCoupleBg(parsed.coupleBg),
    startDate: parsed.startDate || defaults.startDate,
    remindOn: parsed.remindOn ?? true,
    importBatches: parsed.importBatches || [],
    roomId: parsed.roomId || localStorage.getItem("couple-room-id") || "",
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
/** 等待执行或正在执行的 push 数量；>3 时在弱网下可能积压 */
let pushQueueDepth = 0

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

  // 2. 异步推送到云（用户无感，debounce 1s 不变）
  if (useCloud) {
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      const roomId = resolveRoomId(state)
      if (!roomId) return

      pushQueueDepth++
      if (pushQueueDepth > 3) {
        console.warn("[sync] push 排队超过 3，可能在弱网或频繁编辑下积压")
      }

      withRoomLock(roomId, () => pushToCloud(state))
        .catch((e: unknown) => {
          const message = e instanceof Error ? e.message : String(e)
          emitCloudError(formatCloudSyncError(message))
        })
        .finally(() => {
          pushQueueDepth--
        })
    }, 1000)
  }
}

// ===== 云同步 =====

/** 将本地数据推送到 Supabase（须在 withRoomLock 内调用） */
async function pushToCloud(state: AppState): Promise<void> {
  if (!supabase) return

  const roomId = resolveRoomId(state)
  if (!roomId) return

  const CHUNK = 50
  for (let i = 0; i < state.transactions.length; i += CHUNK) {
    const chunk = state.transactions.slice(i, i + CHUNK).map((tx) => txToRow(tx, roomId))
    await runSupabaseVoid(() =>
      supabase!.from("transactions").upsert(chunk, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
    )
  }

  if (state.members.length > 0) {
    const memberRows = state.members.map((m) => ({
      id: m.id,
      room_id: roomId,
      name: m.name,
      avatar: m.avatar,
      gender: m.gender,
      payday: m.payday,
    }))
    await runSupabaseVoid(() =>
      supabase!.from("members").upsert(memberRows, { onConflict: "room_id,id" })
    )
  }

  if (state.goals.length > 0) {
    const goalRows = state.goals.map((g) => ({
      id: g.id,
      room_id: roomId,
      name: g.name,
      emoji: g.emoji,
      current: g.current,
      target: g.target,
      contributions: g.contributions,
      history: g.history,
      deadline: g.deadline || "",
      completedAt: g.completedAt || null,
    }))
    await runSupabaseVoid(() =>
      supabase!.from("goals").upsert(goalRows, { onConflict: "room_id,id" })
    )
  }
}

/** 从 Supabase 拉取云端数据，与本地合并 */
export async function syncFromCloud(): Promise<number> {
  if (!supabase) return 0

  const local = loadState()
  const roomId = resolveRoomId(local)
  if (!roomId) return 0

  return withRoomLock(roomId, async () => {
    let mergedCount = 0

    try {
      const txData = await runSupabaseQuery(() =>
        supabase!
          .from("transactions")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
      )

      if (txData && txData.length > 0) {
        const cloudTxns: Transaction[] = (txData as TransactionRow[]).map((r) => ({
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

        const localMap = new Map(local.transactions.map((t) => [t.id, t]))
        const cloudMap = new Map(cloudTxns.map((t) => [t.id, t]))

        for (const [id, ct] of cloudMap) {
          if (!localMap.has(id)) mergedCount++
          localMap.set(id, ct)
        }

        local.transactions = Array.from(localMap.values()).sort(
          (a, b) => b.createdAt - a.createdAt
        )
      }

      const memberData = await runSupabaseQuery(() =>
        supabase!.from("members").select("*").eq("room_id", roomId)
      )

      if (memberData && memberData.length > 0) {
        const cloudMembers: Member[] = (memberData as MemberRow[]).map((r) => ({
          id: r.id,
          name: r.name,
          avatar: r.avatar || "",
          gender: r.gender || "other",
          payday: r.payday ?? 10,
        }))

        const localMembers = new Map(local.members.map((m) => [m.id, m]))
        for (const cm of cloudMembers) {
          localMembers.set(cm.id, cm)
        }
        local.members = Array.from(localMembers.values())
      }

      const goalData = await runSupabaseQuery(() =>
        supabase!.from("goals").select("*").eq("room_id", roomId)
      )

      if (goalData && goalData.length > 0) {
        const cloudGoals: Goal[] = (goalData as GoalRow[]).map((r) => ({
          id: r.id,
          name: r.name,
          emoji: r.emoji || "★",
          current: Number(r.current ?? 0),
          target: Number(r.target),
          contributions: r.contributions || {},
          history: r.history || [],
          deadline: r.deadline || "",
          completedAt: r.completedAt || undefined,
        }))

        const localGoals = new Map(local.goals.map((g) => [g.id, g]))
        for (const cg of cloudGoals) {
          localGoals.set(cg.id, cg)
        }
        local.goals = Array.from(localGoals.values())
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
      return mergedCount
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      throw new Error(message || "cloud sync failed")
    }
  })
}

// ===== 快照导入导出（不变） =====

export function exportSnapshot(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function importSnapshot(json: string): AppState {
  return parseState(json)
}
