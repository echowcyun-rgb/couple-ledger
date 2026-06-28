import type { Ledger } from "@/hooks/useLedger"

export function RecordSheet({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "recordOpen"
    | "setRecordOpen"
    | "recType"
    | "setRecType"
    | "recAmount"
    | "setRecAmount"
    | "recCat"
    | "setRecCat"
    | "cats"
    | "recMemberId"
    | "setRecMemberId"
    | "members"
    | "recNote"
    | "setRecNote"
    | "recDate"
    | "setRecDate"
    | "saveRecord"
    | "setCatMgmtOpen"
  >
}) {
  const {
    recordOpen,
    setRecordOpen,
    recType,
    setRecType,
    recAmount,
    setRecAmount,
    recCat,
    setRecCat,
    cats,
    recMemberId,
    setRecMemberId,
    members,
    recNote,
    setRecNote,
    recDate,
    setRecDate,
    saveRecord,
    setCatMgmtOpen,
  } = ledger

  const filteredCats = cats.filter((c) => c.type === recType)

  return (
    <>
      <div className={`sheet-mask ${recordOpen ? "show" : ""}`} onClick={() => setRecordOpen(false)} />
      <div className={`sheet ${recordOpen ? "show" : ""}`} role="dialog" aria-label="记一笔">
        <div className="sheet-grab" aria-hidden="true" />

        {/* 类型按钮 */}
        <div className="rec-types">
          {([{ k: "out", label: "支出" }, { k: "in", label: "收入" }, { k: "save", label: "存钱" }] as const).map((rt) => (
            <button
              key={rt.k}
              className={`rec-type ${recType === rt.k ? "on" : ""} ${rt.k}`}
              onClick={() => {
                setRecType(rt.k)
                const first = cats.find((c) => c.type === rt.k)
                if (first) setRecCat(first.key)
              }}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {/* 金额（大号显示） */}
        <div className="rec-amount">
          <span className="rec-yen">¥</span>
          <span className="rec-num">{recAmount}</span>
        </div>

        {/* 经手人选择 */}
        <div className="rec-members">
          <span className="rm-label">经手人</span>
          {members.map((m) => (
            <button
              key={m.id}
              className={`rm-pill ${recMemberId === m.id ? "on" : ""}`}
              onClick={() => setRecMemberId(m.id)}
            >
              <img className="pixavatar xs" src={m.avatar || "/placeholder.svg"} alt="" aria-hidden="true" />
              {m.name}
            </button>
          ))}
        </div>

        {/* 分类下拉 */}
        <div className="rec-field">
          <span className="rec-field-label">分类</span>
          <div className="rec-field-right">
            <select
              className="rec-select"
              value={recCat}
              onChange={(e) => setRecCat(e.target.value)}
            >
              {filteredCats.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button className="rec-field-btn" onClick={() => { setRecordOpen(false); setCatMgmtOpen(true) }}>
              管理
            </button>
          </div>
        </div>

        {/* 日期 */}
        <div className="rec-field">
          <span className="rec-field-label">日期</span>
          <div className="rec-field-right">
            <input
              className="rec-select"
              type="date"
              value={recDate}
              onChange={(e) => setRecDate(e.target.value)}
            />
          </div>
        </div>

        {/* 金额输入 */}
        <div className="rec-field">
          <span className="rec-field-label">金额</span>
          <div className="rec-field-right">
            <input
              className="rec-select rec-number-input"
              type="number"
              placeholder="0.00"
              inputMode="decimal"
              value={recAmount === "0" ? "" : recAmount}
              onChange={(e) => {
                const val = e.target.value
                if (val === "" || parseFloat(val) >= 0) {
                  const parts = val.split(".")
                  if (parts[1]?.length <= 2) {
                    setRecAmount(val || "0")
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 备注 */}
        <div className="rec-field">
          <span className="rec-field-label">备注</span>
          <div className="rec-field-right">
            <input
              className="rec-select rec-note-field"
              placeholder="选填，如：超市买菜"
              value={recNote}
              onChange={(e) => setRecNote(e.target.value)}
              maxLength={40}
            />
          </div>
        </div>

        <button className="px-btn solid save-btn" onClick={saveRecord}>保存这一笔</button>
      </div>
    </>
  )
}
