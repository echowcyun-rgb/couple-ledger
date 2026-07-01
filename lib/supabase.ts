/**
 * Supabase 客户端 + 云同步工具
 * 策略：写入先写 localStorage（即时响应），后台异步推云端
 * 读取优先读本地，云只用来合并
 */
import { createClient, type PostgrestError } from "@supabase/supabase-js"
import type { Transaction, Goal, Member, ImportBatch, AppState } from "./types"
import { withRetry, withTimeout } from "./sync-utils"

// ===== 客户端初始化 =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const isConfigured = !!(supabaseUrl && supabaseAnonKey)

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }, // 情侣账本不需要用户登录
    })
  : null

export const useCloud = isConfigured

export function isCloudReady(): boolean {
  return supabase !== null
}

/** 本地模式房号存储 key（Supabase 不可用时 fallback） */
const LOCAL_ROOMS_KEY = "couple-local-rooms"

function getLocalRooms(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || "[]")
  } catch {
    return []
  }
}

function saveLocalRoom(code: string): void {
  if (typeof window === "undefined") return
  const existing = getLocalRooms()
  if (!existing.includes(code)) {
    existing.push(code)
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(existing))
  }
}

type SupabaseResult<T> = { data: T | null; error: PostgrestError | null }

async function runSupabase<T>(
  op: () => PromiseLike<SupabaseResult<T>>
): Promise<T | null> {
  return withRetry(async () => {
    const { data, error } = await withTimeout(op())
    if (error) throw error
    return data
  })
}

async function runSupabaseVoid(op: () => PromiseLike<SupabaseResult<unknown>>): Promise<void> {
  await withRetry(async () => {
    const { error } = await withTimeout(op())
    if (error) throw error
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

function rowToTx(r: Record<string, unknown>): Transaction {
  return {
    id: r.id as string,
    date: r.date as string,
    type: r.type as Transaction["type"],
    amount: Number(r.amount),
    categoryKey: r.category_key as string,
    memberId: r.member_id as string,
    note: (r.note as string) || "",
    status: (r.status as Transaction["status"]) || "confirmed",
    recorder: (r.recorder as string) || undefined,
    createdAt: r.created_at as number,
    synced: true,
  }
}

// ===== 交易记录同步 =====

export async function pullTransactions(roomId: string): Promise<Transaction[]> {
  if (!supabase) return []
  try {
    const data = await runSupabase(() =>
      supabase!
        .from("transactions")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(500)
    )
    return (data || []).map((r) => rowToTx(r as Record<string, unknown>))
  } catch (e) {
    console.warn("拉取云端交易记录失败:", e)
    throw e
  }
}

export async function pushTransaction(tx: Transaction, roomId: string): Promise<boolean> {
  if (!supabase) return false
  try {
    await runSupabaseVoid(() =>
      supabase!.from("transactions").upsert(txToRow(tx, roomId), { onConflict: "id" })
    )
    return true
  } catch (e) {
    console.warn("推送交易记录到云端失败:", e)
    throw e
  }
}

export async function pushTransactions(txns: Transaction[], roomId: string): Promise<boolean> {
  if (!supabase || txns.length === 0) return false
  try {
    await runSupabaseVoid(() =>
      supabase!
        .from("transactions")
        .upsert(
          txns.map((t) => txToRow(t, roomId)),
          { onConflict: "id" }
        )
    )
    return true
  } catch (e) {
    console.warn("批量推送交易记录失败:", e)
    throw e
  }
}

export async function deleteCloudTransaction(id: string, roomId: string): Promise<boolean> {
  if (!supabase) return false
  try {
    await runSupabaseVoid(() =>
      supabase!.from("transactions").delete().eq("id", id).eq("room_id", roomId)
    )
    return true
  } catch (e) {
    console.warn("删除云端交易记录失败:", e)
    return false
  }
}

/** 批量删除云端交易（撤销导入用，失败向上抛出） */
export async function deleteCloudTransactions(ids: string[], roomId: string): Promise<void> {
  if (!supabase || ids.length === 0) return
  await runSupabaseVoid(() =>
    supabase!.from("transactions").delete().in("id", ids).eq("room_id", roomId)
  )
}

// ===== 存钱目标同步 =====

export async function pullGoals(roomId: string): Promise<Goal[]> {
  if (!supabase) return []
  try {
    const data = await runSupabase(() =>
      supabase!.from("goals").select("*").eq("room_id", roomId).order("id", { ascending: true })
    )
    return (data || []).map((g) => {
      const row = g as Record<string, unknown>
      return {
        id: row.id as number,
        name: row.name as string,
        emoji: (row.emoji as string) || "★",
        current: (row.current as number) ?? 0,
        target: row.target as number,
        contributions: (row.contributions as Record<string, number>) || {},
        history: (row.history as Goal["history"]) || [],
        deadline: (row.deadline as string) || "",
        completedAt: (row.completedAt as string) || undefined,
      }
    })
  } catch (e) {
    console.warn("拉取云端目标失败:", e)
    return []
  }
}

export async function pushGoals(goals: Goal[], roomId: string): Promise<boolean> {
  if (!supabase || goals.length === 0) return false
  try {
    const rows = goals.map((g) => ({
      id: g.id,
      room_id: roomId,
      name: g.name,
      emoji: g.emoji || "★",
      current: g.current ?? 0,
      target: g.target,
      contributions: g.contributions,
      history: g.history,
      deadline: g.deadline || "",
      completedAt: g.completedAt || null,
    }))
    await runSupabaseVoid(() =>
      supabase!.from("goals").upsert(rows, { onConflict: "room_id,id" })
    )
    return true
  } catch (e) {
    console.warn("推送目标到云端失败:", e)
    return false
  }
}

// ===== 成员同步 =====

export async function pullMembers(roomId: string): Promise<Member[]> {
  if (!supabase) return []
  try {
    const data = await runSupabase(() =>
      supabase!.from("members").select("*").eq("room_id", roomId)
    )
    return (data || []).map((m) => {
      const row = m as Record<string, unknown>
      return {
        id: row.id as string,
        name: row.name as string,
        avatar: (row.avatar as string) || "",
        gender: (row.gender as Member["gender"]) || "other",
        payday: (row.payday as number) ?? 10,
      }
    })
  } catch (e) {
    console.warn("拉取云端成员失败:", e)
    return []
  }
}

export async function pushMembers(members: Member[], roomId: string): Promise<boolean> {
  if (!supabase || members.length === 0) return false
  try {
    const rows = members.map((m) => ({
      id: m.id,
      room_id: roomId,
      name: m.name,
      avatar: m.avatar,
      gender: m.gender,
      payday: m.payday,
    }))
    await runSupabaseVoid(() =>
      supabase!.from("members").upsert(rows, { onConflict: "room_id,id" })
    )
    return true
  } catch (e) {
    console.warn("推送成员到云端失败:", e)
    return false
  }
}

// ===== 导入批次同步 =====

export async function pullImportBatches(roomId: string): Promise<ImportBatch[]> {
  if (!supabase) return []
  try {
    const data = await runSupabase(() =>
      supabase!
        .from("import_batches")
        .select("*")
        .eq("room_id", roomId)
        .order("time", { ascending: false })
    )
    return (data || []).map((b) => {
      const row = b as Record<string, unknown>
      const status = row.status as ImportBatch["status"] | undefined
      return {
        ids: row.ids as string[],
        source: row.source as ImportBatch["source"],
        recorder: row.recorder as string,
        count: row.count as number,
        time: row.time as string,
        status: status === "reverted" ? "reverted" : "active",
      }
    })
  } catch (e) {
    console.warn("拉取云端导入批次失败:", e)
    return []
  }
}

export async function pushImportBatches(batches: ImportBatch[], roomId: string): Promise<boolean> {
  if (!supabase || batches.length === 0) return false
  try {
    const rows = batches.map((b) => ({
      room_id: roomId,
      ids: b.ids,
      source: b.source,
      recorder: b.recorder,
      count: b.count,
      time: b.time,
      status: b.status || "active",
    }))
    await runSupabaseVoid(() =>
      supabase!.from("import_batches").upsert(rows, { onConflict: "room_id,time" })
    )
    return true
  } catch (e) {
    console.warn("推送导入批次到云端失败:", e)
    throw e
  }
}

// ===== 房间管理 =====

function emitCloudError(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ledger-cloud-error", { detail: message }))
  }
}

/** 验证房号是否存在；网络/超时错误向上抛出，供 RoomSetup 展示 */
export async function validateRoom(roomId: string): Promise<boolean> {
  if (!supabase) {
    return getLocalRooms().includes(roomId)
  }
  const data = await runSupabase(() =>
    supabase!.from("couples").select("room_id").eq("room_id", roomId).maybeSingle()
  )
  return !!data
}

/** 创建新房间，返回房号 */
export async function createRoom(): Promise<string> {
  if (!supabase) {
    const generateCode = () => String(Math.floor(1000 + Math.random() * 9000))
    const existing = getLocalRooms()
    let code = generateCode()
    let attempts = 0
    while (attempts < 20) {
      if (!existing.includes(code)) {
        saveLocalRoom(code)
        console.log("[createRoom] 本地模式创建房号:", code)
        return code
      }
      code = generateCode()
      attempts++
    }
    console.warn("[createRoom] 本地模式生成房号失败，已达最大尝试次数")
    return ""
  }
  const generateCode = () => String(Math.floor(1000 + Math.random() * 9000))
  const roomId = generateCode()
  const today = new Date().toISOString().slice(0, 10)
  void supabase
    .from("couples")
    .insert({ room_id: roomId, start_date: today })
    .then(({ error }) => {
      if (error) {
        console.warn("[createRoom] background insert failed:", error)
        emitCloudError("账本创建同步失败，请检查网络后重试")
      }
    })
  return roomId
}

// ===== 全量同步：启动时拉取云端数据合并到本地 =====

export async function fullPull(roomId: string): Promise<Partial<AppState>> {
  if (!supabase) return {}
  const [txns, goals, members, batches, coupleRow] = await Promise.all([
    pullTransactions(roomId),
    pullGoals(roomId),
    pullMembers(roomId),
    pullImportBatches(roomId),
    runSupabase(() =>
      supabase!.from("couples").select("start_date").eq("room_id", roomId).maybeSingle()
    ),
  ])
  const partial: Partial<AppState> = {
    transactions: txns,
    goals,
    members: members.length > 0 ? members : undefined,
    importBatches: batches,
  }
  const startDate = (coupleRow as { start_date?: string } | null)?.start_date
  if (startDate) partial.startDate = startDate
  return partial
}

// ===== 全量推送：把本地状态推送到云端 =====

export async function fullPush(state: AppState, roomId: string): Promise<boolean> {
  if (!supabase) return false
  try {
    await Promise.all([
      pushTransactions(state.transactions, roomId),
      pushGoals(state.goals, roomId),
      pushMembers(state.members, roomId),
      pushImportBatches(state.importBatches, roomId),
      runSupabaseVoid(() =>
        supabase!.from("couples").upsert(
          { room_id: roomId, start_date: state.startDate || "" },
          { onConflict: "room_id" }
        )
      ),
    ])
    return true
  } catch {
    return false
  }
}
