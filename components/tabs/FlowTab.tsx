import { formatFlowDate, yuan } from "@/lib/format"
import type { Ledger } from "@/hooks/useLedger"

export function FlowTab({
  ledger,
}: {
  ledger: Pick<Ledger, "currentMonth" | "flowMonthSummary" | "flowFilter" | "setFlowFilter" | "members" | "filteredFlow">
}) {
  const { currentMonth, flowMonthSummary, flowFilter, setFlowFilter, members, filteredFlow } = ledger

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
      </div>
      <div className="filters">
        <button className={`filter ${flowFilter === "all" ? "on" : ""}`} onClick={() => setFlowFilter("all")}>全部</button>
        {members.map((m) => (
          <button key={m.id} className={`filter ${flowFilter === m.id ? "on" : ""}`} onClick={() => setFlowFilter(m.id)}>{m.name}</button>
        ))}
      </div>
      {filteredFlow.length === 0 ? (
        <div className="flow-empty">
          <div className="flow-empty-ico">📋</div>
          <div className="flow-empty-txt">还没有账单记录，点 + 记第一笔吧</div>
        </div>
      ) : (
        <div className="flow-groups">
          {filteredFlow.map((group) => (
            <div className="flow-day" key={group.date}>
              <div className="flow-day-head">
                <span>{formatFlowDate(group.date)}</span>
                <span className={`flow-day-sum ${group.sum >= 0 ? "pos" : "neg"}`}>
                  {group.sum >= 0 ? "+" : ""}{yuan(Math.abs(group.sum))}
                </span>
              </div>
              {group.items.map((item) => (
                <div className="flow-item" key={item.id}>
                  <span className="flow-cat-glyph">{item.catGlyph}</span>
                  <div className="flow-item-main">
                    <div className="flow-item-cat">{item.catLabel}{item.note ? ` · ${item.note}` : ""}</div>
                    <div className="flow-item-sub">{item.memberName}</div>
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
