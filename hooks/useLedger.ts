"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SYS_AVATARS_FEMALE, SYS_AVATARS_MALE, INIT_CATS } from "@/lib/constants"
import { coupleDaysFrom } from "@/lib/format"
import { applySaveToGoal } from "@/lib/goals"
import { loadState, saveState, syncFromCloud, cancelPendingSync, resetLocalStateForRoom, flushStateSync, flushAndPushState, reportCloudSyncFailure, resetCloudSyncFailures, isRoomDeletedError } from "@/lib/storage"
import { deleteCloudTransaction, deleteCloudTransactions, pushImportBatches, pushTransactions, useCloud } from "@/lib/supabase"
import { withRoomLock } from "@/lib/sync-lock"
import {
  getInTrendData,
  getExpensePie,
  getFinanceTrendData,
  getMemberSummary,
  getMonthSummary,
  getOutTrendData,
  getStructureStats,
  getTopCategories,
  groupByDate,
} from "@/lib/stats"
import {
  buildReviewHabitAnalysis,
  currentPlanKey,
  loadReviewPlan,
  saveReviewPlan,
} from "@/lib/review"
import {
  detectSource,
  GENERIC_BILL_IMPORT_HINT,
  parseAlipayCSV,
  parseGenericCsv,
  parseGenericXlsx,
  parseWechatCSV,
  type ImportResult,
} from "@/lib/importers"
import { decodeBillCsv } from "@/lib/csv-decode"
import { loadXlsx } from "@/lib/xlsx"
import type {
  AppState,
  Gender,
  Goal,
  GoalHistoryEntry,
  ImportBatch,
  Member,
  Tab,
  ThemeKey,
  Transaction,
  TxType,
} from "@/lib/types"

const IMPORTED_FILES_KEY = "imported-files"

/** 以活跃导入批次的 fileFingerprint 为准，同步 localStorage 去重列表 */
function syncImportedFilesFromBatches(batches: ImportBatch[]): void {
  if (typeof window === "undefined") return
  try {
    const fps = batches
      .filter((b) => b.status !== "reverted" && b.fileFingerprint)
      .map((b) => b.fileFingerprint as string)
    localStorage.setItem(IMPORTED_FILES_KEY, JSON.stringify(fps.slice(-50)))
  } catch {
    // ignore
  }
}

/** 云同步后合并 importBatches，保留内存中的 fileFingerprint 及尚未落盘的新批次 */
function mergeImportBatchesAfterSync(
  fromStorage: ImportBatch[],
  fromPrev: ImportBatch[]
): ImportBatch[] {
  const storageTimes = new Set(fromStorage.map((b) => b.time))
  const prevFpByTime = new Map(
    fromPrev.filter((b) => b.fileFingerprint).map((b) => [b.time, b.fileFingerprint!])
  )

  const merged = fromStorage.map((b) => {
    const fp = prevFpByTime.get(b.time) ?? b.fileFingerprint
    return fp ? { ...b, fileFingerprint: fp } : b
  })

  for (const b of fromPrev) {
    if (!storageTimes.has(b.time)) merged.push(b)
  }

  return merged.sort((a, b) => b.time.localeCompare(a.time))
}

function mergeStateAfterCloudSync(prev: AppState, merged: AppState): AppState {
  const localUnsynced = prev.transactions.filter((t) => !t.synced)
  const mergedMap = new Map(merged.transactions.map((t) => [t.id, t]))
  for (const t of localUnsynced) {
    if (!mergedMap.has(t.id)) mergedMap.set(t.id, t)
  }

  return {
    ...merged,
    transactions: Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt),
    importBatches: mergeImportBatchesAfterSync(merged.importBatches, prev.importBatches),
  }
}

function generateCelebrateMessages(amount: number, current: number, target: number): string {
  const isComplete = current >= target

  const bigAmountMsgs = [
    `哇！¥${amount} 这笔太给力了，离目标又近一大步 🚀`,
    `¥${amount} 入账！这存钱速度，今年稳了 💪`,
    `大额存入 ¥${amount}！你这是要提前完成目标啊 🎯`,
  ]
  const midAmountMsgs = [
    `又存了 ¥${amount}，积少成多，未来可期 ✨`,
    `¥${amount} 到账！每一笔都在为梦想添砖加瓦 🧱`,
    `稳扎稳打 ¥${amount}，这节奏很可以 📈`,
  ]
  const smallAmountMsgs = [
    `¥${amount} 也是爱！坚持就是胜利 🌱`,
    `小钱也是钱，¥${amount} 已存入，继续加油 💰`,
    `哪怕 ¥${amount}，也在向目标前进 🐾`,
  ]
  const completeMsgs = [
    `🎉 恭喜！「目标」已达成！太棒了！`,
    `🏆 目标完成！你的坚持终于开花结果！`,
    `🎊 100% 达成！这一刻值得庆祝！开瓶香槟吧！`,
  ]

  if (isComplete) return completeMsgs[Math.floor(Math.random() * completeMsgs.length)]
  if (amount >= 1000) return bigAmountMsgs[Math.floor(Math.random() * bigAmountMsgs.length)]
  if (amount >= 100) return midAmountMsgs[Math.floor(Math.random() * midAmountMsgs.length)]
  return smallAmountMsgs[Math.floor(Math.random() * smallAmountMsgs.length)]
}

export function useLedger() {
  const [hydrated, setHydrated] = useState(false)
  const [cloudSynced, setCloudSynced] = useState(() => !useCloud)
  const [tab, setTab] = useState<Tab>("home")
  const [state, setState] = useState<AppState>(() => loadState())

  const [barWidth, setBarWidth] = useState(0)
  const [toastMsg, setToastMsg] = useState("")
  const [toastShow, setToastShow] = useState(false)

  const [goalOpen, setGoalOpen] = useState(false)
  const [newGoalName, setNewGoalName] = useState("")
  const [newGoalTarget, setNewGoalTarget] = useState("")
  const [newGoalEmoji, setNewGoalEmoji] = useState("★")
  const [newGoalDeadline, setNewGoalDeadline] = useState("")
  const [updateGoalId, setUpdateGoalId] = useState<number | null>(null)
  const [updateMode, setUpdateMode] = useState<"amount" | "pct" | "finance">("amount")
  const [updateAmount, setUpdateAmount] = useState("")
  const [updateNote, setUpdateNote] = useState("")
  const [updateMemberId, setUpdateMemberId] = useState("")

  const [editGoalOpen, setEditGoalOpen] = useState(false)
  const [editGoalId, setEditGoalId] = useState<number | null>(null)
  const [editGoalEmoji, setEditGoalEmoji] = useState("")
  const [editGoalName, setEditGoalName] = useState("")
  const [editGoalTarget, setEditGoalTarget] = useState("")
  const [editGoalDeadline, setEditGoalDeadline] = useState("")

  const [catMgmtOpen, setCatMgmtOpen] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState("")
  const [newCatGlyph, setNewCatGlyph] = useState("")
  const [newCatType, setNewCatType] = useState<TxType>("out")

  const [flowFilter, setFlowFilter] = useState<"all" | string>("all")
  const [flowDateSheetOpen, setFlowDateSheetOpen] = useState(false)
  const [flowDateMode, setFlowDateMode] = useState<"month" | "day" | "range">("month")
  const [flowRangeStart, setFlowRangeStart] = useState("")
  const [flowRangeEnd, setFlowRangeEnd] = useState("")
  const [flowDate, setFlowDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [recordOpen, setRecordOpen] = useState(false)
  const [recType, setRecType] = useState<TxType>("out")
  const [recAmount, setRecAmount] = useState("0")
  const [recCat, setRecCat] = useState("food")
  const [recMemberId, setRecMemberId] = useState<string>("")
  const [recNote, setRecNote] = useState("")
  const [recDate, setRecDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [editTxId, setEditTxId] = useState<string | null>(null)

  const [memberPageOpen, setMemberPageOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editName, setEditName] = useState("")
  const [editGender, setEditGender] = useState<Gender>("female")
  const [editPayday, setEditPayday] = useState(10)
  const [editAvatar, setEditAvatar] = useState("")

  const [reviewYear, setReviewYear] = useState(() => new Date().getFullYear())
  const [reviewMonth, setReviewMonth] = useState(() => new Date().getMonth() + 1)
  const [planBudgetTarget, setPlanBudgetTarget] = useState("")
  const [planSavingsTarget, setPlanSavingsTarget] = useState("")

  const [coupleBgAdjustOpen, setCoupleBgAdjustOpen] = useState(false)
  const [pendingCoupleBgUrl, setPendingCoupleBgUrl] = useState("")

  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
  const [importPreviewSource, setImportPreviewSource] = useState<ImportBatch["source"]>("generic")
  const [importPreviewTransactions, setImportPreviewTransactions] = useState<Transaction[]>([])
  const [importPreviewRecorder, setImportPreviewRecorder] = useState("")
  const [importPreviewFileFingerprint, setImportPreviewFileFingerprint] = useState("")

  const [revertImportOpen, setRevertImportOpen] = useState(false)
  const [revertImportLoading, setRevertImportLoading] = useState(false)
  const [importParsing, setImportParsing] = useState(false)

  const [celebrateOpen, setCelebrateOpen] = useState(false)
  const [celebrateMsg, setCelebrateMsg] = useState("")

  const fileRef = useRef<HTMLInputElement>(null)
  const pendingImportMemberRef = useRef<string>("")
  const avatarRef = useRef<HTMLInputElement>(null)
  const coupleBgRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 初始云同步完成前禁止云端推送，避免空数据覆盖云端 */
  const allowPushRef = useRef(false)
  const syncGenerationRef = useRef(0)

  const { members, goals, activeGoalId, cats, theme, coupleBg, startDate, remindOn, transactions, importBatches } = state

  useEffect(() => {
    try {
      const loaded = loadState()
      const savedRoomId = localStorage.getItem("couple-room-id") || ""
      if (savedRoomId && loaded.roomId && loaded.roomId !== savedRoomId) {
        setState(resetLocalStateForRoom(savedRoomId))
      } else {
        setState(loaded)
      }
    } catch (e) {
      console.warn("[useLedger] 读取本地数据失败:", e)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    setState((s) => {
      if (s.cats.some((c) => c.key === "finance")) return s
      const financeCat = INIT_CATS.find((c) => c.key === "finance")
      if (!financeCat) return s
      return { ...s, cats: [...s.cats, financeCat] }
    })
  }, [])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 1800)
  }, [])

  useEffect(() => {
    const onCloudError = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail
      toast(msg || "云同步失败")
    }
    window.addEventListener("ledger-cloud-error", onCloudError)
    return () => window.removeEventListener("ledger-cloud-error", onCloudError)
  }, [toast])

  // 后台云同步：不阻塞主界面，同步完成后再允许 saveState
  useEffect(() => {
    if (!hydrated) return
    if (!useCloud) {
      allowPushRef.current = true
      setCloudSynced(true)
      return
    }
    const roomId = typeof window !== "undefined" ? localStorage.getItem("couple-room-id") : null
    if (!roomId) {
      allowPushRef.current = true
      setCloudSynced(true)
      return
    }

    allowPushRef.current = false
    const gen = ++syncGenerationRef.current

    syncFromCloud()
      .then((count) => {
        if (gen !== syncGenerationRef.current) return
        resetCloudSyncFailures()
        // 合并云端数据但保留本地未同步的修改（如刚导入但尚未推送的交易）
        setState((prev) => mergeStateAfterCloudSync(prev, loadState()))
        if (count > 0) toast(`☁️ 已同步 ${count} 条云端记录`)
      })
      .catch((e: unknown) => {
        if (gen !== syncGenerationRef.current) return
        if (isRoomDeletedError(e)) {
          toast("房间已不存在，请重新创建或加入")
          setTimeout(() => window.location.reload(), 1600)
          return
        }
        const message = e instanceof Error ? e.message : String(e)
        reportCloudSyncFailure(message || "请检查网络")
      })
      .finally(() => {
        if (gen !== syncGenerationRef.current) return
        allowPushRef.current = true
        setCloudSynced(true)
        saveState(loadState(), { push: false })
      })
  }, [hydrated, toast])

  useEffect(() => {
    if (!hydrated) return
    saveState(state, { push: allowPushRef.current })
  }, [state, hydrated])

  // 定期 + 页面可见性变化时拉取云端数据（确保其他设备导入的数据同步到当前界面）
  useEffect(() => {
    if (!hydrated || !useCloud) return
    const roomId = typeof window !== "undefined" ? localStorage.getItem("couple-room-id") : null
    if (!roomId) return

    let cancelled = false

    const doPull = () => {
      if (cancelled) return
      if (!allowPushRef.current) return // 初始同步未完成，跳过
      const gen = ++syncGenerationRef.current
      syncFromCloud()
        .then((count) => {
          if (cancelled || gen !== syncGenerationRef.current) return
          resetCloudSyncFailures()
          // 合并云端数据但不覆盖本地未同步的修改
          setState((prev) => mergeStateAfterCloudSync(prev, loadState()))
          if (count > 0) toast(`☁️ 已同步 ${count} 条云端记录`)
        })
        .catch((e: unknown) => {
          if (cancelled || gen !== syncGenerationRef.current) return
          if (isRoomDeletedError(e)) return
          const message = e instanceof Error ? e.message : String(e)
          reportCloudSyncFailure(message || "请检查网络")
        })
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") doPull()
    }

    const interval = setInterval(doPull, 30_000)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [hydrated, toast])

  const enterRoom = useCallback(async (roomId: string, options?: { fresh?: boolean }) => {
    syncGenerationRef.current++
    const gen = syncGenerationRef.current
    cancelPendingSync()
    allowPushRef.current = false
    setCloudSynced(false)

    let fresh = options?.fresh ?? false
    const local = loadState()
    if (!fresh && local.roomId && local.roomId !== roomId) {
      fresh = true
    }

    localStorage.setItem("couple-room-id", roomId)

    if (fresh) {
      setState(resetLocalStateForRoom(roomId))
    } else {
      const next = { ...loadState(), roomId }
      flushStateSync(next)
      setState(next)
    }

    if (!useCloud) {
      allowPushRef.current = true
      setCloudSynced(true)
      return
    }

    try {
      const count = await syncFromCloud()
      if (gen !== syncGenerationRef.current) return
      resetCloudSyncFailures()
      // 合并云端数据但保留本地未同步的修改
      setState((prev) => mergeStateAfterCloudSync(prev, loadState()))
      if (count > 0) toast(`☁️ 已同步 ${count} 条云端记录`)
    } catch (e: unknown) {
      if (gen !== syncGenerationRef.current) return
      const message = e instanceof Error ? e.message : String(e)
      reportCloudSyncFailure(message || "请检查网络")
    } finally {
      if (gen === syncGenerationRef.current) {
        allowPushRef.current = true
        setCloudSynced(true)
        saveState(loadState(), { push: false })
      }
    }
  }, [toast])

  const leaveRoom = useCallback(() => {
    syncGenerationRef.current++
    cancelPendingSync()
    allowPushRef.current = false
    void flushAndPushState(state).finally(() => {
      localStorage.removeItem("couple-room-id")
    })
    setCloudSynced(true)
  }, [state])

  useEffect(() => {
    if (!recMemberId && members.length > 0) setRecMemberId(members[0].id)
    if (members.length === 0) setRecMemberId("")
  }, [members, recMemberId])

  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? goals[0] ?? null
  const pct = activeGoal ? Math.min(100, Math.round((activeGoal.current / activeGoal.target) * 100)) : 0
  const updateGoal = goals.find((g) => g.id === updateGoalId) ?? null

  const activeGoals = useMemo(() => goals.filter(g => g.current < g.target), [goals])
  const completedGoals = useMemo(() => goals.filter(g => g.current >= g.target), [goals])

  // 自动标记已完成目标
  useEffect(() => {
    const newlyCompleted = goals.filter(g => g.current >= g.target && !g.completedAt)
    if (newlyCompleted.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10)
      setState(s => ({
        ...s,
        goals: s.goals.map(g =>
          g.current >= g.target && !g.completedAt ? { ...g, completedAt: todayStr } : g
        ),
      }))
    }
  }, [goals])

  useEffect(() => {
    setBarWidth(0)
    const t = setTimeout(() => setBarWidth(pct), 250)
    return () => clearTimeout(t)
  }, [pct])

  const now = new Date()
  const today = now.getDate()
  const currentMonth = now.getMonth() + 1
  const payday = members[0]?.payday ?? 10
  const coupleDays = coupleDaysFrom(startDate)

  const monthSummary = useMemo(
    () => getMonthSummary(transactions, now.getFullYear(), currentMonth),
    [transactions, now.getFullYear(), currentMonth]
  )

  const memberSummaries = useMemo(
    () => getMemberSummary(transactions, members, now.getFullYear(), currentMonth),
    [transactions, members, now.getFullYear(), currentMonth]
  )

  const reviewSummary = useMemo(
    () => getMonthSummary(transactions, reviewYear, reviewMonth),
    [transactions, reviewYear, reviewMonth]
  )

  const filteredFlow = useMemo(
    () =>
      groupByDate(
        transactions.filter((t) => {
          if (flowDateMode === "day") return t.date === flowDate
          if (flowDateMode === "range") return t.date >= flowRangeStart && t.date <= flowRangeEnd
          const d = new Date(t.date + "T12:00:00")
          const [y, m] = flowDate.split("-").map(Number)
          return d.getFullYear() === y && d.getMonth() + 1 === m
        }),
        cats,
        members,
        flowFilter === "all" ? undefined : flowFilter
      ),
    [transactions, cats, members, flowFilter, flowDate, flowDateMode, flowRangeStart, flowRangeEnd]
  )

  const revertableBatches = useMemo(
    () =>
      importBatches
        .filter((b) => b.status !== "reverted")
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, 3),
    [importBatches]
  )

  const flowMonthSummary = useMemo(
    () => getMonthSummary(transactions, now.getFullYear(), currentMonth),
    [transactions, now.getFullYear(), currentMonth]
  )

  const expensePie = useMemo(
    () => getExpensePie(transactions, cats, reviewYear, reviewMonth, "month"),
    [transactions, cats, reviewYear, reviewMonth]
  )

  const structureStats = useMemo(
    () => getStructureStats(transactions, cats, reviewYear, reviewMonth),
    [transactions, cats, reviewYear, reviewMonth]
  )

  const habitAnalysis = useMemo(
    () => buildReviewHabitAnalysis(transactions, cats, reviewYear, reviewMonth),
    [transactions, cats, reviewYear, reviewMonth]
  )

  const reviewPlanKey = useMemo(() => {
    const prevMonth = reviewMonth === 1 ? 12 : reviewMonth - 1
    const prevYear = reviewMonth === 1 ? reviewYear - 1 : reviewYear
    return currentPlanKey(prevYear, prevMonth)
  }, [reviewYear, reviewMonth])
  const reviewPlan = useMemo(() => loadReviewPlan(reviewPlanKey), [reviewPlanKey])

  const patch = useCallback((partial: Partial<AppState>) => {
    setState((s) => ({ ...s, ...partial }))
  }, [])

  const switchTab = useCallback((tb: Tab) => {
    setTab(tb)
    window.scrollTo({ top: 0 })
  }, [])

  const tapKey = useCallback((k: string) => {
    setRecAmount((prev) => {
      if (k === "del") return prev.length <= 1 ? "0" : prev.slice(0, -1)
      if (k === ".") return prev.includes(".") ? prev : prev + "."
      if (prev === "0" && k !== ".") return k
      if (prev.replace(".", "").length >= 7) return prev
      return prev + k
    })
  }, [])

  const openRecord = useCallback(() => {
    setEditTxId(null)
    setRecAmount("0")
    setRecType("out")
    setRecCat("food")
    setRecMemberId(members[0]?.id ?? "")
    setRecNote("")
    setRecDate(new Date().toISOString().slice(0, 10))
    setRecordOpen(true)
  }, [members])

  const openEditRecord = useCallback((id: string) => {
    const tx = transactions.find((t) => t.id === id)
    if (!tx) return
    setEditTxId(tx.id)
    setRecType(tx.type)
    setRecAmount(String(tx.amount))
    setRecCat(tx.categoryKey)
    setRecMemberId(tx.memberId)
    setRecNote(tx.note)
    setRecDate(tx.date)
    setRecordOpen(true)
  }, [transactions])

  const saveRecord = useCallback(() => {
    const amount = parseFloat(recAmount)
    if (!amount || amount <= 0) {
      toast("请输入有效金额")
      return
    }
    if (!recMemberId) {
      toast("请选择成员")
      return
    }
    if (editTxId) {
      setState((s) => ({
        ...s,
        transactions: s.transactions.map((t) =>
          t.id === editTxId
            ? {
                ...t,
                date: recDate,
                type: recType,
                amount,
                categoryKey: recCat,
                memberId: recMemberId,
                note: recNote.trim(),
              }
            : t
        ),
      }))
      setEditTxId(null)
      setRecordOpen(false)
      toast("已更新账单")
      return
    }
    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      date: recDate,
      type: recType,
      amount,
      categoryKey: recCat,
      memberId: recMemberId,
      note: recNote.trim(),
      createdAt: Date.now(),
    }
    setState((s) => {
      let nextGoals = s.goals
      if (recType === "save") {
        nextGoals = applySaveToGoal(s.goals, s.activeGoalId, amount, recMemberId, recNote.trim())
      }
      return {
        ...s,
        transactions: [tx, ...s.transactions],
        goals: nextGoals,
      }
    })
    const label = recType === "in" ? "收入" : recType === "save" ? "存钱" : "支出"
    setRecordOpen(false)
    toast(`已记一笔${label} ¥${recAmount}`)
  }, [recAmount, recMemberId, recType, recCat, recNote, recDate, editTxId, toast])

  const deleteTransaction = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((tx) => tx.id !== id),
    }))
    toast("已删除账单")

    const roomId =
      state.roomId ||
      (typeof window !== "undefined" ? localStorage.getItem("couple-room-id") || "" : "")

    if (useCloud && roomId) {
      withRoomLock(roomId, () => deleteCloudTransaction(id, roomId)).catch(() => {
        toast("删除已生效，云同步失败，稍后自动重试")
      })
    }
  }, [toast, state.roomId])

  const exportTransactionsXlsx = useCallback(async (memberId?: string) => {
    try {
      const XLSX = await loadXlsx()
      const targetMemberId = memberId || members[0]?.id || ""
      const filtered = targetMemberId
        ? transactions.filter((t) => t.memberId === targetMemberId)
        : transactions
      const memberName = members.find((m) => m.id === targetMemberId)?.name || "全部"
      const rows = filtered.map((t) => ({
        日期: t.date,
        类型: t.type === "out" ? "支出" : t.type === "in" ? "收入" : "存钱",
        金额: t.amount,
        分类: cats.find((c) => c.key === t.categoryKey)?.label || (t.categoryKey || "未分类"),
        经手人: members.find((m) => m.id === t.memberId)?.name || t.memberId,
        备注: t.note || "",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "账单")
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `账单_${memberName}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast("已导出账单 xlsx")
    } catch {
      toast("导出失败，请刷新页面后重试")
    }
  }, [transactions, cats, members, toast])

  const addGoal = useCallback(() => {
    const name = newGoalName.trim()
    const target = parseFloat(newGoalTarget)
    if (!name) { toast("请填写目标名称"); return }
    if (isNaN(target) || target <= 0) { toast("请填写有效的目标金额"); return }
    const id = Date.now()
    const goal: Goal = {
      id,
      name,
      emoji: newGoalEmoji || "★",
      current: 0,
      target,
      contributions: {},
      history: [],
      deadline: newGoalDeadline,
    }
    setState((s) => ({
      ...s,
      goals: [...s.goals, goal],
      activeGoalId: s.activeGoalId ?? id,
    }))
    setNewGoalName("")
    setNewGoalTarget("")
    setNewGoalDeadline("")
    setNewGoalEmoji("★")
    toast(`已新增目标「${name}」`)
  }, [newGoalName, newGoalTarget, newGoalEmoji, newGoalDeadline, toast])

  const removeGoal = useCallback((id: number) => {
    setState((s) => {
      const next = s.goals.filter((x) => x.id !== id)
      return {
        ...s,
        goals: next,
        activeGoalId: id === s.activeGoalId ? (next.length ? next[0].id : null) : s.activeGoalId,
      }
    })
    toast("已删除目标")
  }, [toast])

  const openEditGoal = useCallback((id: number) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return
    setEditGoalId(id)
    setEditGoalEmoji(goal.emoji)
    setEditGoalName(goal.name)
    setEditGoalTarget(String(goal.target))
    setEditGoalDeadline(goal.deadline)
    setEditGoalOpen(true)
  }, [goals])

  const saveEditGoal = useCallback(() => {
    if (editGoalId === null) return
    const name = editGoalName.trim()
    const target = parseFloat(editGoalTarget)
    if (!name) { toast("请填写目标名称"); return }
    if (isNaN(target) || target <= 0) { toast("请填写有效的目标金额"); return }
    setState(s => ({
      ...s,
      goals: s.goals.map(g => g.id === editGoalId ? {
        ...g, name, emoji: editGoalEmoji || "★", target, deadline: editGoalDeadline
      } : g)
    }))
    setEditGoalOpen(false)
    setEditGoalId(null)
    toast("目标已更新")
  }, [editGoalId, editGoalName, editGoalEmoji, editGoalTarget, editGoalDeadline, toast])

  const openUpdateGoal = useCallback((id: number) => {
    setUpdateGoalId(id)
    setUpdateMode("amount")
    setUpdateAmount("")
    setUpdateNote("")
    setUpdateMemberId(members[0]?.id ?? "")
  }, [members])

  const saveUpdateGoal = useCallback(() => {
    if (!updateGoal || updateGoalId === null) return
    if (!updateMemberId) { toast("请选择经手人"); return }
    const todayStr = new Date().toLocaleDateString("zh-CN")
    let newCurrent: number
    let historyAmount: number
    let historyNote: string

    if (updateMode === "pct") {
      const num = Number(updateAmount)
      if (!num || num < 0) { toast("请输入有效金额"); return }
      newCurrent = Math.round(updateGoal.target * (num / 100))
      historyAmount = newCurrent
      historyNote = updateNote || "手动更新"
    } else if (updateMode === "finance") {
      const financeAmount = monthSummary.financeIncome
      if (financeAmount <= 0) { toast("当月暂无理财收入"); return }
      newCurrent = updateGoal.current + financeAmount
      historyAmount = financeAmount
      historyNote = updateNote || "当月理财收入"
    } else {
      const num = Number(updateAmount)
      if (!num || num < 0) { toast("请输入有效金额"); return }
      newCurrent = updateGoal.current + num
      historyAmount = num
      historyNote = updateNote || "存入"
    }

    setState((s) => ({
      ...s,
      goals: s.goals.map((x) =>
        x.id === updateGoalId
          ? {
              ...x,
              current: newCurrent,
              history: [
                { id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, date: todayStr, amount: historyAmount, note: historyNote, memberId: updateMemberId },
                ...x.history,
              ].slice(0, 20),
            }
          : x
      ),
    }))
    setUpdateGoalId(null)
    const msgs = generateCelebrateMessages(historyAmount, newCurrent, updateGoal.target)
    setCelebrateMsg(msgs)
    setCelebrateOpen(true)
  }, [updateGoal, updateGoalId, updateAmount, updateMode, updateNote, updateMemberId, monthSummary.financeIncome, toast])

  const editGoalHistory = useCallback((goalId: number, historyId: string, patchHist: Partial<Pick<GoalHistoryEntry, "amount" | "note">>) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g
        const newHistory = g.history.map((h) => {
          const hid = h.id || `${h.date}_${h.amount}_${h.note}`
          return hid === historyId ? { ...h, ...patchHist, id: h.id || hid } : h
        })
        const newCurrent = newHistory.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
        return { ...g, history: newHistory, current: newCurrent }
      }),
    }))
  }, [])

  const deleteGoalHistory = useCallback((goalId: number, historyId: string) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g
        const newHistory = g.history.filter((h) => {
          const hid = h.id || `${h.date}_${h.amount}_${h.note}`
          return hid !== historyId
        })
        const newCurrent = newHistory.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
        return { ...g, history: newHistory, current: newCurrent }
      }),
    }))
  }, [])

  const addCat = useCallback(() => {
    const label = newCatLabel.trim()
    const glyph = newCatGlyph.trim() || label.slice(0, 1)
    if (!label) { toast("请输入分类名称"); return }
    const key = `custom_${Date.now()}`
    patch({ cats: [...cats, { key, glyph, label, type: newCatType, custom: true }] })
    setNewCatLabel("")
    setNewCatGlyph("")
    toast(`已添加「${label}」分类`)
  }, [newCatLabel, newCatGlyph, newCatType, cats, patch, toast])

  const removeCat = useCallback((key: string) => {
    patch({ cats: cats.filter((x) => x.key !== key) })
    toast("已删除分类")
  }, [cats, patch, toast])

  const openEditMember = useCallback((m: Member) => {
    setEditingMember(m)
    setEditName(m.name)
    setEditGender(m.gender)
    setEditPayday(m.payday)
    setEditAvatar(m.avatar)
  }, [])

  const saveEditMember = useCallback(() => {
    if (!editingMember) return
    if (!editName.trim()) { toast("昵称不能为空"); return }
    patch({
      members: members.map((m) =>
        m.id === editingMember.id
          ? { ...m, name: editName.trim(), gender: editGender, payday: editPayday, avatar: editAvatar }
          : m
      ),
    })
    setEditingMember(null)
    toast("成员信息已保存")
  }, [editingMember, editName, editGender, editPayday, editAvatar, members, patch, toast])

  const addMember = useCallback(() => {
    if (members.length >= 2) {
      toast("最多只能添加 2 名成员哦")
      return
    }
    const id = `m_${Date.now()}`
    const isFirst = members.length === 0
    const defaultName = isFirst ? "我" : "成员2"
    const gender = isFirst ? "female" : "male"
    const avatar = isFirst ? SYS_AVATARS_FEMALE[0] : SYS_AVATARS_MALE[0]
    patch({
      members: [
        ...members,
        { id, name: defaultName, avatar, gender, payday: 10 },
      ],
    })
    toast("已添加新成员")
  }, [members, patch, toast])

  const removeMember = useCallback((id: string) => {
    if (members.length <= 1) { toast("至少保留一位成员"); return }
    patch({ members: members.filter((m) => m.id !== id) })
    toast("已删除成员")
  }, [members, patch, toast])

  const compressImageFile = useCallback(
    (file: File, maxSize: number, quality: number, type: "image/jpeg" | "image/png") =>
      new Promise<string>((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas")
            let w = img.width
            let h = img.height
            if (w > maxSize || h > maxSize) {
              const ratio = Math.min(maxSize / w, maxSize / h)
              w = Math.round(w * ratio)
              h = Math.round(h * ratio)
            }
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              reject(new Error("图片处理失败"))
              return
            }
            ctx.drawImage(img, 0, 0, w, h)
            resolve(type === "image/jpeg" ? canvas.toDataURL(type, quality) : canvas.toDataURL(type))
          } catch (err) {
            reject(err instanceof Error ? err : new Error("图片处理失败"))
          } finally {
            URL.revokeObjectURL(objectUrl)
          }
        }
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          reject(new Error("图片加载失败"))
        }
        img.src = objectUrl
      }),
    []
  )

  const onAvatarFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    ;(async () => {
      try {
        const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg"
        const mime = isJpeg ? "image/jpeg" : "image/png"
        const dataUrl = await compressImageFile(file, 200, 0.85, mime)
        setEditAvatar(dataUrl)
      } catch {
        toast("头像处理失败，请重试")
      } finally {
        e.target.value = ""
      }
    })()
  }, [compressImageFile, toast])

  const onCoupleBgFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    ;(async () => {
      try {
        const url = await compressImageFile(file, 800, 0.6, "image/jpeg")
        setPendingCoupleBgUrl(url)
        setCoupleBgAdjustOpen(true)
      } catch {
        toast("背景图处理失败，请重试")
      } finally {
        e.target.value = ""
      }
    })()
  }, [compressImageFile, toast])

  const saveCoupleBgAdjust = useCallback(
    (posX: string, posY: string) => {
      if (!pendingCoupleBgUrl) return
      patch({
        coupleBg: { url: pendingCoupleBgUrl, posX, posY },
      })
      setCoupleBgAdjustOpen(false)
      setPendingCoupleBgUrl("")
      toast("背景已保存")
    },
    [pendingCoupleBgUrl, patch, toast]
  )

  const cancelCoupleBgAdjust = useCallback(() => {
    setCoupleBgAdjustOpen(false)
    setPendingCoupleBgUrl("")
  }, [])

  const openImportPreview = useCallback((result: ImportResult, recorder: string, fileFingerprint: string) => {
    if (result.transactions.length === 0) {
      toast(GENERIC_BILL_IMPORT_HINT)
      return
    }
    setImportPreviewSource(result.batch.source)
    setImportPreviewTransactions(result.transactions)
    setImportPreviewRecorder(recorder)
    setImportPreviewFileFingerprint(fileFingerprint)
    setImportPreviewOpen(true)
  }, [toast])

  const cancelImportPreview = useCallback(() => {
    setImportPreviewOpen(false)
    setImportPreviewTransactions([])
    setImportPreviewRecorder("")
    setImportPreviewFileFingerprint("")
  }, [])

  const confirmImportPreview = useCallback((imported: Transaction[]) => {
    const batch: ImportBatch = {
      ids: imported.map((t) => t.id),
      source: importPreviewSource,
      recorder: importPreviewRecorder,
      count: imported.length,
      time: new Date().toISOString(),
      status: "active",
      fileFingerprint: importPreviewFileFingerprint || undefined,
    }
    setState((s) => {
      const next = {
        ...s,
        transactions: [...imported, ...s.transactions],
        importBatches: [batch, ...s.importBatches],
      }
      flushStateSync(next)
      if (importPreviewFileFingerprint) {
        syncImportedFilesFromBatches(next.importBatches)
      }
      return next
    })
    const sourceLabel =
      importPreviewSource === "alipay"
        ? "支付宝"
        : importPreviewSource === "wechat"
          ? "微信"
          : "通用"

    toast(`✅ 已导入 ${imported.length} 条${sourceLabel}账单`)

    // 月份提醒：导入的交易不在当前查看月份时提示用户切换
    const nowDate = new Date()
    const currentYearMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`
    const monthCounts = new Map<string, number>()
    for (const t of imported) {
      const ym = t.date.slice(0, 7)
      monthCounts.set(ym, (monthCounts.get(ym) || 0) + 1)
    }
    if (!monthCounts.has(currentYearMonth) && monthCounts.size > 0) {
      // 取最多交易的月份
      let topMonth = ""
      let topCount = 0
      for (const [ym, cnt] of monthCounts) {
        if (cnt > topCount) { topCount = cnt; topMonth = ym }
      }
      const [y, m] = topMonth.split("-")
      setTimeout(() => {
        toast(`📅 导入的账单集中在 ${y}年${parseInt(m)}月，请在流水页切换月份查看`)
      }, 2000)
    }

    cancelImportPreview()

    // 立即推送到云端，不依赖 debounce（确保导入数据同步到其他设备）
    if (useCloud && allowPushRef.current) {
      const roomId =
        state.roomId ||
        (typeof window !== "undefined" ? localStorage.getItem("couple-room-id") || "" : "")
      if (roomId && imported.length > 0) {
        void withRoomLock(roomId, async () => {
          await pushTransactions(imported, roomId)
          await pushImportBatches([batch], roomId)
        }).catch(() => {
          // 推送失败不阻塞用户操作，debounce 会自动重试
          console.warn("[import] 云端推送失败，稍后自动重试")
        })
      }
    }
  }, [importPreviewSource, importPreviewRecorder, importPreviewFileFingerprint, cancelImportPreview, toast, state.roomId])

  const openRevertImport = useCallback(() => {
    setRevertImportOpen(true)
  }, [])

  const closeRevertImport = useCallback(() => {
    setRevertImportOpen(false)
  }, [])

  const revertImportBatch = useCallback(async (batchTime: string) => {
    const batch = importBatches.find(
      (b) => b.time === batchTime && b.status !== "reverted"
    )
    if (!batch) return

    if (batch.ids.length === 0) {
      toast("该批次无交易记录")
      return
    }

    const idsSet = new Set(batch.ids)
    const deleteCount = batch.ids.length
    const updatedBatch: ImportBatch = { ...batch, status: "reverted" }

    setState((s) => {
      const nextBatches = s.importBatches.map((b) =>
        b.time === batchTime ? updatedBatch : b
      )
      const next = {
        ...s,
        transactions: s.transactions.filter((tx) => !idsSet.has(tx.id)),
        importBatches: nextBatches,
      }
      syncImportedFilesFromBatches(nextBatches)
      flushStateSync(next)
      return next
    })

    const roomId =
      state.roomId ||
      (typeof window !== "undefined" ? localStorage.getItem("couple-room-id") || "" : "")

    if (!useCloud || !roomId) {
      toast(`已撤销导入，删除 ${deleteCount} 条交易`)
      return
    }

    setRevertImportLoading(true)
    try {
      await withRoomLock(roomId, async () => {
        await deleteCloudTransactions(batch.ids, roomId)
        await pushImportBatches([updatedBatch], roomId)
      })
      toast(`已撤销导入，删除 ${deleteCount} 条交易`)
    } catch {
      toast("撤销已生效，云同步失败，稍后自动重试")
    } finally {
      setRevertImportLoading(false)
    }
  }, [importBatches, state.roomId, toast])

  const onSelectImportMember = useCallback((memberId: string) => {
    pendingImportMemberRef.current = memberId
    fileRef.current?.click()
  }, [])

  const onSelectExportMember = useCallback((memberId: string) => {
    exportTransactionsXlsx(memberId)
  }, [exportTransactionsXlsx])

  const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileFingerprint = `${file.name}|${file.size}|${file.lastModified}`
    const hasActiveDuplicate = importBatches.some(
      (b) => b.status !== "reverted" && b.fileFingerprint === fileFingerprint
    )
    if (hasActiveDuplicate) {
      toast("⚠️ 请勿导入重复账单！")
      e.target.value = ""
      return
    }

    const memberId = pendingImportMemberRef.current || members[0]?.id || "wu"
    pendingImportMemberRef.current = ""
    const lowerName = file.name.toLowerCase()

    setImportParsing(true)

    const reader = new FileReader()
    reader.onload = (ev) => {
      void (async () => {
        try {
          // yield 一次让加载提示先渲染，避免手机端卡顿无反馈
          await new Promise((r) => setTimeout(r, 0))

          if (lowerName.endsWith(".csv")) {
            const buffer = ev.target!.result as ArrayBuffer
            const text = decodeBillCsv(buffer)
            const source = detectSource(text, file.name)

            if (source === "alipay" || source === "wechat") {
              const result =
                source === "alipay"
                  ? parseAlipayCSV(text, memberId, cats)
                  : parseWechatCSV(text, memberId, cats)
              openImportPreview(result, memberId, fileFingerprint)
              return
            }

            openImportPreview(await parseGenericCsv(text, members, cats, memberId), memberId, fileFingerprint)
            return
          }

          if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
            openImportPreview(
              await parseGenericXlsx(ev.target!.result as ArrayBuffer, members, cats, memberId),
              memberId,
              fileFingerprint
            )
            return
          }

          toast("仅支持 .csv / .xlsx / .xls 格式")
        } catch {
          toast("文件解析失败，请确认是有效的账单文件")
        } finally {
          setImportParsing(false)
          e.target.value = ""
        }
      })()
    }
    reader.onerror = () => {
      setImportParsing(false)
      e.target.value = ""
      toast("文件读取失败，请重试")
    }

    if (lowerName.endsWith(".csv")) {
      reader.readAsArrayBuffer(file)
    } else if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      reader.readAsArrayBuffer(file)
    } else {
      setImportParsing(false)
      e.target.value = ""
      toast("仅支持 .csv / .xlsx / .xls 格式")
    }
  }, [members, cats, importBatches, openImportPreview, toast])

  const prevReviewMonth = useCallback(() => {
    if (transactions.length === 0) {
      toast("已是最早记录")
      return
    }
    const earliest = transactions.reduce((min, t) => (t.date < min ? t.date : min), transactions[0].date)
    const [ey, em] = earliest.split("-").map(Number)
    if (reviewYear < ey || (reviewYear === ey && reviewMonth <= em)) {
      toast("已是最早记录")
      return
    }
    if (reviewMonth === 1) {
      setReviewMonth(12)
      setReviewYear((y) => y - 1)
    } else {
      setReviewMonth((m) => m - 1)
    }
  }, [transactions, reviewYear, reviewMonth, toast])

  const nextReviewMonth = useCallback(() => {
    const nowY = now.getFullYear()
    const nowM = now.getMonth() + 1
    if (reviewYear > nowY || (reviewYear === nowY && reviewMonth >= nowM)) {
      toast("已是最新记录")
      return
    }
    if (reviewMonth === 12) {
      setReviewMonth(1)
      setReviewYear((y) => y + 1)
    } else {
      setReviewMonth((m) => m + 1)
    }
  }, [reviewYear, reviewMonth, now, toast])

  const saveReviewPlanState = useCallback(() => {
    const budget = Number(planBudgetTarget)
    const savings = Number(planSavingsTarget)
    if (!Number.isFinite(budget) || budget < 0 || !Number.isFinite(savings) || savings < 0) {
      toast("请输入有效的下月计划目标")
      return
    }
    const nextMonth = reviewMonth === 12 ? 1 : reviewMonth + 1
    const nextYear = reviewMonth === 12 ? reviewYear + 1 : reviewYear
    saveReviewPlan({
      monthKey: currentPlanKey(nextYear, nextMonth),
      budgetTarget: budget,
      savingsTarget: savings,
      budgetDone: reviewSummary.expense,
      savingsDone: reviewSummary.savings,
    })
    toast("下月计划已保存")
  }, [planBudgetTarget, planSavingsTarget, reviewMonth, reviewYear, reviewSummary.expense, reviewSummary.savings, toast])

  return {
    hydrated,
    cloudSynced,
    tab,
    theme,
    barWidth,
    toastMsg,
    toastShow,
    members,
    goals,
    activeGoalId,
    activeGoal,
    activeGoals,
    completedGoals,
    pct,
    cats,
    coupleBg,
    coupleBgAdjustOpen,
    pendingCoupleBgUrl,
    saveCoupleBgAdjust,
    cancelCoupleBgAdjust,
    coupleDays,
    startDate,
    remindOn,
    transactions,
    goalOpen,
    setGoalOpen,
    newGoalName,
    setNewGoalName,
    newGoalTarget,
    setNewGoalTarget,
    newGoalDeadline,
    setNewGoalDeadline,
    newGoalEmoji,
    setNewGoalEmoji,
    updateGoalId,
    setUpdateGoalId,
    updateMode,
    setUpdateMode,
    updateAmount,
    setUpdateAmount,
    updateNote,
    setUpdateNote,
    updateMemberId,
    setUpdateMemberId,
    updateGoal,
    editGoalOpen,
    setEditGoalOpen,
    editGoalId,
    editGoalEmoji,
    setEditGoalEmoji,
    editGoalName,
    setEditGoalName,
    editGoalTarget,
    setEditGoalTarget,
    editGoalDeadline,
    setEditGoalDeadline,
    openEditGoal,
    saveEditGoal,
    catMgmtOpen,
    setCatMgmtOpen,
    newCatLabel,
    setNewCatLabel,
    newCatGlyph,
    setNewCatGlyph,
    newCatType,
    setNewCatType,
    flowFilter,
    setFlowFilter,
    flowDateSheetOpen,
    setFlowDateSheetOpen,
    flowDateMode,
    setFlowDateMode,
    flowRangeStart,
    setFlowRangeStart,
    flowRangeEnd,
    setFlowRangeEnd,
    flowDate,
    setFlowDate,
    filteredFlow,
    recordOpen,
    setRecordOpen,
    recType,
    setRecType,
    recAmount,
    setRecAmount,
    recCat,
    setRecCat,
    recMemberId,
    setRecMemberId,
    recNote,
    setRecNote,
    recDate,
    setRecDate,
    editTxId,
    memberPageOpen,
    setMemberPageOpen,
    editingMember,
    setEditingMember,
    editName,
    setEditName,
    editGender,
    setEditGender,
    editPayday,
    setEditPayday,
    editAvatar,
    setEditAvatar,
    reviewYear,
    reviewMonth,
    monthSummary,
    memberSummaries,
    reviewSummary,
    flowMonthSummary,
    expensePie,
    structureStats,
    habitAnalysis,
    reviewPlan,
    reviewPlanKey,
    planBudgetTarget,
    setPlanBudgetTarget,
    planSavingsTarget,
    setPlanSavingsTarget,
    saveReviewPlanState,
    today,
    currentMonth,
    payday,
    fileRef,
    avatarRef,
    coupleBgRef,
    setTheme: (t: ThemeKey) => patch({ theme: t }),
    setActiveGoalId: (id: number) => patch({ activeGoalId: id }),
    setRemindOn: (v: boolean | ((prev: boolean) => boolean)) =>
      patch({ remindOn: typeof v === "function" ? v(remindOn) : v }),
    switchTab,
    tapKey,
    openRecord,
    openEditRecord,
    saveRecord,
    addGoal,
    removeGoal,
    openUpdateGoal,
    saveUpdateGoal,
    editGoalHistory,
    deleteGoalHistory,
    addCat,
    removeCat,
    openEditMember,
    saveEditMember,
    addMember,
    removeMember,
    onAvatarFile,
    onCoupleBgFile,
    onImportFile,
    onSelectImportMember,
    onSelectExportMember,
    importPreviewOpen,
    importPreviewSource,
    importPreviewTransactions,
    cancelImportPreview,
    confirmImportPreview,
    revertImportOpen,
    revertImportLoading,
    revertableBatches,
    openRevertImport,
    closeRevertImport,
    revertImportBatch,
    importParsing,
    deleteTransaction,
    exportTransactionsXlsx,
    celebrateOpen,
    celebrateMsg,
    setCelebrateOpen,
    prevReviewMonth,
    nextReviewMonth,
    toast,
    enterRoom,
    leaveRoom,
    getInTrendData: (scope: "year" | "month" | "day") =>
      getInTrendData(transactions, members, scope, reviewYear, reviewMonth),
    getOutTrendData: (scope: "year" | "month" | "day") =>
      getOutTrendData(transactions, members, scope, reviewYear, reviewMonth),
    getFinanceTrendData: (scope: "year" | "month" | "day") =>
      getFinanceTrendData(transactions, members, scope, reviewYear, reviewMonth),
    getYearExpensePie: () => getExpensePie(transactions, cats, reviewYear, reviewMonth, "year"),
    getTopCategories: () => getTopCategories(transactions, cats, reviewYear, reviewMonth),
  }
}

export type Ledger = ReturnType<typeof useLedger>
