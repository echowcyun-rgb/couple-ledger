import type { Goal } from "./types"

export function applySaveToGoal(
  goals: Goal[],
  activeGoalId: number | null,
  amount: number,
  memberId: string,
  note: string
): Goal[] {
  if (!activeGoalId || amount <= 0) return goals
  const today = new Date().toLocaleDateString("zh-CN")
  return goals.map((g) => {
    if (g.id !== activeGoalId) return g
    const contributions = { ...g.contributions }
    contributions[memberId] = (contributions[memberId] || 0) + amount
    return {
      ...g,
      current: g.current + amount,
      contributions,
      history: [
        { date: today, amount, note: note || "记账存入", memberId },
        ...g.history,
      ].slice(0, 20),
    }
  })
}

export function getGoalContribution(goal: Goal, memberId: string): number {
  return goal.contributions[memberId] || 0
}
