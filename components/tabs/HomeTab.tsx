import { yuan } from "@/lib/format"
import type { Ledger } from "@/hooks/useLedger"

export function HomeTab({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "members"
    | "currentMonth"
    | "goals"
    | "monthSummary"
    | "memberSummaries"
    | "today"
    | "setGoalOpen"
    | "openRecord"
    | "openUpdateGoal"
  >
}) {
  const { members, currentMonth, goals, monthSummary, memberSummaries, today, setGoalOpen, openRecord, openUpdateGoal } = ledger
  const now = new Date()

  // 存钱目标卡片底色（实心，不受头部遮罩影响）
  const GOAL_CARD_COLORS = [
    "rgba(240, 160, 60, 0.92)",
    "rgba(240, 210, 140, 0.92)",
    "rgba(217, 106, 126, 0.92)",
  ]

  return (
    <section className="page active">
      <header className="topbar">
        <div className="topinfo">
          <div className="sub">{currentMonth}月 · 一起好好过日子</div>
          <div className="names">俩人记账本</div>
        </div>
        <div className="duo">
          {members.map((m, i) => (
            <span key={m.id} className="duo-item">
              <img className="pixavatar" src={m.avatar || "/placeholder.svg"} alt={m.name} />
              {i === 0 && members.length >= 2 && <span className="duo-heart" aria-hidden="true">♥</span>}
            </span>
          ))}
        </div>
      </header>

      <div className="battle">
        <div className="battle-pattern" aria-hidden="true" />
        <div className="battle-inner">
          <div className="battle-head-area">
            <div className="battle-white-overlay" aria-hidden="true" />
            <div className="battle-head">
              <div className="battle-title">★ 存钱大作战</div>
              <button className="px-btn ghost sm" onClick={() => setGoalOpen(true)}>管理目标</button>
            </div>
          </div>
          {goals.length > 0 ? (
            <div className="goal-cards">
              {goals
                .filter(g => g.current < g.target)
                .sort((a, b) => {
                  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
                  if (a.deadline) return -1
                  if (b.deadline) return 1
                  return 0
                })
                .slice(0, 3)
                .map((g, idx) => {
                  const gp = Math.min(100, Math.round((g.current / g.target) * 100))
                  const daysLeft = g.deadline
                    ? Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : null
                  return (
                    <div
                      key={g.id}
                      className="goal-card goal-card-clickable"
                      style={{ background: GOAL_CARD_COLORS[idx] || GOAL_CARD_COLORS[0] }}
                      role="button"
                      tabIndex={0}
                      aria-label={`更新目标进度 ${g.name}`}
                      onClick={() => openUpdateGoal(g.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          openUpdateGoal(g.id)
                        }
                      }}
                    >
                      <div className="goal-card-head">
                        <span className="goal-card-emoji">{g.emoji}</span>
                        <span className="goal-card-name">{g.name}</span>
                        {daysLeft !== null && (
                          <span className="goal-card-days">
                            {daysLeft === 0 ? "今天截止 ❗️" : `剩余 ${daysLeft} 天 ❗️`}
                          </span>
                        )}
                      </div>
                      <div className="hpbar"><div className="hpfill" style={{ width: `${gp}%` }} /></div>
                      <div className="goal-card-amt">
                        <span className="cur">¥{g.current}</span>
                        <span className="tgt">/ ¥{g.target}</span>
                      </div>
                      <div className="goal-card-hint">
                        {gp === 0 ? "从今天开始存吧 ✨" : `还差 ¥${g.target - g.current} · ${gp}%`}
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="no-goal">
              <div className="no-goal-txt">还没有存钱目标</div>
              <button className="px-btn solid sm" onClick={() => setGoalOpen(true)}>+ 新增目标</button>
            </div>
          )}
        </div>
      </div>

      <div className="section-title">本月总览</div>
      <div className="grid grid-5">
        <div className="stat"><div className="top"><span className="ico in">↗</span><span className="label">收入</span></div><div className="num">{yuan(monthSummary.income)}</div></div>
        <div className="stat"><div className="top"><span className="ico out">↘</span><span className="label">支出</span></div><div className="num">{yuan(monthSummary.expense)}</div></div>
        <div className="stat"><div className="top"><span className="ico save">⊙</span><span className="label">存钱</span></div><div className="num">{yuan(monthSummary.savings)}</div></div>
        <div className="stat"><div className="top"><span className="ico finance">★</span><span className="label">理财</span></div><div className="num">{yuan(monthSummary.financeIncome)}</div></div>
        <div className="stat"><div className="top"><span className="ico net">▤</span><span className="label">结余</span></div><div className="num">{yuan(monthSummary.balance)}</div></div>
      </div>

      <div className="section-title">成员收支</div>
      <div className="card">
        {members.length > 0 ? (
          <>
            <div className="pay-multi">
              {members.map((m) => {
                const mp = m.payday
                const mIsPayday = today === mp
                const dInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                const mDays = today < mp ? mp - today : dInMonth - today + mp
                return (
                  <div key={m.id} className={`payrow ${mIsPayday ? "today" : ""}`}>
                    <img className="pixavatar xs" src={m.avatar || "/placeholder.svg"} alt="" aria-hidden="true" />
                    <span className="pay-mname">{m.name}</span>
                    {mIsPayday ? (
                      <>
                        <span className="ptext payday-today-text">今天是发薪日，记得存一笔哦！</span>
                        <button className="px-btn solid sm" style={{ marginLeft: "auto" }} onClick={openRecord}>记一笔 ▶</button>
                      </>
                    ) : (
                      <>
                        <span className="ptext" style={{ marginLeft: 4 }}>还有</span>
                        <span className="pdays">{mDays}</span>
                        <span className="ptext">天发薪</span>
                        <span className="ptip" style={{ marginLeft: "auto" }}>每月 {mp} 号</span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="members">
              {members.map((m, i) => {
                const ms = memberSummaries.find((s) => s.memberId === m.id)
                return (
                  <div className="member" key={m.id}>
                    <div className="mhead">
                      <img className={`pixavatar sm ${i === 0 ? "a" : "b"}`} src={m.avatar || "/placeholder.svg"} alt="" aria-hidden="true" />
                      <div><div className="mname">{m.name}</div><div className="mtag">本月</div></div>
                    </div>
                    <div className="rows">
                      <div className="r"><span>收入</span><b className="in">{yuan(ms?.income ?? 0)}</b></div>
                      <div className="r"><span>支出</span><b className="out">{yuan(ms?.expense ?? 0)}</b></div>
                      <div className="r"><span>存钱</span><b className="save">{yuan(ms?.savings ?? 0)}</b></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="empty-hint">请先在「我的→成员管理」添加成员</div>
        )}
      </div>
    </section>
  )
}
