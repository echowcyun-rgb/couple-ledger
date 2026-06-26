import { TrendCard } from "@/components/charts/TrendCard"
import { StructureCard } from "@/components/charts/StructureCard"
import { yuan } from "@/lib/format"
import type { Ledger } from "@/hooks/useLedger"

export function ReviewTab({ ledger }: { ledger: Pick<Ledger,
  | "reviewMonth"
  | "reviewSummary"
  | "members"
  | "getInTrendData"
  | "getOutTrendData"
  | "expensePie"
  | "getYearExpensePie"
  | "structureStats"
  | "prevReviewMonth"
  | "nextReviewMonth"
  | "transactions"
  | "habitAnalysis"
  | "reviewPlan"
  | "planBudgetTarget"
  | "setPlanBudgetTarget"
  | "planSavingsTarget"
  | "setPlanSavingsTarget"
  | "saveReviewPlanState"
> }) {
  const {
    reviewMonth,
    reviewSummary,
    members,
    getInTrendData,
    getOutTrendData,
    expensePie,
    getYearExpensePie,
    structureStats,
    prevReviewMonth,
    nextReviewMonth,
    transactions,
    habitAnalysis,
    reviewPlan,
    planBudgetTarget,
    setPlanBudgetTarget,
    planSavingsTarget,
    setPlanSavingsTarget,
    saveReviewPlanState,
  } = ledger
  const hasData = transactions.length > 0

  return (
    <section className="page active">
      <header className="topbar">
        <div className="topinfo">
          <div className="sub">月度复盘</div>
          <div className="names">看看花在哪</div>
        </div>
        <div className="month-switch">
          <button className="ms-btn" onClick={prevReviewMonth}>◀</button>
          <span className="ms-now">{reviewMonth}月</span>
          <button className="ms-btn" onClick={nextReviewMonth}>▶</button>
        </div>
      </header>
      <div className="review-top">
        <div className="rt-cell"><div className="rt-l">收入</div><div className="rt-v in">{yuan(reviewSummary.income)}</div></div>
        <div className="rt-cell"><div className="rt-l">支出</div><div className="rt-v out">{yuan(reviewSummary.expense)}</div></div>
        <div className="rt-cell"><div className="rt-l">结余</div><div className="rt-v">{yuan(reviewSummary.balance)}</div></div>
      </div>
      <div className="section-title">习惯分析</div>
      <div className="card">
        <div className="stat-table">
          <div className="st-row"><span className="st-l">TOP3支出分类</span><span className="st-v">{habitAnalysis.topCategories.length ? habitAnalysis.topCategories.map((t) => `${t.name} ${yuan(t.amount)}(${t.pct}%)`).join(" · ") : "—"}</span></div>
          <div className="st-row"><span className="st-l">环比变化</span><span className="st-v">{habitAnalysis.momChange}</span></div>
          <div className="st-row"><span className="st-l">大额消费提醒</span><span className="st-v">{habitAnalysis.bigSpends.length ? `${habitAnalysis.bigSpends.length} 笔超过日均×3` : "暂无"}</span></div>
        </div>
        {habitAnalysis.bigSpends.length > 0 && (
          <div className="tip-card" style={{ marginTop: 12 }}>
            <span className="tip-ico">!</span>
            <span>{habitAnalysis.bigSpends[0].date} {habitAnalysis.bigSpends[0].note} {yuan(habitAnalysis.bigSpends[0].amount)}，{habitAnalysis.bigSpends[0].flag}</span>
          </div>
        )}
      </div>
      <div className="section-title">下月计划</div>
      <div className="card">
        {reviewPlan ? (
          <div className="tip-card" style={{ marginBottom: 12 }}>
            <span className="tip-ico">✓</span>
            <span>
              已加载上月计划：预算 {yuan(reviewPlan.budgetTarget)}，存钱 {yuan(reviewPlan.savingsTarget)}
            </span>
          </div>
        ) : (
          <div className="tip-card" style={{ marginBottom: 12 }}>
            <span className="tip-ico">i</span>
            <span>还没有找到上月计划，先设定一个吧</span>
          </div>
        )}
        <div className="rows">
          <div className="r"><span>预算目标</span><input className="ga-input" inputMode="decimal" value={planBudgetTarget} onChange={(e) => setPlanBudgetTarget(e.target.value)} placeholder="例如 12000" /></div>
          <div className="r"><span>存钱目标</span><input className="ga-input" inputMode="decimal" value={planSavingsTarget} onChange={(e) => setPlanSavingsTarget(e.target.value)} placeholder="例如 3000" /></div>
        </div>
        <button className="px-btn solid sm" onClick={saveReviewPlanState}>保存下月计划</button>
      </div>
      <div className="section-title">收入趋势</div>
      <TrendCard getData={getInTrendData} members={members} totalColor="#3DAE83" />
      <div className="section-title">支出趋势</div>
      <TrendCard getData={getOutTrendData} members={members} totalColor="#D96A7E" />
      <div className="section-title">支出结构</div>
      <StructureCard monthData={expensePie} yearData={getYearExpensePie()} stats={structureStats} />
      {!hasData && (
        <div className="tip-card">
          <span className="tip-ico">!</span>
          <span>记录更多账单后，这里将展示你们的消费习惯分析</span>
        </div>
      )}
    </section>
  )
}
