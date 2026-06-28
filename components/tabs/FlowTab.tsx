import { formatFlowDate, yuan } from "@/lib/format"
import type { Ledger } from "@/hooks/useLedger"
import { useState } from "react"

export function FlowTab({
  ledger,
}: {
  ledger: Pick<Ledger,
    | "currentMonth"
    | "flowMonthSummary"
    | "flowFilter"
    | "setFlowFilter"
    | "members"
    | "filteredFlow"
    | "transactions"
    | "cats"
    | "deleteTransaction"
    | "toast"
  >
}) {
  const { currentMonth, flowMonthSummary, flowFilter, setFlowFilter, members, filteredFlow, deleteTransaction, toast } = ledger

  // 类型筛选: "all" | "out" | "in" | "save"
  const [typeFilter, setTypeFilter] = useState<"all" | "out" | "in" | "save">("all")

  // 批量选中 ID
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 按类型过滤
  let displayItems = filteredFlow
    .map(g => ({
      ...g,
      items: typeFilter === "all" ? g.items : g.items.filter(i => i.type === typeFilter)
    }))
    .filter(g => g.items.length > 0)

  // 当前显示的所有 item id
  const allDisplayIds = new Set(displayItems.flatMap(g => g.items.map(i => i.id)))
  const allSelected = displayItems.length > 0 && displayItems.every(g => g.items.every(i => selectedIds.has(i.id)))

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allDisplayIds))
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`确认删除选中的 ${selectedIds.size} 条记录？此操作不可撤销。`)) return
    for (const id of selectedIds) {
      await deleteTransaction(id)
    }
    setSelectedIds(new Set())
    toast(`已删除 ${selectedIds.size} 条`)
  }

  return (
    <section className="page active">
      <header className="topbar">
        <div className="topinfo">
          <div className="sub">{currentMonth}月 · 全部账单</div>
          <div className="names">流水明细</div>
        </div>
      </header>
      <div className="flow-summary">
        <div className="fs-item"><div className="fs-label">收入</div><div className="fs-num in">{yuan(flowMonthSummary.income)}</div></div>
        <div className="fs-sep" aria-hidden="true" />
        <div className="fs-item"><div className="fs-label">支出</div><div className="fs-num out">{yuan(flowMonthSummary.expense)}</div></div>
        <div className="fs-sep" aria-hidden="true" />
        <div className="fs-item"><div className="fs-label">存钱</div><div className="fs-num save">{yuan(flowMonthSummary.savings)}</div></div>
        <div className="fs-sep" aria-hidden="true" />
        <div className="fs-item"><div className="fs-label">结余</div><div className="fs-num">{yuan(flowMonthSummary.balance)}</div></div>
      </div>
      {/* 类型筛选 */}
      <div className="filters">
        {([{ k: "all" as const, label: "全部" }, { k: "out" as const, label: "支出" }, { k: "in" as const, label: "收入" }, { k: "save" as const, label: "存钱" }]).map(f => (
          <button key={f.k} className={`filter ${typeFilter === f.k ? "on" : ""}`} onClick={() => setTypeFilter(f.k)}>{f.label}</button>
        ))}
      </div>
      {/* 经手人筛选 */}
      <div className="filters">
        <button className={`filter ${flowFilter === "all" ? "on" : ""}`} onClick={() => setFlowFilter("all")}>全部经手人</button>
        {members.map((m) => (
          <button key={m.id} className={`filter ${flowFilter === m.id ? "on" : ""}`} onClick={() => setFlowFilter(m.id)}>{m.name}</button>
        ))}
      </div>
      {/* 批量操作栏 */}
      {displayItems.length > 0 && (
        <div className="bulk-bar">
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" className="bulk-cb" checked={allSelected} onChange={toggleSelectAll} /> 全选
          </label>
          {selectedIds.size > 0 && (
            <>
              <button className="flow-act-btn flow-bulk-delete" onClick={handleBulkDelete}>删除选中（{selectedIds.size}条）</button>
              <button className="flow-act-btn flow-bulk-clear" onClick={() => setSelectedIds(new Set())}>取消选择</button>
            </>
          )}
        </div>
      )}
      {displayItems.length === 0 ? (
        <div className="flow-empty">
          <div className="flow-empty-ico">📋</div>
          <div className="flow-empty-txt">还没有账单记录，点 + 记第一笔吧</div>
        </div>
      ) : (
        <div className="flow-groups">
          {displayItems.map((group) => (
            <div className="flow-day" key={group.date}>
              <div className="flow-day-head">
                <span>{formatFlowDate(group.date)}</span>
                <span className={`flow-day-sum ${group.sum >= 0 ? "pos" : "neg"}`}>
                  {group.sum >= 0 ? "+" : ""}{yuan(Math.abs(group.sum))}
                </span>
              </div>
              {group.items.map((item) => (
                <div className="flow-item" key={item.id}>
                  <label style={{ marginRight: 4, flexShrink: 0, display: "flex", alignItems: "center" }}>
                    <input type="checkbox" className="bulk-cb" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  </label>
                  <span className="flow-cat-glyph">{item.catGlyph}</span>
                  <div className="flow-item-main">
                    <div className="flow-item-cat">{item.catLabel}{item.note ? ` · ${item.note}` : ""}</div>
                    <div className="flow-item-sub">{item.memberName}</div>
                  </div>
                  <div className="flow-item-actions">
                    <button className="flow-act-btn" onClick={() => { /* 编辑功能待接入弹窗 */ }}>改</button>
                    <button className="flow-act-btn del" onClick={async () => {
                      if (!confirm(`确认删除这条记录？`)) return
                      await deleteTransaction(item.id)
                    }}>删</button>
                  </div>
                  <span className={`flow-item-amt ${item.type}`}>
                    {item.type === "out" ? "-" : "+"}{yuan(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="flow-end">— 到底啦 —</div>
    </section>
  )
}
