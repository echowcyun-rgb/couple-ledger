/**
 * Supabase 客户端 + 云同步工具
 * 策略：写入先写 localStorage（即时响应），后台异步推云端
 * 读取优先读本地，云只用来合并
 */
import { createClient } from "@supabase/supabase-js"
import type { Transaction, Goal, Member, ImportBatch, AppState } from "./types"
import { loadState, saveState } from "./storage"

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

// ===== 通用超时包装 =====
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("云同步超时")), ms)),
  ])
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
    const { data, error } = await withTimeout(
      supabase.from("transactions").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(500)
    )
    if (error) throw error
    return (data || []).map((r) => rowToTx(r as Record<string, unknown>))
  } catch (e) {
    console.warn("拉取云端交易记录失败:", e)
    throw e
  }
}

export async function pushTransaction(tx: Transaction, roomId: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await withTimeout(
      supabase.from("transactions").upsert(txToRow(tx, roomId), { onConflict: "id" })
    )
    if (error) throw error
    return true
  } catch (e) {
    console.warn("推送交易记录到云端失败:", e)
    throw e
  }
}

export async function pushTransactions(txns: Transaction[], roomId: string): Promise<boolean> {
  if (!supabase || txns.length === 0) return false
  try {
    const { error } = await withTimeout(
      supabase.from("transactions").upsert(txns.map((t) => txToRow(t, roomId)), { onConflict: "id" })
    )
    if (error) throw error
    return true
  } catch (e) {
    console.warn("批量推送交易记录失败:", e)
    throw e
  }
}

export async function deleteCloudTransaction(id: string, roomId: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await withTimeout(
      supabase.from("transactions").delete().eq("id", id).eq("room_id", roomId)
    )
    if (error) throw error
    return true
  } catch (e) {
    console.warn("删除云端交易记录失败:", e)
    return false
  }
}

// ===== 存钱目标同步 =====

export async function pullGoals(roomId: string): Promise<Goal[]> {
  if (!supabase) return []
  try {
    const { data, error } = await withTimeout(
      supabase.from("goals").select("*").eq("room_id", roomId).order("id", { ascending: true })
    )
    if (error) throw error
    return (data || []).map((g: Record<string, unknown>) => ({
      id: g.id as number,
      name: g.name as string,
      emoji: (g.emoji as string) || "★",
      current: (g.current as number) ?? 0,
      target: g.target as number,
      contributions: (g.contributions as Record<string, number>) || {},
      history: (g.history as Goal["history"]) || [],
      deadline: (g.deadline as string) || "",
      completedAt: (g.completedAt as string) || undefined,
    }))
  } catch (e) {
    console.warn("拉取云端目标失败:", e)
    return []
  }
}

export async function pushGoals(goals: Goal[], roomId: string): Promise<boolean> {
  if (!supabase || goals.length === 0) return false
  try {
    // 删除云端所有目标，再批量插入（简化同步逻辑）
    // 因为 Goal 有 contributions/history 这种嵌套 JSON，upsert 容易冲突
    const { error: delErr } = await withTimeout(
      supabase.from("goals").delete().eq("room_id", roomId)
    )
    if (delErr) throw delErr

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
    const { error: insErr } = await withTimeout(
      supabase.from("goals").insert(rows)
    )
    if (insErr) throw insErr
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
    const { data, error } = await withTimeout(
      supabase.from("members").select("*").eq("room_id", roomId)
    )
    if (error) throw error
    return (data || []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: m.name as string,
      avatar: (m.avatar as string) || "",
      gender: (m.gender as Member["gender"]) || "other",
      payday: (m.payday as number) ?? 10,
    }))
  } catch (e) {
    console.warn("拉取云端成员失败:", e)
    return []
  }
}

export async function pushMembers(members: Member[], roomId: string): Promise<boolean> {
  if (!supabase || members.length === 0) return false
  try {
    const { error: delErr } = await withTimeout(
      supabase.from("members").delete().eq("room_id", roomId)
    )
    if (delErr) throw delErr
    const { error: insErr } = await withTimeout(
      supabase.from("members").insert(members.map(m => ({ ...m, room_id: roomId })))
    )
    if (insErr) throw insErr
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
    const { data, error } = await withTimeout(
      supabase.from("import_batches").select("*").eq("room_id", roomId).order("time", { ascending: false })
    )
    if (error) throw error
    return (data || []).map((b: Record<string, unknown>) => ({
      ids: b.ids as string[],
      source: b.source as ImportBatch["source"],
      recorder: b.recorder as string,
      count: b.count as number,
      time: b.time as string,
    }))
  } catch (e) {
    console.warn("拉取云端导入批次失败:", e)
    return []
  }
}

export async function pushImportBatches(batches: ImportBatch[], roomId: string): Promise<boolean> {
  if (!supabase || batches.length === 0) return false
  try {
    const { error: delErr } = await withTimeout(
      supabase.from("import_batches").delete().eq("room_id", roomId)
    )
    if (delErr) throw delErr
    const { error: insErr } = await withTimeout(
      supabase.from("import_batches").insert(batches.map((b) => ({
        room_id: roomId,
        ids: b.ids,
        source: b.source,
        recorder: b.recorder,
        count: b.count,
        time: b.time,
      })))
    )
    if (insErr) throw insErr
    return true
  } catch (e) {
    console.warn("推送导入批次到云端失败:", e)
    return false
  }
}

// ===== 房间管理 =====

/** 验证房号是否存在 */
export async function validateRoom(roomId: string): Promise<boolean> {
  // 本地模式 fallback：检查 localStorage 中的房号列表
  if (!supabase) {
    return getLocalRooms().includes(roomId)
  }
  try {
    const { data, error } = await supabase
      .from("couples")
      .select("room_id")
      .eq("room_id", roomId)
      .maybeSingle()
    if (error) throw error
    return !!data
  } catch {
    return false
  }
}

/** 创建新房间，返回房号 */
export async function createRoom(): Promise<string> {
  // 本地模式 fallback：生成随机4位房号存入 localStorage
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
  // 生成4位随机数
  const generateCode = () => String(Math.floor(1000 + Math.random() * 9000))
  let roomId = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const exists = await validateRoom(roomId)
    if (!exists) {
      const { error } = await supabase.from("couples").insert({ room_id: roomId })
      if (!error) return roomId
    }
    roomId = generateCode()
    attempts++
  }
  return ""
}

// ===== 全量同步：启动时拉取云端数据合并到本地 =====

export async function fullPull(roomId: string): Promise<Partial<AppState>> {
  if (!supabase) return {}
  const [txns, goals, members, batches] = await Promise.all([
    pullTransactions(roomId),
    pullGoals(roomId),
    pullMembers(roomId),
    pullImportBatches(roomId),
  ])
  return {
    transactions: txns,
    goals,
    members: members.length > 0 ? members : undefined, // 本地优先
    importBatches: batches,
  }
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
    ])
    return true
  } catch {
    return false
  }
}
