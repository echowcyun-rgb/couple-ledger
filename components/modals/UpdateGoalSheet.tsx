import type { Ledger } from "@/hooks/useLedger"

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
    | "saveUpdateGoal"
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
    saveUpdateGoal,
  } = ledger

  return (
    <>
      <div className={`sheet-mask ${updateGoalId !== null ? "show" : ""}`} onClick={() => setUpdateGoalId(null)} />
      <div className={`sheet ${updateGoalId !== null ? "show" : ""}`} role="dialog" aria-label="更新存钱进度">
        {updateGoal && (
          <>
            <div className="sheet-grab" aria-hidden="true" />
            <div className="sheet-title">更新「{updateGoal.name}」进度</div>
            <div className="upd-meta">
              目标 ¥{updateGoal.target.toLocaleString()} · 当前已存 ¥{updateGoal.current.toLocaleString()} · 完成 {Math.min(100, Math.round((updateGoal.current / updateGoal.target) * 100))}%
            </div>
            <div className="upd-field-label">更新方式</div>
            <div className="upd-modes">
              <button className={`upd-mode ${updateMode === "amount" ? "on" : ""}`} onClick={() => setUpdateMode("amount")}>按金额</button>
              <button className={`upd-mode ${updateMode === "pct" ? "on" : ""}`} onClick={() => setUpdateMode("pct")}>当月总存款百分比</button>
            </div>
            <div className="upd-field-label">{updateMode === "amount" ? "已存金额（元）" : "占当月总存款百分比（%）"}</div>
            <input className="upd-input" type="number" inputMode="decimal" placeholder="0" value={updateAmount} onChange={(e) => setUpdateAmount(e.target.value)} />
            <div className="upd-field-label">备注（选填）</div>
            <input className="upd-input" placeholder="如：本月工资存入" value={updateNote} onChange={(e) => setUpdateNote(e.target.value)} />
            <div className="upd-btns">
              <button className="px-btn ghost" onClick={() => setUpdateGoalId(null)}>取消</button>
              <button className="px-btn solid upd-save" onClick={saveUpdateGoal}>保存进度</button>
            </div>
            {updateGoal.history.length > 0 && (
              <div className="upd-history">
                <div className="upd-h-title">更新历史</div>
                {updateGoal.history.map((h, i) => (
                  <div className="upd-h-row" key={i}>
                    <span className="upd-h-date">{h.date}</span>
                    <span className="upd-h-note">{h.note}</span>
                    <span className="upd-h-amt">¥{h.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
