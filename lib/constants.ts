import type { Category, Member, ThemeKey } from "./types"
import { DEFAULT_COUPLE_BG } from "./couple-bg"

export const STORAGE_KEY = "couple-ledger-v1"

export const THEMES: Record<ThemeKey, { label: string; accent: string; accentDark: string; dot: string }> = {
  mint: { label: "草莓薄荷", accent: "#3DAE83", accentDark: "#2F9670", dot: "#3DAE83" },
  peach: { label: "蜜桃汽水", accent: "#D96A7E", accentDark: "#C0566A", dot: "#D96A7E" },
  blueberry: { label: "蓝莓波波", accent: "#6079C9", accentDark: "#4F66B3", dot: "#6079C9" },
}

export const INIT_CATS: Category[] = [
  { key: "food", glyph: "食", label: "餐饮", type: "out" },
  { key: "car", glyph: "车", label: "交通", type: "out" },
  { key: "shop", glyph: "袋", label: "购物", type: "out" },
  { key: "home", glyph: "家", label: "居家", type: "out" },
  { key: "fun", glyph: "玩", label: "娱乐", type: "out" },
  { key: "med", glyph: "医", label: "医疗", type: "out" },
  { key: "salary", glyph: "薪", label: "工资", type: "in" },
  { key: "gift", glyph: "礼", label: "红包", type: "in" },
  { key: "save", glyph: "储", label: "存钱", type: "save" },
]

export const DEFAULT_MEMBERS: Member[] = [
  { id: "wu", name: "小五", avatar: "/sys-av-6.png", gender: "female", payday: 10 },
  { id: "yun", name: "小云", avatar: "/sys-av-1.png", gender: "male", payday: 10 },
]

export const SYS_AVATARS = Array.from({ length: 10 }, (_, i) => `/sys-av-${i + 1}.png`)

export const PIE_COLORS = ["#F0A03C", "#F0CF3C", "#7FC8E8", "#D96A7E", "#3DAE83", "#A99BD6", "#E0A82E", "#6079C9"]

export const MEMBER_CHART_COLORS = ["#F0A03C", "#6079C9", "#3DAE83", "#D96A7E"]

export const TABS = [
  { key: "home" as const, img: "/tabbar/home.png", imgActive: "/tabbar/home-active.png", label: "首页" },
  { key: "flow" as const, img: "/tabbar/flow.png", imgActive: "/tabbar/flow-active.png", label: "流水" },
  { key: "record" as const, img: "/tabbar/record.png", imgActive: "/tabbar/record.png", label: "" },
  { key: "review" as const, img: "/tabbar/review.png", imgActive: "/tabbar/review-active.png", label: "复盘" },
  { key: "mine" as const, img: "/tabbar/mine.png", imgActive: "/tabbar/mine-active.png", label: "我的" },
]

export const REVIEW_INSIGHT_RULES = [
  { key: "top3", label: "TOP3支出分类" },
  { key: "mom", label: "环比变化" },
  { key: "big", label: "大额消费提醒" },
] as const

export function createDefaultState(): import("./types").AppState {
  return {
    transactions: [],
    members: [],
    goals: [],
    activeGoalId: null,
    cats: [...INIT_CATS],
    theme: "mint",
    coupleBg: { ...DEFAULT_COUPLE_BG },
    startDate: new Date().toISOString().slice(0, 10),
    remindOn: true,
    importBatches: [],
    roomId: "",
  }
}
