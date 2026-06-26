import type { TxType } from "@/lib/types"
import type { Ledger } from "@/hooks/useLedger"

export function CategorySheet({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "catMgmtOpen"
    | "setCatMgmtOpen"
    | "cats"
    | "removeCat"
    | "newCatGlyph"
    | "setNewCatGlyph"
    | "newCatLabel"
    | "setNewCatLabel"
    | "newCatType"
    | "setNewCatType"
    | "addCat"
    | "setRecordOpen"
  >
}) {
  const {
    catMgmtOpen,
    setCatMgmtOpen,
    cats,
    removeCat,
    newCatGlyph,
    setNewCatGlyph,
    newCatLabel,
    setNewCatLabel,
    newCatType,
    setNewCatType,
    addCat,
    setRecordOpen,
  } = ledger

  return (
    <>
      <div className={`sheet-mask ${catMgmtOpen ? "show" : ""}`} onClick={() => setCatMgmtOpen(false)} />
      <div className={`sheet ${catMgmtOpen ? "show" : ""}`} role="dialog" aria-label="自定义分类">
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-title">自定义分类</div>
        <div className="cat-list">
          {cats.filter((c) => c.custom).map((c) => (
            <div className="cat-row" key={c.key}>
              <span className="cat-glyph-tag">{c.glyph}</span>
              <span className="cat-name-tag">{c.label}</span>
              <span className="cat-type-tag">{c.type === "out" ? "支出" : c.type === "in" ? "收入" : "存钱"}</span>
              <button className="cat-del-btn" onClick={() => removeCat(c.key)}>✕</button>
            </div>
          ))}
          {cats.filter((c) => c.custom).length === 0 && <div className="goal-empty">还没有自定义分类</div>}
        </div>
        <div className="goal-add">
          <div className="ga-title">新增分类</div>
          <div className="ga-row">
            <input className="ga-input ga-emoji" placeholder="图标" value={newCatGlyph} onChange={(e) => setNewCatGlyph(e.target.value)} maxLength={2} />
            <input className="ga-input ga-name" placeholder="分类名称" value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} />
          </div>
          <div className="cat-type-seg">
            {([["out", "支出"], ["in", "收入"], ["save", "存钱"]] as [TxType, string][]).map(([k, l]) => (
              <button key={k} className={`seg-btn ${newCatType === k ? "on" : ""}`} onClick={() => setNewCatType(k)}>{l}</button>
            ))}
          </div>
          <button className="px-btn ga-btn" onClick={addCat}>＋ 添加分类</button>
        </div>
        <button className="px-btn ghost goal-close" onClick={() => { setCatMgmtOpen(false); setRecordOpen(true) }}>返回记账</button>
      </div>
    </>
  )
}
