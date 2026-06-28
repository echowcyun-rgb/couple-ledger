import { THEMES } from "@/lib/constants"
import type { ThemeKey } from "@/lib/types"
import type { Ledger } from "@/hooks/useLedger"

export function MineTab({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "coupleDays"
    | "members"
    | "coupleBg"
    | "coupleBgRef"
    | "onCoupleBgFile"
    | "theme"
    | "setTheme"
    | "payday"
    | "toast"
    | "goals"
    | "setGoalOpen"
    | "remindOn"
    | "setRemindOn"
    | "setMemberPageOpen"
    | "fileRef"
    | "onImportFile"
    | "avatarRef"
    | "onAvatarFile"
    | "exportTransactionsXlsx"
    | "setCatMgmtOpen"
    | "cats"
  >
}) {
  const {
    coupleDays,
    members,
    coupleBg,
    coupleBgRef,
    onCoupleBgFile,
    theme,
    setTheme,
    payday,
    toast,
    goals,
    setGoalOpen,
    remindOn,
    setRemindOn,
    setMemberPageOpen,
    fileRef,
    onImportFile,
    avatarRef,
    onAvatarFile,
    exportTransactionsXlsx,
    setCatMgmtOpen,
    cats,
  } = ledger

  return (
    <section className="page active">
      <header className="topbar">
        <div className="topinfo">
          <div className="sub">第 {coupleDays} 天</div>
          <div className="names">我们的小窝</div>
        </div>
      </header>
      <div
        className="couple-card"
        style={coupleBg ? { backgroundImage: `url(${coupleBg})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        onClick={() => coupleBgRef.current?.click()}
        role="button"
        aria-label="点击更换背景图"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") coupleBgRef.current?.click() }}
      >
        {!coupleBg && <div className="couple-pattern" aria-hidden="true" />}
        {coupleBg && <div className="couple-bg-mask" aria-hidden="true" />}
        <div className="couple-inner couple-inner-new">
          <div className="couple-left">
            <div className="couple-avatars-new">
              {members.map((m) => (
                <img key={m.id} className="pixavatar couple-av" src={m.avatar || "/placeholder.svg"} alt={m.name} />
              ))}
              {members.length >= 2 && <span className="couple-heart" aria-hidden="true">♥</span>}
            </div>
            <div className="couple-names-row">{members.map((m) => m.name).join(" & ")}</div>
          </div>
          <div className="couple-right">
            <div className="couple-days-label">一起记账的</div>
            <div className="couple-days-num">{coupleDays}</div>
            <div className="couple-days-unit">天啦</div>
          </div>
        </div>
        <div className="couple-card-hint">点击换背景</div>
        <input ref={coupleBgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onCoupleBgFile} />
      </div>

      <div className="section-title">主题皮肤</div>
      <div className="theme-pills">
        {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
          <button key={k} className={`theme-pill ${theme === k ? "on" : ""}`} onClick={() => setTheme(k)}>
            <span className="swatch" style={{ background: THEMES[k].dot }} />
            {THEMES[k].label}
          </button>
        ))}
      </div>

      <div className="section-title">记账设置</div>
      <div className="setlist">
        <div className="setrow" onClick={() => {
          navigator.clipboard.writeText(localStorage.getItem("couple-room-id") || "")
          toast("已复制房间号")
        }} style={{ cursor: "pointer" }}>
          <span className="set-ico s5">🏠</span><span className="set-label">房间号</span>
          <span className="set-val">{localStorage.getItem("couple-room-id") || "—"}</span><span className="set-arrow">›</span>
        </div>
        <button className="setrow" onClick={() => setMemberPageOpen(true)}>
          <span className="set-ico s1">薪</span><span className="set-label">发薪日</span>
          <span className="set-val">成员管理里可分别修改</span><span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={() => setCatMgmtOpen(true)}>
          <span className="set-ico s2">分</span><span className="set-label">分类管理</span>
          <span className="set-val">{cats.length} 个</span><span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={() => setGoalOpen(true)}>
          <span className="set-ico s3">储</span><span className="set-label">存钱目标</span>
          <span className="set-val">{goals.length} 个</span><span className="set-arrow">›</span>
        </button>
        <div className="setrow">
          <span className="set-ico s4">铃</span><span className="set-label">记账提醒</span>
          <button className={`switch ${remindOn ? "on" : ""}`} aria-label="记账提醒开关" onClick={() => setRemindOn((v) => !v)}>
            <span className="knob" />
          </button>
        </div>
      </div>

      <div className="section-title">成员与偏好</div>
      <div className="setlist">
        <button className="setrow" onClick={() => setMemberPageOpen(true)}>
          <span className="set-ico s5">伴</span><span className="set-label">成员管理</span>
          <span className="set-val">{members.length} 人</span><span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={exportTransactionsXlsx}>
          <span className="set-ico s6">出</span><span className="set-label">导出账单</span>
          <span className="set-val">.xlsx</span><span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={() => fileRef.current?.click()}>
          <span className="set-ico s8">入</span><span className="set-label">导入账单</span>
          <span className="set-val">.xlsx</span><span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={() => toast("俩人记账本 v1.0")}>
          <span className="set-ico s7">关</span><span className="set-label">关于</span>
          <span className="set-val">v1.0</span><span className="set-arrow">›</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onImportFile} />
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onAvatarFile} />
    </section>
  )
}
