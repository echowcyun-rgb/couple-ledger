import { THEMES } from "@/lib/constants"
import { coupleBgInlineStyle, hasCoupleBg } from "@/lib/couple-bg"
import type { ThemeKey } from "@/lib/types"
import type { Ledger } from "@/hooks/useLedger"
import { useState } from "react"

export function MineTab({
  ledger,
  onSelectImportMember,
  onSelectExportMember,
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
    | "openRevertImport"
    | "avatarRef"
    | "onAvatarFile"
    | "setCatMgmtOpen"
    | "cats"
  >
  onSelectImportMember: (memberId: string) => void
  onSelectExportMember: (memberId: string) => void
}) {
  const {
    coupleDays,
    members,
    coupleBg,
    coupleBgRef,
    onCoupleBgFile,
    theme,
    setTheme,
    toast,
    goals,
    setGoalOpen,
    remindOn,
    setRemindOn,
    setMemberPageOpen,
    fileRef,
    onImportFile,
    openRevertImport,
    avatarRef,
    onAvatarFile,
    setCatMgmtOpen,
    cats,
  } = ledger

  const [confirmSwitch, setConfirmSwitch] = useState(false)
  const [importMemberPicker, setImportMemberPicker] = useState(false)
  const [pendingImportAction, setPendingImportAction] = useState<"import" | "export">("import")

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
        style={coupleBgInlineStyle(coupleBg)}
        onClick={() => coupleBgRef.current?.click()}
        role="button"
        aria-label="点击更换背景图"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") coupleBgRef.current?.click() }}
      >
        {!hasCoupleBg(coupleBg) && <div className="couple-pattern" aria-hidden="true" />}
        {hasCoupleBg(coupleBg) && <div className="couple-bg-mask" aria-hidden="true" />}
        <div className="couple-inner couple-inner-new">
          <div className="couple-left">
            <div className="couple-avatars-new">
              {members.map((m, i) => (
                <span key={m.id} className="couple-av-item">
                  <span className="couple-av-top">
                    <img className="pixavatar couple-av" src={m.avatar || "/placeholder.svg"} alt={m.name} />
                    {i === 0 && members.length >= 2 && <span className="couple-heart" aria-hidden="true">♥</span>}
                  </span>
                  <span className="couple-av-name">{m.name}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="couple-right">
            <div className="couple-days-oneline">
              <span className="couple-days-label">开始记账</span>
              <span className="couple-days-num">{coupleDays}</span>
              <span className="couple-days-unit">天啦</span>
            </div>
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
        <button className="setrow" onClick={() => {
          setPendingImportAction("export")
          setImportMemberPicker(true)
        }}>
          <span className="set-ico s6">出</span><span className="set-label">导出账单</span>
          <span className="set-val">.xlsx</span><span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={() => {
          setPendingImportAction("import")
          setImportMemberPicker(true)
        }}>
          <span className="set-ico s8">入</span><span className="set-label">导入账单</span>
          <span className="set-val">csv / xlsx</span><span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={openRevertImport}>
          <span className="set-ico s8" style={{ background: "var(--out)" }}>撤</span>
          <span className="set-label">撤销导入</span>
          <span className="set-val">最近 3 次</span>
          <span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={() => toast("俩人记账本 v1.0")}>
          <span className="set-ico s7">关</span><span className="set-label">关于</span>
          <span className="set-val">v1.0</span><span className="set-arrow">›</span>
        </button>
        <button className="setrow" onClick={() => setConfirmSwitch(true)}>
          <span className="set-ico s5" style={{ background: "var(--out)" }}>↩</span><span className="set-label">换房间</span>
          <span className="set-val">保留数据，重新选择</span><span className="set-arrow">›</span>
        </button>
      </div>
      {confirmSwitch && (
        <>
          <div className="sheet-mask show" onClick={() => setConfirmSwitch(false)} />
          <div className="sheet show" style={{ padding: 20, textAlign: "center" }}>
            <div className="sheet-title">确认换房间？</div>
            <p style={{ fontSize: 11, color: "var(--text-sub)", margin: "8px 0 16px" }}>
              本地数据会保留，但将退出当前房间连接
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="px-btn ghost" style={{ flex: 1 }} onClick={() => setConfirmSwitch(false)}>取消</button>
              <button
                className="px-btn solid"
                style={{ flex: 1 }}
                onClick={() => {
                  localStorage.removeItem("couple-room-id")
                  window.location.reload()
                }}
              >
                确认换房间
              </button>
            </div>
          </div>
        </>
      )}
      {importMemberPicker && (
        <>
          <div className="sheet-mask show" onClick={() => setImportMemberPicker(false)} />
          <div className="sheet show" style={{ padding: 20, textAlign: "center" }}>
            <div className="sheet-title">选择{pendingImportAction === "import" ? "导入" : "导出"}的成员</div>
            <p style={{ fontSize: 11, color: "var(--text-sub)", margin: "8px 0 16px" }}>
              账单将{pendingImportAction === "import" ? "归入" : "导出"}所选成员名下
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {members.map((m) => (
                <button
                  key={m.id}
                  className="px-btn ghost"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  onClick={() => {
                    setImportMemberPicker(false)
                    if (pendingImportAction === "import") {
                      onSelectImportMember(m.id)
                    } else {
                      onSelectExportMember(m.id)
                    }
                  }}
                >
                  <img className="pixavatar" src={m.avatar || "/placeholder.svg"} alt={m.name} style={{ width: 24, height: 24 }} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onImportFile} />
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onAvatarFile} />
    </section>
  )
}
