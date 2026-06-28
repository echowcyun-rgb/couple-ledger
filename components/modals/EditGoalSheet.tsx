import { useState } from "react"
import type { Ledger } from "@/hooks/useLedger"
import { useSheetSwipe } from "@/hooks/useSheetSwipe"

const GOAL_EMOJIS = ["🎯", "🏠", "🚗", "✈️", "🎓", "💰", "💍", "🌍", "📱", "💻"]

export function EditGoalSheet({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "editGoalOpen"
    | "setEditGoalOpen"
    | "editGoalId"
    | "editGoalEmoji"
    | "setEditGoalEmoji"
    | "editGoalName"
    | "setEditGoalName"
    | "editGoalTarget"
    | "setEditGoalTarget"
    | "editGoalDeadline"
    | "setEditGoalDeadline"
    | "saveEditGoal"
    | "goals"
  >
}) {
  const {
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
    saveEditGoal,
    goals,
  } = ledger

  const [saving, setSaving] = useState(false)
  const swipe = useSheetSwipe(() => setEditGoalOpen(false), editGoalOpen)

  const goal = goals.find(g => g.id === editGoalId)

  function handleSave() {
    if (saving) return
    setSaving(true)
    saveEditGoal()
    setTimeout(() => setSaving(false), 500)
  }

  if (!goal) return null

  return (
    <>
      <div className={`sheet-mask ${editGoalOpen ? "show" : ""}`} onClick={() => setEditGoalOpen(false)} />
      <div
        className={`sheet ${editGoalOpen ? "show" : ""}`}
        role="dialog"
        aria-label="编辑存钱目标"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-title">编辑目标「{goal.name}」</div>
        <div className="goal-add">
          <div className="ga-emoji-row">
            {GOAL_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`ga-emoji-btn ${editGoalEmoji === emoji ? "on" : ""}`}
                onClick={() => setEditGoalEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="ga-row">
            <input
              className="ga-input ga-name"
              placeholder="目标名称"
              value={editGoalName}
              onChange={(e) => setEditGoalName(e.target.value.replace(/^\s+/, ""))}
              maxLength={18}
            />
          </div>
          <input className="ga-input" inputMode="decimal" placeholder="目标金额（元）" value={editGoalTarget} onChange={(e) => setEditGoalTarget(e.target.value)} />
          <div className="ga-field-label">预计达成时间</div>
          <input
            className="ga-input"
            type="date"
            value={editGoalDeadline}
            onChange={(e) => setEditGoalDeadline(e.target.value)}
            style={{ marginTop: 4 }}
          />
          {!editGoalDeadline && <div className="ga-field-hint">选择预计完成日期</div>}
          <button className="px-btn ga-btn" disabled={saving} onClick={handleSave}>保存修改</button>
        </div>
        <button className="px-btn ghost goal-close" onClick={() => setEditGoalOpen(false)}>取消</button>
      </div>
    </>
  )
}
