export type Tab = "home" | "record" | "flow" | "review" | "mine"
export type ThemeKey = "mint" | "peach" | "blueberry"
export type TxType = "out" | "in" | "save"
export type Gender = "female" | "male" | "other"

export interface Member {
  id: string
  name: string
  avatar: string
  gender: Gender
  payday: number
}

export interface GoalHistoryEntry {
  date: string
  amount: number
  note: string
  memberId?: string
}

export interface Goal {
  id: number
  name: string
  emoji: string
  current: number
  target: number
  contributions: Record<string, number>
  history: GoalHistoryEntry[]
  deadline: string
  completedAt?: string
}

export interface Category {
  key: string
  glyph: string
  label: string
  type: TxType
  custom?: boolean
}

export interface Transaction {
  id: string
  date: string
  type: TxType
  amount: number
  categoryKey: string
  memberId: string
  note: string
  status?: "confirmed" | "pending"
  recorder?: string
  createdAt: number
  /** Supabase 同步标记：true=已同步到云端 */
  synced?: boolean
}

export interface FlowItem {
  id: string
  cat: string
  catLabel: string
  catGlyph: string
  note: string
  member: string
  memberName: string
  type: TxType
  amount: number
}

export interface FlowGroup {
  date: string
  sum: number
  items: FlowItem[]
}

export interface CoupleBg {
  url: string
  posX: string
  posY: string
}

export interface AppState {
  transactions: Transaction[]
  members: Member[]
  goals: Goal[]
  activeGoalId: number | null
  cats: Category[]
  theme: ThemeKey
  coupleBg: CoupleBg
  startDate: string
  remindOn: boolean
  importBatches: ImportBatch[]
  roomId: string
}

export interface ImportBatch {
  ids: string[]
  source: "alipay" | "wechat" | "generic"
  recorder: string
  count: number
  time: string
  status?: "active" | "reverted"
}

export interface MonthSummary {
  income: number
  expense: number
  savings: number
  balance: number
}

export interface MemberSummary {
  memberId: string
  income: number
  expense: number
  savings: number
}

export type TrendRow = {
  k: string
  total: number
  [key: string]: number | string
}

export interface PieSlice {
  name: string
  value: number
  color: string
}

export interface TopCategoryStat {
  name: string
  amount: number
  pct: number
}

export interface StructureStats {
  top3: string
  momChange: string
  habit: string
}

export interface ReviewHabitAnalysis {
  topCategories: Array<{ name: string; amount: number; pct: number }>
  momChange: string
  bigSpends: Array<{ date: string; note: string; amount: number; flag: string }>
  dailyAverage: number
}

export interface ReviewPlan {
  monthKey: string
  budgetTarget: number
  savingsTarget: number
  budgetDone?: number
  savingsDone?: number
  updatedAt?: string
}

export interface HabitInsight {
  label: string
  value: string
}
