"use client"

import { useState, useEffect } from "react"
import { createRoom, validateRoom, isCloudReady } from "@/lib/supabase"

interface Props {
  onDone: (roomId: string) => void
}

function roomSetupErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message.includes("云同步超时")) {
    return "操作超时，请检查网络连接后重试"
  }
  return fallback
}

export default function RoomSetup({ onDone }: Props) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [createdRoom, setCreatedRoom] = useState("")
  const [existingRoom, setExistingRoom] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("couple-room-id")
    if (saved) setExistingRoom(saved)
  }, [])

  const handleCreate = async () => {
    setLoading(true)
    setError("")
    setMode("create")
    try {
      const roomId = await createRoom()
      if (!roomId) {
        setError(
          isCloudReady()
            ? "创建失败，云端服务异常，请稍后重试"
            : "创建失败，本地存储不可用，请检查浏览器权限"
        )
        setMode("choose")
        return
      }
      setCreatedRoom(roomId)
    } catch (e) {
      console.warn("[RoomSetup] 创建账本失败:", e)
      setError(roomSetupErrorMessage(e, "创建失败，网络异常，请检查连接后重试"))
      setMode("choose")
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    const code = joinCode.trim()
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      setError("请输入4位数字房号")
      return
    }
    setLoading(true)
    setError("")
    try {
      const exists = await validateRoom(code)
      if (!exists) {
        setError(
          isCloudReady()
            ? "房号不存在，请确认后重试"
            : "房号不存在（本地模式仅支持本设备创建的房间）"
        )
        return
      }
      localStorage.removeItem("couple-ledger-v1")
      localStorage.setItem("couple-room-id", code)
      onDone(code)
    } catch (e) {
      console.warn("[RoomSetup] 加入账本失败:", e)
      setError(roomSetupErrorMessage(e, "验证失败，网络异常，请检查连接后重试"))
    } finally {
      setLoading(false)
    }
  }

  const handleStartUsing = () => {
    localStorage.removeItem("couple-ledger-v1")
    localStorage.setItem("couple-room-id", createdRoom)
    onDone(createdRoom)
  }

  return (
    <div className="app">
      {mode === "choose" && (
        <main className="room-setup">
          <header className="room-setup-header">
            <h1 className="room-setup-title">俩人账本</h1>
            <p className="room-setup-subtitle">创建或加入账本，和TA一起记账</p>
          </header>

          <div className="room-setup-couple">
            <div className="room-setup-av">
              <div className="room-setup-av-box">
                <img src="/avatars/girl.jpg" alt="女生角色" />
              </div>
              <span className="room-setup-av-label">我</span>
            </div>
            <PixelHeart />
            <div className="room-setup-av">
              <div className="room-setup-av-box">
                <img src="/avatars/boy.jpg" alt="男生角色" />
              </div>
              <span className="room-setup-av-label">Ta</span>
            </div>
          </div>

          {existingRoom && (
            <button
              type="button"
              className="room-setup-existing"
              onClick={() => onDone(existingRoom)}
            >
              <div className="room-setup-existing-title">进入账本 #{existingRoom}</div>
              <div className="room-setup-existing-hint">点击继续使用上次账本</div>
            </button>
          )}

          <div className="room-setup-actions">
            <button className="room-setup-btn green" onClick={handleCreate} disabled={loading} type="button">
              <span className="room-setup-ico">
                <PixelPlus />
              </span>
              <span className="room-setup-btn-text">
                <strong>创建账本</strong>
                <small>新建共享账本，获取邀请码</small>
              </span>
              <PixelArrow />
            </button>

            <button className="room-setup-btn amber" onClick={() => setMode("join")} disabled={loading} type="button">
              <span className="room-setup-ico">
                <PixelKey />
              </span>
              <span className="room-setup-btn-text">
                <strong>加入账本</strong>
                <small>输入邀请码，加入伴侣账本</small>
              </span>
              <PixelArrow />
            </button>
          </div>

          {error && <p className="room-setup-error">{error}</p>}

          <p className="room-setup-footer">START YOUR JOURNEY</p>
        </main>
      )}

      {mode === "create" &&
        (createdRoom ? (
          <div className="room-setup-modal">
            <div className="room-setup-modal-panel">
              <div className="room-setup-modal-head green">
                <span>创建成功！</span>
                <button onClick={() => setMode("choose")} type="button" aria-label="关闭">
                  ×
                </button>
              </div>
              <div className="room-setup-modal-body">
                <p className="room-setup-modal-hint">将邀请码发给你的伴侣</p>
                <div className="room-setup-code">
                  <small>邀请码</small>
                  <strong>{createdRoom}</strong>
                </div>
                <button className="px-btn solid" onClick={handleStartUsing} type="button">
                  进入账本
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="room-setup-loading">正在创建...</div>
        ))}

      {mode === "join" && (
        <div className="room-setup-modal">
          <div className="room-setup-modal-mask" onClick={() => { setMode("choose"); setError(""); setJoinCode("") }} />
          <div className="room-setup-modal-panel">
            <div className="room-setup-modal-head amber">
              <span>加入账本</span>
              <button onClick={() => { setMode("choose"); setError(""); setJoinCode("") }} type="button" aria-label="关闭">
                ×
              </button>
            </div>
            <div className="room-setup-modal-body">
              <p className="room-setup-modal-hint">输入伴侣分享的4位房号，加入共享账本</p>
              <label className="me-label">邀请码</label>
              <input
                className="me-input room-setup-code-input"
                type="text"
                inputMode="numeric"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                  setError("")
                }}
                placeholder="0000"
                maxLength={4}
              />
              {error && <p className="room-setup-error">{error}</p>}
              <button className="px-btn solid" onClick={handleJoin} disabled={loading || joinCode.trim().length < 4} type="button">
                {loading ? "验证中..." : "加入共享账本"}
              </button>
              <button className="px-btn ghost" onClick={() => { setMode("choose"); setError(""); setJoinCode("") }} type="button">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PixelHeart() {
  return (
    <svg
      aria-hidden="true"
      className="room-setup-heart"
      width="24"
      height="24"
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="2" width="2" height="1" fill="#e05a6a" />
      <rect x="5" y="2" width="2" height="1" fill="#e05a6a" />
      <rect x="0" y="3" width="3" height="2" fill="#e05a6a" />
      <rect x="5" y="3" width="3" height="2" fill="#e05a6a" />
      <rect x="3" y="2" width="2" height="1" fill="#e05a6a" />
      <rect x="1" y="5" width="6" height="1" fill="#e05a6a" />
      <rect x="2" y="6" width="4" height="1" fill="#e05a6a" />
      <rect x="3" y="7" width="2" height="1" fill="#e05a6a" />
    </svg>
  )
}

function PixelPlus() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="1" width="2" height="6" fill="white" />
      <rect x="1" y="3" width="6" height="2" fill="white" />
    </svg>
  )
}

function PixelKey() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="3" width="2" height="2" fill="white" />
      <rect x="0" y="2" width="4" height="4" fill="none" stroke="white" strokeWidth="1" />
      <rect x="3" y="4" width="4" height="1" fill="white" />
      <rect x="5" y="5" width="1" height="1" fill="white" />
      <rect x="3" y="5" width="1" height="1" fill="white" />
    </svg>
  )
}

function PixelArrow() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="3" width="4" height="2" fill="currentColor" />
      <rect x="4" y="2" width="1" height="1" fill="currentColor" />
      <rect x="5" y="3" width="1" height="2" fill="currentColor" />
      <rect x="4" y="5" width="1" height="1" fill="currentColor" />
    </svg>
  )
}
