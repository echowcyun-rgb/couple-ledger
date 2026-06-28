import { useState } from "react"
import type { TxType } from "@/lib/types"
import type { Ledger } from "@/hooks/useLedger"
import { useSheetSwipe } from "@/hooks/useSheetSwipe"

const TYPE_GROUPS: { type: TxType; label: string }[] = [
  { type: "in", label: "收入" },
  { type: "out", label: "支出" },
  { type: "save", label: "存钱" },
]

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
    | "toast"
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
    toast,
  } = ledger

  const [adding, setAdding] = useState(false)
  const swipe = useSheetSwipe(() => setCatMgmtOpen(false), catMgmtOpen)

  function handleAdd() {
    if (adding) return
    const label = newCatLabel.trim()
    if (!label) { toast("请输入分类名称"); return }
    setAdding(true)
    addCat()
    setTimeout(() => setAdding(false), 500)
  }

  return (
    <>
      <div className={`sheet-mask ${catMgmtOpen ? "show" : ""}`} onClick={() => setCatMgmtOpen(false)} />
      <div
        className={`sheet ${catMgmtOpen ? "show" : ""}`}
        role="dialog"
        aria-label="分类管理"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-title">分类管理</div>
        {TYPE_GROUPS.map(({ type, label }) => {
          const groupCats = cats.filter((c) => c.type === type)
          if (groupCats.length === 0) return null
          return (
            <div className="cat-group" key={type}>
              <div className="cat-group-title">{label}</div>
              <div className="cat-list">
                {groupCats.map((c) => (
                  <div className="cat-row" key={c.key}>
                    <span className="cat-glyph-tag">{c.glyph}</span>
                    <span className="cat-name-tag">{c.label}</span>
                    {c.custom ? (
                      <button className="cat-del-btn" onClick={() => removeCat(c.key)} aria-label={`删除${c.label}`}>
                        ✕
                      </button>
                    ) : (
                      <span className="cat-type-tag">默认</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        <div className="goal-add">
          <div className="ga-title">新增分类</div>
          <div className="cat-type-seg">
            {([["out", "支出"], ["in", "收入"], ["save", "存钱"]] as [TxType, string][]).map(([k, l]) => (
              <button key={k} className={`seg-btn ${newCatType === k ? "on" : ""}`} onClick={() => setNewCatType(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="ga-row">
            <input
              className="ga-input ga-emoji"
              placeholder="图标"
              value={newCatGlyph}
              onChange={(e) => setNewCatGlyph(e.target.value)}
              maxLength={2}
            />
            <input
              className="ga-input ga-name"
              placeholder="分类名称"
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
            />
          </div>
          <button className="px-btn ga-btn" disabled={adding} onClick={handleAdd}>
            ＋ 添加分类
          </button>
        </div>
        <button className="px-btn ghost goal-close" onClick={() => { setCatMgmtOpen(false); setRecordOpen(true) }}>
          返回记账
        </button>
      </div>
    </>
  )
}
