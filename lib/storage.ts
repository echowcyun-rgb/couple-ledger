import { createDefaultState, INIT_CATS, STORAGE_KEY } from "./constants"
import { normalizeCoupleBg } from "./couple-bg"
import { supabase, useCloud, pullImportBatches, pushImportBatches, validateRoom, pullMembers, pullGoals, deleteCloudMembers, deleteCloudGoals } from "./supabase"
import { withRoomLock } from "./sync-lock"
import { withRetry, withTimeout } from "./sync-utils"
import type { AppState, Goal, Member, Transaction, Category } from "./types"
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
    completedAt: g.completedAt || undefined,
  }
}

function mergeCats(saved: AppState["cats"]) {
  return mergeCatsUnion([saved])
}

/** 合并多份分类列表：保证 INIT_CATS 齐全，同 key 后者覆盖前者 */
export function mergeCatsUnion(lists: Category[][]): Category[] {
  const map = new Map<string, Category>()
  for (const c of INIT_CATS) map.set(c.key, { ...c })
  for (const list of lists) {
    for (const c of list) map.set(c.key, c)
  }
  return Array.from(map.values())
}

/** 云同步写盘前，合并同步过程中用户在本地改动的字段（分类/主题等不上云表结构的字段） */
function preserveLocalOnlyFields(target: AppState): void {
  const latest = loadState()
  target.cats = mergeCatsUnion([target.cats, latest.cats])
  target.theme = latest.theme
  target.remindOn = latest.remindOn
  target.activeGoalId = latest.activeGoalId
}

const MAX_MEMBERS = 2

/** 合并云端与本地成员，按 id 去重、按名称去重，最多 2 人 */
function reconcileMembers(cloud: Member[], local: Member[]): Member[] {
  const cloudIds = new Set(cloud.map((m) => m.id))
  const localOnly = local.filter((m) => !cloudIds.has(m.id))
  const merged = [...cloud, ...localOnly]

  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  const out: Member[] = []
  for (const m of merged) {
    if (seenIds.has(m.id) || seenNames.has(m.name)) continue
    seenIds.add(m.id)
    seenNames.add(m.name)
    out.push(m)
    if (out.length >= MAX_MEMBERS) break
  }
  return out
}

function emitCloudError(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ledger-cloud-error", { detail: message }))
  }
}

function emitPushSuccess() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ledger-push-ok"))
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
    members: reconcileMembers([], parsed.members?.length ? parsed.members : defaults.members),
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

let pushTimer: ReturnType<typeof setTimeout> | null = null
/** 等待执行或正在执行的 push 数量；>3 时在弱网下可能积压 */
let pushQueueDepth = 0
/** 连续云同步（推送）失败次数；≥3 后仅 console 警告，不再弹 toast */
let consecutivePushFailures = 0

const PUSH_DEBOUNCE_MS = 2500

export function resetCloudSyncFailures(): void {
  consecutivePushFailures = 0
}

function onCloudSyncSuccess(): void {
  consecutivePushFailures = 0
}

/** 上报云同步失败；连续失败 ≥3 次后收敛为 console 警告 */
export function reportCloudSyncFailure(message: string): void {
  consecutivePushFailures++
  const formatted = formatCloudSyncError(message)
  if (consecutivePushFailures < 3) {
    emitCloudError(formatted)
  } else {
    console.warn("[sync] cloud sync failed", consecutivePushFailures, "times:", formatted)
  }
}

async function ensureRoomExistsForPush(roomId: string): Promise<boolean> {
  const roomExists = await validateRoom(roomId)
  if (!roomExists) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("couple-room-id")
    }
    return false
  }
  return true
}

/** 取消尚未执行的本地保存与云端推送（换房 / 重进房间前调用） */
export function cancelPendingSync(): void {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
}

/** 立即写入 localStorage，不触发 debounce */
export function flushStateSync(state: AppState): void {
  cancelPendingSync()
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    console.warn("localStorage save failed")
  }
}

/** 房间已不存在，本地缓存已清空 */
export function clearRoomCache(): void {
  cancelPendingSync()
  if (typeof window !== "undefined") {
    localStorage.removeItem("couple-room-id")
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem("couple-entered-room")
  }
}

export function isRoomDeletedError(e: unknown): boolean {
  return e instanceof Error && e.message === "ROOM_DELETED"
}

/** 换房或新建账本：清空本地数据并绑定新房号 */
export function resetLocalStateForRoom(roomId: string): AppState {
  cancelPendingSync()
  const fresh = createDefaultState()
  fresh.roomId = roomId
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    localStorage.setItem("couple-room-id", roomId)
  }
  return fresh
}

/** 立即落盘并同步到云端（换房间前刷盘） */
export async function flushAndPushState(state: AppState): Promise<void> {
  flushStateSync(state)
  if (!useCloud || !supabase) return
  const roomId = resolveRoomId(state)
  if (!roomId) return
  if (!(await ensureRoomExistsForPush(roomId))) return

  try {
    await withRoomLock(roomId, () => pushToCloud(state))
    onCloudSyncSuccess()
    emitPushSuccess()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    reportCloudSyncFailure(message)
    throw e
  }
}

export function saveState(state: AppState, options?: { push?: boolean }): void {
  if (typeof window === "undefined") return
  const shouldPush = options?.push !== false

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    console.warn("localStorage save failed")
  }

  if (!shouldPush || !useCloud) return

  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void (async () => {
      const roomId = resolveRoomId(state)
      if (!roomId) return
      if (!(await ensureRoomExistsForPush(roomId))) return

      pushQueueDepth++
      if (pushQueueDepth > 3) {
        console.warn("[sync] push 排队超过 3，可能在弱网或频繁编辑下积压")
      }

      try {
        await withRoomLock(roomId, () => pushToCloud(loadState()))
        onCloudSyncSuccess()
        emitPushSuccess()
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        reportCloudSyncFailure(message)
      } finally {
        pushQueueDepth--
      }
    })()
  }, PUSH_DEBOUNCE_MS)
}

// ===== 云同步 =====

/** 将本地数据推送到 Supabase（须在 withRoomLock 内调用） */
async function pushToCloud(state: AppState): Promise<void> {
  if (!supabase) return

  const roomId = resolveRoomId(state)
  if (!roomId) return

  await runSupabaseVoid(() =>
    supabase!.from("couples").upsert(
      { room_id: roomId, start_date: state.startDate || "", cats: state.cats },
      { onConflict: "room_id" }
    )
  )

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
    const capped = state.members.slice(0, MAX_MEMBERS)
    const memberRows = capped.map((m) => ({
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
    const keepIds = new Set(capped.map((m) => m.id))
    const cloudMembers = await pullMembers(roomId)
    const orphanIds = cloudMembers.filter((m) => !keepIds.has(m.id)).map((m) => m.id)
    if (orphanIds.length > 0) {
      await deleteCloudMembers(orphanIds, roomId)
    }
  } else {
    await runSupabaseVoid(() =>
      supabase!.from("members").delete().eq("room_id", roomId)
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
    const keepGoalIds = new Set(state.goals.map((g) => g.id))
    const cloudGoals = await pullGoals(roomId)
    const orphanGoalIds = cloudGoals.filter((g) => !keepGoalIds.has(g.id)).map((g) => g.id)
    if (orphanGoalIds.length > 0) {
      await deleteCloudGoals(orphanGoalIds, roomId)
    }
  } else {
    await runSupabaseVoid(() =>
      supabase!.from("goals").delete().eq("room_id", roomId)
    )
  }

  if (state.importBatches.length > 0) {
    await pushImportBatches(state.importBatches, roomId)
  }

  if (state.coupleBg && state.coupleBg.url) {
    await runSupabaseVoid(() =>
      supabase!.from("couples").update({
        couple_bg_url: state.coupleBg.url,
        couple_bg_pos_x: state.coupleBg.posX,
        couple_bg_pos_y: state.coupleBg.posY,
      }).eq("room_id", roomId)
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
      const roomExists = await validateRoom(roomId)
      if (!roomExists) {
        clearRoomCache()
        throw new Error("ROOM_DELETED")
      }

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
          const lt = localMap.get(id)
          if (!lt) {
            mergedCount++
            localMap.set(id, ct)
          } else if (lt.synced === false) {
            // 本地有未推送修改，保留本地版本
            continue
          } else {
            localMap.set(id, ct)
          }
        }

        // 本地已同步但云端已删除的记录应移除，避免旧数据残留
        const cloudIds = new Set(cloudTxns.map((t) => t.id))
        for (const id of [...localMap.keys()]) {
          const lt = localMap.get(id)!
          if (lt.synced && !cloudIds.has(id)) {
            localMap.delete(id)
          }
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

        local.members = reconcileMembers(cloudMembers, local.members)
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

      const cloudBatches = await pullImportBatches(roomId)
      if (cloudBatches.length > 0) {
        const batchMap = new Map(local.importBatches.map((b) => [b.time, b]))
        for (const cb of cloudBatches) {
          const localBatch = batchMap.get(cb.time)
          batchMap.set(
            cb.time,
            localBatch
              ? {
                  ...cb,
                  fileFingerprint: localBatch.fileFingerprint ?? cb.fileFingerprint,
                }
              : cb
          )
        }
        local.importBatches = Array.from(batchMap.values()).sort((a, b) =>
          b.time.localeCompare(a.time)
        )
      }

      const coupleData = await runSupabaseQuery(() =>
        supabase!.from("couples").select("couple_bg_url, couple_bg_pos_x, couple_bg_pos_y, start_date, cats").eq("room_id", roomId).maybeSingle()
      )
      if (coupleData) {
        const row = coupleData as {
          couple_bg_url?: string
          couple_bg_pos_x?: string
          couple_bg_pos_y?: string
          start_date?: string
          cats?: Category[]
        }
        if (row.start_date) {
          local.startDate = row.start_date
        }
        if (Array.isArray(row.cats) && row.cats.length > 0) {
          local.cats = mergeCatsUnion([local.cats, row.cats])
        }
        if (row.couple_bg_url) {
          local.coupleBg = normalizeCoupleBg({
            url: row.couple_bg_url,
            posX: row.couple_bg_pos_x || "50%",
            posY: row.couple_bg_pos_y || "center",
          })
        }
      }

      preserveLocalOnlyFields(local)
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
