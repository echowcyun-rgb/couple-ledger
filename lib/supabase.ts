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

// ===== 通用超时包装 =====
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("云同步超时")), ms)),
  ])
}

// ===== 交易记录同步 =====

export async function pullTransactions(): Promise<Transaction[]> {
  if (!supabase) return []
  try {
    const { data, error } = await withTimeout(
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(500)
    )
    if (error) throw error
    return data || []
  } catch (e) {
    console.warn("拉取云端交易记录失败:", e)
    return []
  }
}

export async function pushTransaction(tx: Transaction): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await withTimeout(
      supabase.from("transactions").upsert(tx, { onConflict: "id" })
    )
    if (error) throw error
    return true
  } catch (e) {
    console.warn("推送交易记录到云端失败:", e)
    return false
  }
}

export async function pushTransactions(txns: Transaction[]): Promise<boolean> {
  if (!supabase || txns.length === 0) return false
  try {
    const { error } = await withTimeout(
      supabase.from("transactions").upsert(txns, { onConflict: "id" })
    )
    if (error) throw error
    return true
  } catch (e) {
    console.warn("批量推送交易记录失败:", e)
    return false
  }
}

export async function deleteCloudTransaction(id: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await withTimeout(
      supabase.from("transactions").delete().eq("id", id)
    )
    if (error) throw error
    return true
  } catch (e) {
    console.warn("删除云端交易记录失败:", e)
    return false
  }
}

// ===== 存钱目标同步 =====

export async function pullGoals(): Promise<Goal[]> {
  if (!supabase) return []
  try {
    const { data, error } = await withTimeout(
      supabase.from("goals").select("*").order("id", { ascending: true })
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
    }))
  } catch (e) {
    console.warn("拉取云端目标失败:", e)
    return []
  }
}

export async function pushGoals(goals: Goal[]): Promise<boolean> {
  if (!supabase || goals.length === 0) return false
  try {
    // 删除云端所有目标，再批量插入（简化同步逻辑）
    // 因为 Goal 有 contributions/history 这种嵌套 JSON，upsert 容易冲突
    const { error: delErr } = await withTimeout(
      supabase.from("goals").delete().neq("id", 0)
    )
    if (delErr) throw delErr

    const rows = goals.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji || "★",
      current: g.current ?? 0,
      target: g.target,
      contributions: g.contributions,
      history: g.history,
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

export async function pullMembers(): Promise<Member[]> {
  if (!supabase) return []
  try {
    const { data, error } = await withTimeout(
      supabase.from("members").select("*")
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

export async function pushMembers(members: Member[]): Promise<boolean> {
  if (!supabase || members.length === 0) return false
  try {
    const { error: delErr } = await withTimeout(
      supabase.from("members").delete().neq("id", "")
    )
    if (delErr) throw delErr
    const { error: insErr } = await withTimeout(
      supabase.from("members").insert(members)
    )
    if (insErr) throw insErr
    return true
  } catch (e) {
    console.warn("推送成员到云端失败:", e)
    return false
  }
}

// ===== 导入批次同步 =====

export async function pullImportBatches(): Promise<ImportBatch[]> {
  if (!supabase) return []
  try {
    const { data, error } = await withTimeout(
      supabase.from("import_batches").select("*").order("time", { ascending: false })
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

export async function pushImportBatches(batches: ImportBatch[]): Promise<boolean> {
  if (!supabase || batches.length === 0) return false
  try {
    const { error: delErr } = await withTimeout(
      supabase.from("import_batches").delete().neq("id", 0)
    )
    if (delErr) throw delErr
    const { error: insErr } = await withTimeout(
      supabase.from("import_batches").insert(batches.map((b) => ({
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

// ===== 全量同步：启动时拉取云端数据合并到本地 =====

export async function fullPull(): Promise<Partial<AppState>> {
  if (!supabase) return {}
  const [txns, goals, members, batches] = await Promise.all([
    pullTransactions(),
    pullGoals(),
    pullMembers(),
    pullImportBatches(),
  ])
  return {
    transactions: txns,
    goals,
    members: members.length > 0 ? members : undefined, // 本地优先
    importBatches: batches,
  }
}

// ===== 全量推送：把本地状态推送到云端 =====

export async function fullPush(state: AppState): Promise<boolean> {
  if (!supabase) return false
  try {
    await Promise.all([
      pushTransactions(state.transactions),
      pushGoals(state.goals),
      pushMembers(state.members),
      pushImportBatches(state.importBatches),
    ])
    return true
  } catch {
    return false
  }
}
