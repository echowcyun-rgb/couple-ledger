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
  createdAt: number
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

export interface AppState {
  transactions: Transaction[]
  members: Member[]
  goals: Goal[]
  activeGoalId: number | null
  cats: Category[]
  theme: ThemeKey
  coupleBg: string
  startDate: string
  remindOn: boolean
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
}

export interface ReviewPlan {
  budgetTarget: number
  savingsTarget: number
  updatedAt: string
}

export interface HabitInsight {
  label: string
  value: string
}
