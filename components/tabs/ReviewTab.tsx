import { TrendCard } from "@/components/charts/TrendCard"
import { StructureCard } from "@/components/charts/StructureCard"
import { yuan } from "@/lib/format"
import type { Ledger } from "@/hooks/useLedger"

export function ReviewTab({ ledger }: { ledger: Pick<Ledger,
  | "reviewYear"
  | "reviewMonth"
  | "members"
  | "getInTrendData"
  | "getOutTrendData"
  | "getFinanceTrendData"
  | "reviewSummary"
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
    reviewYear,
    reviewMonth,
    members,
    getInTrendData,
    getOutTrendData,
    getFinanceTrendData,
    reviewSummary,
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
  const budgetRate = reviewPlan ? Math.min(100, Math.round(((reviewPlan.budgetDone ?? 0) / Math.max(1, reviewPlan.budgetTarget)) * 100)) : 0
  const savingsRate = reviewPlan ? Math.min(100, Math.round(((reviewPlan.savingsDone ?? 0) / Math.max(1, reviewPlan.savingsTarget)) * 100)) : 0

  return (
    <section className="page active">
      <header className="topbar">
        <div className="topinfo">
          <div className="sub">月度复盘</div>
          <div className="names">看看花在哪</div>
        </div>
        <div className="month-switch">
          <button className="ms-btn" onClick={prevReviewMonth}>◀</button>
          <span className="ms-now">{reviewYear}年 {reviewMonth}月</span>
          <button className="ms-btn" onClick={nextReviewMonth}>▶</button>
        </div>
      </header>
      <div className="section-title">习惯分析</div>
      <div className="card">
        <div className="stat-table">
          <div className="st-row"><span className="st-l">TOP3支出分类</span><span className="st-v">{habitAnalysis.topCategories.length ? habitAnalysis.topCategories.map((t) => `${t.name} ${yuan(t.amount)}(${t.pct}%)`).join(" · ") : "—"}</span></div>
          <div className="st-row"><span className="st-l">环比变化</span><span className="st-v">{habitAnalysis.momChange}</span></div>
          <div className="st-row"><span className="st-l">当月理财收入</span><span className="st-v">{reviewSummary.financeIncome > 0 ? yuan(reviewSummary.financeIncome) : "暂无"}</span></div>
        </div>
        {habitAnalysis.bigSpends.length > 0 && (
          <div className="big-spend-alert">
            <div className="big-spend-alert-title">
              <span className="tip-ico warn-ico">!</span>
              <span>大额消费提醒 · {habitAnalysis.bigSpends.length} 笔超过日均×3</span>
            </div>
            <div className="big-spend-list">
              {habitAnalysis.bigSpends.map((s, i) => (
                <div key={i} className="big-spend-row">
                  <span>{s.date}</span>
                  <span>{s.note}</span>
                  <span className="big-spend-amt">{yuan(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {habitAnalysis.bigSpends.length === 0 && (
          <div className="stat-table">
            <div className="st-row"><span className="st-l">大额消费提醒</span><span className="st-v">暂无</span></div>
          </div>
        )}
      </div>
      <div className="section-title">下月计划</div>
      <div className="card">
        {reviewPlan ? (
          <div className="tip-card" style={{ marginBottom: 12 }}>
            <span className="tip-ico">✓</span>
            <span>
              已加载上月计划：预算 {yuan(reviewPlan.budgetTarget)}，存钱 {yuan(reviewPlan.savingsTarget)} · 完成率 {budgetRate}% / {savingsRate}%
            </span>
          </div>
        ) : (
          <div className="tip-card" style={{ marginBottom: 12 }}>
            <span className="tip-ico">i</span>
            <span>还没有找到上月计划，先设定一个吧</span>
          </div>
        )}
        <div className="rows review-plan-rows">
          <div className="r"><span>预算目标</span><input className="ga-input" inputMode="decimal" value={planBudgetTarget} onChange={(e) => setPlanBudgetTarget(e.target.value)} placeholder="例如 12000" /></div>
          <div className="r"><span>存钱目标</span><input className="ga-input" inputMode="decimal" value={planSavingsTarget} onChange={(e) => setPlanSavingsTarget(e.target.value)} placeholder="例如 3000" /></div>
        </div>
        <div className="review-plan-footer">
          <button type="button" className="px-btn review-plan-save" onClick={saveReviewPlanState}>保存下月计划</button>
        </div>
      </div>
      <div className="section-title">收入趋势</div>
      <TrendCard getData={getInTrendData} members={members} totalColor="#3DAE83" refYear={reviewYear} refMonth={reviewMonth} />
      <div className="section-title">理财趋势</div>
      <TrendCard getData={getFinanceTrendData} members={members} totalColor="#A99BD6" refYear={reviewYear} refMonth={reviewMonth} />
      <div className="section-title">支出趋势</div>
      <TrendCard getData={getOutTrendData} members={members} totalColor="#D96A7E" refYear={reviewYear} refMonth={reviewMonth} />
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
