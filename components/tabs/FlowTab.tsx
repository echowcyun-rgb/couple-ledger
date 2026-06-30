import { formatFlowDate, formatFlowDateLabel, formatFlowMonthLabel, yuan } from "@/lib/format"
import type { Ledger } from "@/hooks/useLedger"
import { useState, useRef } from "react"

export function FlowTab({
  ledger,
}: {
  ledger: Pick<Ledger,
    | "flowViewMode"
    | "setFlowViewMode"
    | "flowDate"
    | "setFlowDate"
    | "prevFlowDay"
    | "nextFlowDay"
    | "prevFlowMonth"
    | "nextFlowMonth"
    | "flowFilter"
    | "setFlowFilter"
    | "members"
    | "filteredFlow"
    | "transactions"
    | "cats"
    | "deleteTransaction"
    | "toast"
    | "openEditRecord"
  >
}) {
  const {
    flowViewMode,
    setFlowViewMode,
    flowDate,
    setFlowDate,
    prevFlowDay,
    nextFlowDay,
    prevFlowMonth,
    nextFlowMonth,
    flowFilter,
    setFlowFilter,
    members,
    filteredFlow,
    cats,
    deleteTransaction,
    toast,
    openEditRecord,
  } = ledger

  const today = new Date().toISOString().slice(0, 10)
  const todayYm = today.slice(0, 7)
  const isMonthView = flowViewMode === "month"

  // 类型筛选: "all" | "out" | "in" | "save"
  const [typeFilter, setTypeFilter] = useState<"all" | "out" | "in" | "save">("all")
  // 分类筛选
  const [catFilter, setCatFilter] = useState<string>("all")

  // 批量选中 ID
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 左滑状态
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)

  // 按类型和分类过滤
  const displayItems = filteredFlow
    .map(g => ({
      ...g,
      items: g.items.filter(i => {
        if (typeFilter !== "all" && i.type !== typeFilter) return false
        if (catFilter !== "all" && i.cat !== catFilter) return false
        return true
      })
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

  function toggleSelectDay(itemIds: string[]) {
    const daySelected = itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (daySelected) {
        itemIds.forEach((id) => next.delete(id))
      } else {
        itemIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    for (const id of selectedIds) {
      deleteTransaction(id)
    }
    setSelectedIds(new Set())
    toast(`已删除 ${count} 条`)
  }

  // 左滑触摸事件
  function handleTouchStart(e: React.TouchEvent, id: string) {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = touchStartX.current
    if (swipedId && swipedId !== id) {
      setSwipedId(null)
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchCurrentX.current = e.touches[0].clientX
  }

  function handleTouchEnd(id: string) {
    applySwipeResult(id)
  }

  function handleMouseDown(e: React.MouseEvent, id: string) {
    touchStartX.current = e.clientX
    touchCurrentX.current = e.clientX
    if (swipedId && swipedId !== id) {
      setSwipedId(null)
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    touchCurrentX.current = e.clientX
  }

  function handleMouseUp(id: string) {
    applySwipeResult(id)
  }

  function applySwipeResult(id: string) {
    const diff = touchStartX.current - touchCurrentX.current
    if (diff > 60) {
      setSwipedId(id)
    } else if (diff < -30) {
      setSwipedId(null)
    }
  }

  function handleSwipeDelete(id: string) {
    deleteTransaction(id)
    setSwipedId(null)
  }

  function handleItemClick(id: string) {
    if (swipedId === id) {
      setSwipedId(null)
      return
    }
    setSwipedId(null)
    openEditRecord(id)
  }

  return (
    <section className="page active">
      <header className="topbar">
        <div className="topinfo">
          <div className="sub">
            {isMonthView ? `${formatFlowMonthLabel(flowDate)} · 全部账单` : `${formatFlowDateLabel(flowDate)} · 当日账单`}
          </div>
          <div className="names">流水明细</div>
        </div>
      </header>
      <div className="flow-filter-row">
        <div className="flow-view-toggle">
          <button
            className={`filter ${isMonthView ? "on" : ""}`}
            onClick={() => setFlowViewMode("month")}
            type="button"
          >
            按月
          </button>
          <button
            className={`filter ${!isMonthView ? "on" : ""}`}
            onClick={() => setFlowViewMode("day")}
            type="button"
          >
            按日
          </button>
        </div>
        <div className="flow-month-switch">
          {isMonthView ? (
            <>
              <button className="ms-btn" onClick={prevFlowMonth} type="button" aria-label="上一月">◀</button>
              <span className="ms-now">{formatFlowMonthLabel(flowDate)}</span>
              <button
                className="ms-btn"
                onClick={nextFlowMonth}
                type="button"
                aria-label="下一月"
                disabled={flowDate.slice(0, 7) >= todayYm}
              >
                ▶
              </button>
              <input
                className="flow-date-input"
                type="month"
                value={flowDate.slice(0, 7)}
                max={todayYm}
                onChange={(e) => {
                  if (e.target.value) setFlowDate(`${e.target.value}-01`)
                }}
                aria-label="选择月份"
              />
            </>
          ) : (
            <>
              <button className="ms-btn" onClick={prevFlowDay} type="button" aria-label="前一天">◀</button>
              <span className="ms-now">{formatFlowDateLabel(flowDate)}</span>
              <button
                className="ms-btn"
                onClick={nextFlowDay}
                type="button"
                aria-label="后一天"
                disabled={flowDate >= today}
              >
                ▶
              </button>
              <input
                className="flow-date-input"
                type="date"
                value={flowDate}
                max={today}
                onChange={(e) => {
                  if (e.target.value) setFlowDate(e.target.value)
                }}
                aria-label="选择日期"
              />
            </>
          )}
        </div>
        <div className="filters">
          {([{ k: "all" as const, label: "全部" }, { k: "out" as const, label: "支出" }, { k: "in" as const, label: "收入" }, { k: "save" as const, label: "存钱" }]).map(f => (
            <button key={f.k} className={`filter ${typeFilter === f.k ? "on" : ""}`} onClick={() => setTypeFilter(f.k)} type="button">{f.label}</button>
          ))}
        </div>
        <div className="rec-field flow-cat-select">
          <span className="rec-field-label">分类</span>
          <select
            className="rec-select"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="all">全部分类</option>
            {cats.map(c => (
              <option key={c.key} value={c.key}>{c.glyph} {c.label}</option>
            ))}
          </select>
        </div>
        <div className="filters">
          <button className={`filter ${flowFilter === "all" ? "on" : ""}`} onClick={() => setFlowFilter("all")} type="button">全部经手人</button>
          {members.map((m) => (
            <button key={m.id} className={`filter ${flowFilter === m.id ? "on" : ""}`} onClick={() => setFlowFilter(m.id)} type="button">{m.name}</button>
          ))}
        </div>
      </div>
      {displayItems.length > 0 && (
        <div className="bulk-bar">
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" className="bulk-cb" checked={allSelected} onChange={toggleSelectAll} /> {isMonthView ? "全选本月" : "全选当日"}
          </label>
          {selectedIds.size > 0 && (
            <>
              <button className="flow-act-btn flow-bulk-delete" onClick={handleBulkDelete} type="button">删除选中（{selectedIds.size}条）</button>
              <button className="flow-act-btn flow-bulk-clear" onClick={() => setSelectedIds(new Set())} type="button">取消选择</button>
            </>
          )}
        </div>
      )}
      {displayItems.length === 0 ? (
        <div className="flow-empty">
          <div className="flow-empty-ico">📋</div>
          <div className="flow-empty-txt">
            {isMonthView ? "这个月还没有账单，点 + 记第一笔吧" : "这一天还没有账单，点 + 记一笔吧"}
          </div>
        </div>
      ) : (
        <div className="flow-groups">
          {displayItems.map((group) => {
            const dayIds = group.items.map((i) => i.id)
            const daySelected = dayIds.length > 0 && dayIds.every((id) => selectedIds.has(id))
            return (
              <div className="flow-day" key={group.date}>
                <div className="flow-day-head">
                  <label className="flow-day-select">
                    <input
                      type="checkbox"
                      className="bulk-cb"
                      checked={daySelected}
                      onChange={() => toggleSelectDay(dayIds)}
                    />
                    <span>{formatFlowDate(group.date)}</span>
                  </label>
                  <span className={`flow-day-sum ${group.sum >= 0 ? "pos" : "neg"}`}>
                    {group.sum >= 0 ? "+" : ""}{yuan(Math.abs(group.sum))}
                  </span>
                </div>
                {group.items.map((item) => (
                  <div
                    className="flow-item-swipe-wrap"
                    key={item.id}
                    onTouchStart={(e) => handleTouchStart(e, item.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => handleTouchEnd(item.id)}
                    onMouseDown={(e) => handleMouseDown(e, item.id)}
                    onMouseMove={handleMouseMove}
                    onMouseUp={() => handleMouseUp(item.id)}
                  >
                    <div
                      className={`flow-item ${swipedId === item.id ? "swiped" : ""}`}
                      onClick={() => handleItemClick(item.id)}
                    >
                      <label style={{ marginRight: 4, flexShrink: 0, display: "flex", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="bulk-cb" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                      </label>
                      <span className="flow-cat-glyph">{item.catGlyph}</span>
                      <div className="flow-item-main">
                        <div className="flow-item-cat">{item.catLabel}{item.note ? ` · ${item.note}` : ""}</div>
                        <div className="flow-item-sub">{item.memberName}</div>
                      </div>
                      <span className={`flow-item-amt ${item.type}`}>
                        {item.type === "out" ? "-" : "+"}{yuan(item.amount)}
                      </span>
                    </div>
                    {swipedId === item.id && (
                      <button
                        className="flow-swipe-del"
                        onClick={(e) => { e.stopPropagation(); handleSwipeDelete(item.id); }}
                        type="button"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
      <div className="flow-end">— 到底啦 —</div>
    </section>
  )
}
