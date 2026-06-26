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
    | "recCat"
    | "setRecCat"
    | "cats"
    | "recMemberId"
    | "setRecMemberId"
    | "members"
    | "recNote"
    | "setRecNote"
    | "tapKey"
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
    recCat,
    setRecCat,
    cats,
    recMemberId,
    setRecMemberId,
    members,
    recNote,
    setRecNote,
    tapKey,
    saveRecord,
    setCatMgmtOpen,
  } = ledger

  return (
    <>
      <div className={`sheet-mask ${recordOpen ? "show" : ""}`} onClick={() => setRecordOpen(false)} />
      <div className={`sheet ${recordOpen ? "show" : ""}`} role="dialog" aria-label="记一笔">
        <div className="sheet-grab" aria-hidden="true" />
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
        <div className="rec-amount">
          <span className="rec-yen">¥</span>
          <span className="rec-num">{recAmount}</span>
        </div>
        <div className="rec-cats">
          {cats.filter((c) => c.type === recType).map((c) => (
            <button key={c.key} className={`rec-cat ${recCat === c.key ? "on" : ""}`} onClick={() => setRecCat(c.key)}>
              <span className="rc-glyph">{c.glyph}</span>
              {c.label}
            </button>
          ))}
          <button className="rec-cat add-cat-btn" onClick={() => { setRecordOpen(false); setCatMgmtOpen(true) }}>
            <span className="rc-glyph">+</span>
            自定义
          </button>
        </div>
        <div className="rec-members">
          <span className="rm-label">谁的账</span>
          {members.map((m) => (
            <button key={m.id} className={`rm-pill ${recMemberId === m.id ? "on" : ""}`} onClick={() => setRecMemberId(m.id)}>
              <img className="pixavatar xs" src={m.avatar || "/placeholder.svg"} alt="" aria-hidden="true" />
              {m.name}
            </button>
          ))}
        </div>
        <div className="rec-note-wrap">
          <span className="rec-note-ico">备注</span>
          <input className="rec-note-input" placeholder="选填，如：超市买菜" value={recNote} onChange={(e) => setRecNote(e.target.value)} maxLength={40} />
        </div>
        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => (
            <button key={k} className={`key ${k === "del" ? "del" : ""}`} onClick={() => tapKey(k)}>
              {k === "del" ? "⌫" : k}
            </button>
          ))}
        </div>
        <button className="px-btn solid save-btn" onClick={saveRecord}>保存这一笔</button>
      </div>
    </>
  )
}
