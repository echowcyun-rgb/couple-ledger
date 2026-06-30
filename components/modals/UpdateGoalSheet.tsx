import { useState } from "react"
import type { Ledger } from "@/hooks/useLedger"
import { useSheetSwipe } from "@/hooks/useSheetSwipe"

export function UpdateGoalSheet({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "updateGoalId"
    | "setUpdateGoalId"
    | "updateGoal"
    | "updateMode"
    | "setUpdateMode"
    | "updateAmount"
    | "setUpdateAmount"
    | "updateNote"
    | "setUpdateNote"
    | "updateMemberId"
    | "setUpdateMemberId"
    | "members"
    | "saveUpdateGoal"
    | "editGoalHistory"
    | "deleteGoalHistory"
    | "monthSummary"
  >
}) {
  const {
    updateGoalId,
    setUpdateGoalId,
    updateGoal,
    updateMode,
    setUpdateMode,
    updateAmount,
    setUpdateAmount,
    updateNote,
    setUpdateNote,
    updateMemberId,
    setUpdateMemberId,
    members,
    saveUpdateGoal,
    editGoalHistory,
    deleteGoalHistory,
    monthSummary,
  } = ledger

  const financeIncomeThisMonth = monthSummary?.financeIncome ?? 0

  const [saving, setSaving] = useState(false)
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null)
  const [editHistAmount, setEditHistAmount] = useState("")
  const [editHistNote, setEditHistNote] = useState("")
  const swipe = useSheetSwipe(() => setUpdateGoalId(null), updateGoalId !== null)

  function handleSave() {
    if (saving) return
    setSaving(true)
    saveUpdateGoal()
    setTimeout(() => setSaving(false), 500)
  }

  return (
    <>
      <div className={`sheet-mask ${updateGoalId !== null ? "show" : ""}`} onClick={() => setUpdateGoalId(null)} />
      <div
        className={`sheet ${updateGoalId !== null ? "show" : ""}`}
        role="dialog"
        aria-label="更新存钱进度"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        {updateGoal && (
          <>
            <div className="sheet-grab" aria-hidden="true" />
            <div className="sheet-title">更新「{updateGoal.name}」进度</div>
            <div className="upd-meta">
              目标 ¥{updateGoal.target} · 当前已存 ¥{updateGoal.current} · 完成 {Math.min(100, Math.round((updateGoal.current / updateGoal.target) * 100))}%
            </div>
            <div className="upd-field-label">经手人</div>
            <div className="rec-members">
              {members.map((m) => (
                <button
                  key={m.id}
                  className={`rm-pill ${updateMemberId === m.id ? "on" : ""}`}
                  onClick={() => setUpdateMemberId(m.id)}
                >
                  <img className="pixavatar xs" src={m.avatar || "/placeholder.svg"} alt="" aria-hidden="true" />
                  {m.name}
                </button>
              ))}
            </div>
            <div className="upd-field-label">更新方式</div>
            <div className="upd-modes">
              <button className={`upd-mode ${updateMode === "amount" ? "on" : ""}`} onClick={() => setUpdateMode("amount")}>按金额</button>
              <button className={`upd-mode ${updateMode === "pct" ? "on" : ""}`} onClick={() => setUpdateMode("pct")}>当月总存款百分比</button>
              <button className={`upd-mode ${updateMode === "finance" ? "on" : ""}`} onClick={() => setUpdateMode("finance")}>当月理财收入</button>
            </div>
            {updateMode === "finance" ? (
              <>
                <div className="upd-field-label">当月理财收入</div>
                <div className="upd-finance-display">
                  ¥{financeIncomeThisMonth}
                </div>
                <div className="upd-field-hint">
                  更新后将达到 ¥{updateGoal.current + financeIncomeThisMonth}
                </div>
              </>
            ) : (
              <>
                <div className="upd-field-label">{updateMode === "amount" ? "本次存入（元）" : "占当月总存款百分比（%）"}</div>
                <input
                  className="upd-input"
                  type="number"
                  inputMode="decimal"
                  placeholder={updateMode === "amount" ? "0" : "0"}
                  value={updateAmount}
                  onChange={(e) => setUpdateAmount(e.target.value)}
                />
                {updateMode === "amount" && updateAmount && !Number.isNaN(Number(updateAmount)) && Number(updateAmount) > 0 && (
                  <div className="upd-field-hint">
                    更新后将达到 ¥{updateGoal.current + Number(updateAmount)}
                  </div>
                )}
              </>
            )}
            <div className="upd-field-label">备注（选填）</div>
            <input className="upd-input" placeholder="如：本月工资存入" value={updateNote} onChange={(e) => setUpdateNote(e.target.value)} />
            <div className="upd-btns">
              <button className="px-btn ghost" onClick={() => setUpdateGoalId(null)}>取消</button>
              <button className="px-btn solid upd-save" disabled={saving} onClick={handleSave}>保存进度</button>
            </div>
            {updateGoal.history.length > 0 && (
              <div className="upd-history">
                <div className="upd-h-title">更新历史</div>
                {updateGoal.history.map((h, i) => {
                  const hid = h.id || `${h.date}_${h.amount}_${h.note}`
                  const isEditing = editingHistoryId === hid
                  return (
                    <div className="upd-h-row" key={hid || i}>
                      {isEditing ? (
                        <>
                          <span className="upd-h-date">{h.date}</span>
                          <input
                            className="upd-h-input-amt"
                            type="number"
                            inputMode="decimal"
                            value={editHistAmount}
                            onChange={(e) => setEditHistAmount(e.target.value)}
                            aria-label="金额"
                          />
                          <input
                            className="upd-h-input-note"
                            value={editHistNote}
                            onChange={(e) => setEditHistNote(e.target.value)}
                            aria-label="备注"
                          />
                          <button
                            className="upd-h-btn save"
                            onClick={() => {
                              editGoalHistory(updateGoal.id, hid, {
                                amount: Number(editHistAmount) || 0,
                                note: editHistNote,
                              })
                              setEditingHistoryId(null)
                            }}
                          >✓</button>
                          <button
                            className="upd-h-btn cancel"
                            onClick={() => setEditingHistoryId(null)}
                          >✕</button>
                        </>
                      ) : (
                        <>
                          <span className="upd-h-date">{h.date}</span>
                          <span className="upd-h-note">{h.note}</span>
                          <span className="upd-h-amt">¥{h.amount}</span>
                          <button
                            className="upd-h-btn edit"
                            onClick={() => {
                              setEditingHistoryId(hid)
                              setEditHistAmount(String(h.amount))
                              setEditHistNote(h.note)
                            }}
                            aria-label="编辑"
                          >✎</button>
                          <button
                            className="upd-h-btn del"
                            onClick={() => {
                              if (confirm(`删除这条历史？\n${h.date} ¥${h.amount} ${h.note}\n删除后存钱总额会重新计算`)) {
                                deleteGoalHistory(updateGoal.id, hid)
                              }
                            }}
                            aria-label="删除"
                          >🗑</button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
