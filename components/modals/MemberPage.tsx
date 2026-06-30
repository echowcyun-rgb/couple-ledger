import { SYS_AVATARS_FEMALE, SYS_AVATARS_MALE } from "@/lib/constants"
import type { Gender } from "@/lib/types"
import type { Ledger } from "@/hooks/useLedger"
import { useState } from "react"

export function MemberPage({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "memberPageOpen"
    | "setMemberPageOpen"
    | "editingMember"
    | "setEditingMember"
    | "members"
    | "editAvatar"
    | "setEditAvatar"
    | "editName"
    | "setEditName"
    | "editGender"
    | "setEditGender"
    | "editPayday"
    | "setEditPayday"
    | "avatarRef"
    | "openEditMember"
    | "saveEditMember"
    | "addMember"
    | "removeMember"
  >
}) {
  const {
    setMemberPageOpen,
    setEditingMember,
    editingMember,
    members,
    editAvatar,
    setEditAvatar,
    editName,
    setEditName,
    editGender,
    setEditGender,
    editPayday,
    setEditPayday,
    avatarRef,
    openEditMember,
    saveEditMember,
    addMember,
    removeMember,
  } = ledger

  const [saving, setSaving] = useState(false)

  const genderedAvatars =
    editGender === "female" ? SYS_AVATARS_FEMALE : editGender === "male" ? SYS_AVATARS_MALE : []

  function handleGenderChange(nextGender: Gender) {
    setEditGender(nextGender)
    const pool =
      nextGender === "female" ? SYS_AVATARS_FEMALE : nextGender === "male" ? SYS_AVATARS_MALE : []
    if (editAvatar && !pool.includes(editAvatar) && !editAvatar.startsWith("data:")) {
      setEditAvatar("")
    }
  }

  function handleSave() {
    if (saving) return
    setSaving(true)
    saveEditMember()
    setTimeout(() => setSaving(false), 500)
  }

  if (!ledger.memberPageOpen) return null

  return (
    <div
      className="member-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-modal-title"
      onClick={() => {
        setMemberPageOpen(false)
        setEditingMember(null)
      }}
    >
      <div className="member-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="member-modal-header">
          <button
            className="fp-back"
            onClick={() => {
              setMemberPageOpen(false)
              setEditingMember(null)
            }}
            type="button"
          >
            ‹ 返回
          </button>
          <div className="fp-title" id="member-modal-title">
            成员管理
          </div>
          {members.length < 2 && (
            <button className="fp-action" onClick={addMember} type="button">
              + 新增
            </button>
          )}
        </div>
        <div className="member-modal-body">
          {editingMember ? (
            <div className="member-edit">
              <div className="me-avatar-wrap">
                <img className="me-avatar" src={editAvatar || "/placeholder.svg"} alt="头像" />
              </div>
              <div className="me-av-section-label">
                {editGender === "other" ? "上传头像" : "选择系统头像"}
              </div>
              {editGender === "other" ? (
                <div className="me-av-grid me-av-grid-single">
                  <button className="me-av-opt me-av-upload" onClick={() => avatarRef.current?.click()} aria-label="上传本地图片" type="button">
                    <span className="me-av-upload-ico">+</span>
                  </button>
                </div>
              ) : (
                <div className="me-av-grid">
                  {genderedAvatars.map((src) => (
                    <button
                      key={src}
                      className={`me-av-opt ${editAvatar === src ? "on" : ""}`}
                      onClick={() => setEditAvatar(src)}
                      aria-label={src}
                      type="button"
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                  <button className="me-av-opt me-av-upload" onClick={() => avatarRef.current?.click()} aria-label="上传本地图片" type="button">
                    <span className="me-av-upload-ico">+</span>
                  </button>
                </div>
              )}
              <div className="me-field">
                <label className="me-label">昵称</label>
                <input className="me-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="输入昵称" />
              </div>
              <div className="me-field">
                <label className="me-label">性别</label>
                <div className="me-gender">
                  {([["female", "女"], ["male", "男"], ["other", "其他"]] as [Gender, string][]).map(([g, l]) => (
                    <button key={g} className={`me-g-btn ${editGender === g ? "on" : ""}`} onClick={() => handleGenderChange(g)} type="button">
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="me-field">
                <label className="me-label">发薪日</label>
                <div className="me-payday-row">
                  <span className="me-pd-pre">每月</span>
                  <input
                    className="me-input me-pd-input"
                    type="number"
                    min={1}
                    max={31}
                    value={editPayday}
                    onChange={(e) => setEditPayday(Math.max(1, Math.min(31, Number(e.target.value))))}
                  />
                  <span className="me-pd-suf">号</span>
                </div>
              </div>
              <div className="me-btns">
                <button className="px-btn ghost" onClick={() => setEditingMember(null)} type="button">
                  取消
                </button>
                <button className="px-btn solid" disabled={saving} onClick={handleSave} type="button">
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="member-list">
              {members.map((m, i) => (
                <div className="ml-item" key={m.id}>
                  <img className={`pixavatar ${i === 0 ? "a" : "b"}`} src={m.avatar || "/placeholder.svg"} alt={m.name} />
                  <div className="ml-info">
                    <div className="ml-name">{m.name}</div>
                    <div className="ml-sub">{m.gender === "female" ? "女" : m.gender === "male" ? "男" : "其他"} · 每月 {m.payday} 号发薪</div>
                  </div>
                  <div className="ml-btns">
                    <button className="ml-btn edit" onClick={() => openEditMember(m)} type="button">
                      编辑
                    </button>
                    <button className="ml-btn del" onClick={() => removeMember(m.id)} type="button">
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {members.length === 0 && <div className="goal-empty">还没有成员，点右上角新增</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
