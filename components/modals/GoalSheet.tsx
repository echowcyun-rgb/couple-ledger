import { useState } from "react"
import type { Ledger } from "@/hooks/useLedger"
import { useSheetSwipe } from "@/hooks/useSheetSwipe"

const GOAL_EMOJIS = ["🎯", "🏠", "🚗", "✈️", "🎓", "💰", "💍", "🌍", "📱", "💻"]

export function GoalSheet({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "goalOpen"
    | "setGoalOpen"
    | "goals"
    | "activeGoalId"
    | "setActiveGoalId"
    | "openUpdateGoal"
    | "removeGoal"
    | "newGoalEmoji"
    | "setNewGoalEmoji"
    | "newGoalName"
    | "setNewGoalName"
    | "newGoalTarget"
    | "setNewGoalTarget"
    | "newGoalDeadline"
    | "setNewGoalDeadline"
    | "addGoal"
  >
}) {
  const {
    goalOpen,
    setGoalOpen,
    goals,
    activeGoalId,
    setActiveGoalId,
    openUpdateGoal,
    removeGoal,
    newGoalEmoji,
    setNewGoalEmoji,
    newGoalName,
    setNewGoalName,
    newGoalTarget,
    setNewGoalTarget,
    newGoalDeadline,
    setNewGoalDeadline,
    addGoal,
  } = ledger

  const [adding, setAdding] = useState(false)
  const swipe = useSheetSwipe(() => setGoalOpen(false), goalOpen)

  function handleAdd() {
    if (adding) return
    setAdding(true)
    addGoal()
    setTimeout(() => setAdding(false), 500)
  }

  return (
    <>
      <div className={`sheet-mask ${goalOpen ? "show" : ""}`} onClick={() => setGoalOpen(false)} />
      <div
        className={`sheet ${goalOpen ? "show" : ""}`}
        role="dialog"
        aria-label="管理存钱目标"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="goal-mgmt-header">
          <div className="sheet-title">★ 共同存钱目标</div>
          <button
            className="px-btn solid sm goal-add-top"
            onClick={() => {
              setNewGoalName("")
              setNewGoalTarget("")
              setNewGoalDeadline("")
              setNewGoalEmoji("★")
              setTimeout(() => {
                document.getElementById("goal-add-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }, 60)
            }}
          >
            + 新增
          </button>
        </div>
        <div className="goal-list">
          {goals.map((g) => {
            const gp = Math.min(100, Math.round((g.current / g.target) * 100))
            return (
              <div className={`goal-item ${g.id === activeGoalId ? "on" : ""}`} key={g.id}>
                <button className="goal-pick" onClick={() => setActiveGoalId(g.id)}>
                  <span className="goal-emoji">{g.emoji}</span>
                  <div className="goal-meta">
                    <div className="goal-name">
                      {g.name}
                      {g.id === activeGoalId && <span className="goal-cur-tag">进行中</span>}
                    </div>
                    <div className="goal-progress-row">
                      <span className="goal-cur-val">¥{g.current.toLocaleString()}</span>
                      <span className="goal-sep">/</span>
                      <span className="goal-tgt-val">¥{g.target.toLocaleString()}</span>
                    </div>
                    <div className="goal-track"><div className="goal-fill" style={{ width: `${gp}%` }} /></div>
                    <div className="goal-sub-row">
                      <span className="goal-pct">{gp}%</span>
                      <span className="goal-hint">目标 ¥{g.target.toLocaleString()}，{gp === 0 ? "从今天开始存吧 ✨" : `还差 ¥${(g.target - g.current).toLocaleString()}`}</span>
                    </div>
                  </div>
                </button>
                <div className="goal-actions">
                  <button className="goal-act-btn upd" onClick={() => openUpdateGoal(g.id)}>更新</button>
                  <button className="goal-act-btn del" onClick={() => removeGoal(g.id)}>删除</button>
                </div>
              </div>
            )
          })}
          {goals.length === 0 && <div className="goal-empty">还没有目标，新增一个开始存钱吧～</div>}
        </div>
        <div className="goal-add" id="goal-add-form">
          <div className="ga-title">新增目标</div>
          <div className="ga-emoji-row">
            {GOAL_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`ga-emoji-btn ${newGoalEmoji === emoji ? "on" : ""}`}
                onClick={() => setNewGoalEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="ga-row">
            <input
              className="ga-input ga-name"
              placeholder="昵称/目标名称，如：看演唱会"
              value={newGoalName}
              onChange={(e) => setNewGoalName(e.target.value.replace(/^\s+/, ""))}
              maxLength={18}
            />
          </div>
          <input className="ga-input" inputMode="decimal" placeholder="目标金额（元），如：5000" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} />
          <input
            className="ga-input"
            type="date"
            value={newGoalDeadline}
            onChange={(e) => setNewGoalDeadline(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <button className="px-btn ga-btn" disabled={adding} onClick={handleAdd}>＋ 添加目标</button>
        </div>
        <button className="px-btn ghost goal-close" onClick={() => setGoalOpen(false)}>完成</button>
      </div>
    </>
  )
}
