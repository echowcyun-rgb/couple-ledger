import { getGoalContribution } from "@/lib/goals"
import { yuan } from "@/lib/format"
import type { Ledger } from "@/hooks/useLedger"

export function HomeTab({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "members"
    | "currentMonth"
    | "activeGoal"
    | "pct"
    | "barWidth"
    | "monthSummary"
    | "memberSummaries"
    | "today"
    | "setGoalOpen"
    | "openRecord"
  >
}) {
  const { members, currentMonth, activeGoal, pct, barWidth, monthSummary, memberSummaries, today, setGoalOpen, openRecord } = ledger
  const now = new Date()
  const m0 = members[0]
  const m1 = members[1]

  return (
    <section className="page active">
      <header className="topbar">
        <div className="topinfo">
          <div className="sub">{currentMonth}月 · 一起好好过日子</div>
          <div className="names">俩人记账本</div>
        </div>
        <div className="duo">
          {members.slice(0, 2).map((m, i) => (
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
          <div className="battle-head">
            <div className="battle-title">★ 存钱大作战</div>
            <button className="px-btn ghost sm" onClick={() => setGoalOpen(true)}>管理目标</button>
          </div>
          {activeGoal ? (
            <>
              <div className="quest">{activeGoal.name} {activeGoal.emoji}</div>
              <div className="battle-amount">
                <span className="cur">¥{activeGoal.current.toLocaleString()}</span>
                <span className="tgt">目标 ¥{activeGoal.target.toLocaleString()}</span>
              </div>
              <div className="hpbar">
                <div className="hpfill" style={{ width: `${barWidth}%` }} />
              </div>
              <div className="eta">♥ 已完成 {pct}%，还差 ¥{(activeGoal.target - activeGoal.current).toLocaleString()} 就达成啦</div>
              <div className="players">
                {m0 && (
                  <div className="player">
                    <img className="pixavatar sm a" src={m0.avatar || "/placeholder.svg"} alt="" aria-hidden="true" />
                    <div className="pmeta">
                      <div className="pname">{m0.name}</div>
                      <div className="pval">¥{getGoalContribution(activeGoal, m0.id).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                <div className="vs">VS</div>
                {m1 && (
                  <div className="player right">
                    <div className="pmeta">
                      <div className="pname">{m1.name}</div>
                      <div className="pval">¥{getGoalContribution(activeGoal, m1.id).toLocaleString()}</div>
                    </div>
                    <img className="pixavatar sm b" src={m1.avatar || "/placeholder.svg"} alt="" aria-hidden="true" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-goal">
              <div className="no-goal-txt">还没有存钱目标</div>
              <button className="px-btn solid sm" onClick={() => setGoalOpen(true)}>+ 新增目标</button>
            </div>
          )}
        </div>
      </div>

      <div className="section-title">本月总览</div>
      <div className="grid">
        <div className="stat"><div className="top"><span className="ico in">↗</span><span className="label">收入</span></div><div className="num">{yuan(monthSummary.income)}</div></div>
        <div className="stat"><div className="top"><span className="ico out">↘</span><span className="label">支出</span></div><div className="num">{yuan(monthSummary.expense)}</div></div>
        <div className="stat"><div className="top"><span className="ico save">⊙</span><span className="label">存钱</span></div><div className="num">{yuan(monthSummary.savings)}</div></div>
        <div className="stat"><div className="top"><span className="ico net">▤</span><span className="label">结余</span></div><div className="num">{yuan(monthSummary.balance)}</div></div>
      </div>

      <div className="section-title">成员收支</div>
      <div className="card">
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
                    <span className="ptext">今天发工资啦！</span>
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
      </div>
    </section>
  )
}
