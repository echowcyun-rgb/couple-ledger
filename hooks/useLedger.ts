"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as XLSX from "@e965/xlsx"
import { SYS_AVATARS } from "@/lib/constants"
import { coupleDaysFrom } from "@/lib/format"
import { applySaveToGoal } from "@/lib/goals"
import { importSnapshot, loadState, saveState, syncFromCloud } from "@/lib/storage"
import {
  getInTrendData,
  getExpensePie,
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
} from "@/lib/importers"
import type {
  AppState,
  Gender,
  Goal,
  ImportBatch,
  Member,
  ReviewHabitAnalysis,
  ReviewPlan,
  Tab,
  ThemeKey,
  Transaction,
  TxType,
} from "@/lib/types"

export function useLedger() {
  const [hydrated, setHydrated] = useState(false)
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
  const [updateMode, setUpdateMode] = useState<"amount" | "pct">("amount")
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

  const fileRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const coupleBgRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { members, goals, activeGoalId, cats, theme, coupleBg, startDate, remindOn, transactions } = state

  useEffect(() => {
    setState(loadState())
    setHydrated(true)
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

  // 初始化后从云同步（用户无感）
  useEffect(() => {
    if (!hydrated) return
    syncFromCloud()
      .then((count) => {
        if (count > 0) {
          setState(loadState())
          toast(`☁️ 已同步 ${count} 条云端记录`)
        } else {
          const st = loadState()
          if (st.transactions.length > 0) saveState(st)
        }
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e)
        toast(`云同步失败：${message || "请检查网络"}`)
      })
  }, [hydrated, toast])

  useEffect(() => {
    if (hydrated) saveState(state)
  }, [state, hydrated])

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
    () => groupByDate(transactions, cats, members, flowFilter === "all" ? undefined : flowFilter),
    [transactions, cats, members, flowFilter]
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
  }, [toast])

  const exportTransactionsXlsx = useCallback(() => {
    const rows = transactions.map((t) => ({
      日期: t.date,
      类型: t.type === "out" ? "支出" : t.type === "in" ? "收入" : "存钱",
      金额: t.amount,
      分类: cats.find((c) => c.key === t.categoryKey)?.label || t.categoryKey,
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
    a.download = `账单_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    toast("已导出账单 xlsx")
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
    const num = Number(updateAmount)
    if (!num || num < 0) { toast("请输入有效金额"); return }
    if (!updateMemberId) { toast("请选择经手人"); return }
    let newCurrent = num
    if (updateMode === "pct") {
      newCurrent = Math.round(updateGoal.target * (num / 100))
    }
    const todayStr = new Date().toLocaleDateString("zh-CN")
    setState((s) => ({
      ...s,
      goals: s.goals.map((x) =>
        x.id === updateGoalId
          ? {
              ...x,
              current: newCurrent,
              history: [{ date: todayStr, amount: newCurrent, note: updateNote || "手动更新", memberId: updateMemberId }, ...x.history].slice(0, 20),
            }
          : x
      ),
    }))
    setUpdateGoalId(null)
    toast("进度已更新")
  }, [updateGoal, updateGoalId, updateAmount, updateMode, updateNote, updateMemberId, toast])

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
    const id = `m_${Date.now()}`
    const defaultName = members.length === 0 ? "我" : `成员${members.length + 1}`
    patch({
      members: [
        ...members,
        { id, name: defaultName, avatar: SYS_AVATARS[members.length % SYS_AVATARS.length], gender: "other", payday: 10 },
      ],
    })
    toast("已添加新成员")
  }, [members, patch, toast])

  const removeMember = useCallback((id: string) => {
    if (members.length <= 1) { toast("至少保留一位成员"); return }
    patch({ members: members.filter((m) => m.id !== id) })
    toast("已删除成员")
  }, [members, patch, toast])

  const onAvatarFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setEditAvatar(ev.target!.result as string)
    reader.readAsDataURL(file)
    e.target.value = ""
  }, [])

  const onCoupleBgFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => patch({ coupleBg: ev.target!.result as string })
    reader.readAsDataURL(file)
    e.target.value = ""
  }, [patch])

  const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const memberId = members[0]?.id || "wu"
    const lowerName = file.name.toLowerCase()

    const applyGenericImport = (imported: Transaction[]) => {
      if (imported.length === 0) {
        toast(GENERIC_BILL_IMPORT_HINT)
        return
      }
      setState((s) => ({ ...s, transactions: [...imported, ...s.transactions] }))
      toast(`✅ 已导入 ${imported.length} 条账单`)
    }

    // .csv：优先支付宝/微信专用解析，失败则走通用 CSV
    if (lowerName.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const text = ev.target!.result as string
          const source = detectSource(text)

          if (source === "alipay" || source === "wechat") {
            const result =
              source === "alipay"
                ? parseAlipayCSV(text, memberId)
                : parseWechatCSV(text, memberId)

            if (result.transactions.length > 0) {
              const batch: ImportBatch = {
                ...result.batch,
                time: new Date().toISOString(),
              }
              setState((s) => ({
                ...s,
                transactions: [...result.transactions, ...s.transactions],
                importBatches: [batch, ...s.importBatches],
              }))
              toast(
                `✅ 已导入 ${result.transactions.length} 条${source === "alipay" ? "支付宝" : "微信"}账单`
              )
              return
            }
          }

          // 通用 CSV（本应用导出、标准列名表格等）
          applyGenericImport(parseGenericCsv(text, members, cats))
        } catch {
          toast("文件解析失败，请确认是有效的 CSV 文件")
        }
      }
      reader.readAsText(file, "UTF-8")
      e.target.value = ""
      return
    }

    // .xlsx / .xls → 通用 Excel 导入
    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          applyGenericImport(parseGenericXlsx(ev.target!.result as ArrayBuffer, members, cats))
        } catch {
          toast("文件解析失败，请检查格式")
        }
      }
      reader.readAsArrayBuffer(file)
      e.target.value = ""
      return
    }

    toast("仅支持 .csv / .xlsx / .xls 格式")
    e.target.value = ""
  }, [members, cats, toast])

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
    addCat,
    removeCat,
    openEditMember,
    saveEditMember,
    addMember,
    removeMember,
    onAvatarFile,
    onCoupleBgFile,
    onImportFile,
    deleteTransaction,
    exportTransactionsXlsx,
    prevReviewMonth,
    nextReviewMonth,
    toast,
    getInTrendData: (scope: "year" | "month" | "day") =>
      getInTrendData(transactions, members, scope, reviewYear, reviewMonth),
    getOutTrendData: (scope: "year" | "month" | "day") =>
      getOutTrendData(transactions, members, scope, reviewYear, reviewMonth),
    getYearExpensePie: () => getExpensePie(transactions, cats, reviewYear, reviewMonth, "year"),
    getTopCategories: () => getTopCategories(transactions, cats, reviewYear, reviewMonth),
  }
}

export type Ledger = ReturnType<typeof useLedger>
