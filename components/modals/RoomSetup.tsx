"use client"

import { useState } from "react"
import { createRoom, validateRoom } from "@/lib/supabase"

interface Props {
  onDone: (roomId: string) => void
}

export default function RoomSetup({ onDone }: Props) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [createdRoom, setCreatedRoom] = useState("")

  const handleCreate = async () => {
    setLoading(true)
    setError("")
    const roomId = await createRoom()
    setLoading(false)
    if (!roomId) {
      setError("创建失败，请重试")
      return
    }
    setCreatedRoom(roomId)
    setMode("create")
  }

  const handleJoin = async () => {
    const code = joinCode.trim()
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      setError("请输入4位数字房号")
      return
    }
    setLoading(true)
    setError("")
    const exists = await validateRoom(code)
    setLoading(false)
    if (!exists) {
      setError("房号不存在，请确认后重试")
      return
    }
    // 保存到 localStorage 并通知父组件
    localStorage.removeItem("couple-ledger-v1")
    localStorage.setItem("couple-room-id", code)
    onDone(code)
  }

  const handleStartUsing = () => {
    localStorage.removeItem("couple-ledger-v1")
    localStorage.setItem("couple-room-id", createdRoom)
    onDone(createdRoom)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FBF1E2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="card"
        style={{
          width: 320,
          padding: 32,
          textAlign: "center",
          border: "3px solid var(--ink, #2B2440)",
          borderRadius: 12,
          background: "var(--card, #FFFFFF)",
          boxShadow: "6px 6px 0 var(--ink, #2B2440)",
        }}
      >
        {mode === "choose" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏠</div>
            <h2
              style={{
                fontFamily: "var(--font-pixel-cjk), monospace",
                fontSize: 18,
                marginBottom: 8,
                color: "var(--ink, #2B2440)",
              }}
            >
              情侣账本
            </h2>
            <p
              style={{
                fontFamily: "var(--font-pixel-cjk), monospace",
                fontSize: 12,
                color: "var(--text-sub, #888)",
                marginBottom: 24,
              }}
            >
              创建或加入一个房间，和伴侣一起记账
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="px-btn solid" onClick={handleCreate} disabled={loading}>
                {loading ? "创建中..." : "🏠 创建账本"}
              </button>
              <button className="px-btn" onClick={() => setMode("join")}>
                🔑 加入账本
              </button>
            </div>
            {error && (
              <p style={{ color: "#D96A7E", fontSize: 11, marginTop: 12, fontFamily: "var(--font-pixel-cjk), monospace" }}>
                {error}
              </p>
            )}
          </>
        )}

        {mode === "create" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h2
              style={{
                fontFamily: "var(--font-pixel-cjk), monospace",
                fontSize: 18,
                marginBottom: 8,
                color: "var(--ink, #2B2440)",
              }}
            >
              你的房间号
            </h2>
            <div
              style={{
                fontFamily: "var(--font-pixel), monospace",
                fontSize: 48,
                fontWeight: "bold",
                color: "var(--accent, #3DAE83)",
                margin: "16px 0",
                letterSpacing: 8,
              }}
            >
              {createdRoom}
            </div>
            <p
              style={{
                fontFamily: "var(--font-pixel-cjk), monospace",
                fontSize: 12,
                color: "var(--text-sub, #888)",
                marginBottom: 24,
              }}
            >
              把房号发给伴侣，对方选择「加入账本」输入即可
            </p>
            <button className="px-btn solid" onClick={handleStartUsing}>
              开始记账 →
            </button>
          </>
        )}

        {mode === "join" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔑</div>
            <h2
              style={{
                fontFamily: "var(--font-pixel-cjk), monospace",
                fontSize: 18,
                marginBottom: 16,
                color: "var(--ink, #2B2440)",
              }}
            >
              加入账本
            </h2>
            <p
              style={{
                fontFamily: "var(--font-pixel-cjk), monospace",
                fontSize: 12,
                color: "var(--text-sub, #888)",
                marginBottom: 16,
              }}
            >
              输入伴侣分享的4位房号
            </p>
            <input
              className="ga-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                setError("")
              }}
              style={{
                fontFamily: "var(--font-pixel), monospace",
                fontSize: 24,
                textAlign: "center",
                letterSpacing: 8,
                width: "100%",
                marginBottom: 16,
                padding: "12px 8px",
              }}
            />
            {error && (
              <p style={{ color: "#D96A7E", fontSize: 11, marginBottom: 12, fontFamily: "var(--font-pixel-cjk), monospace" }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button className="px-btn" onClick={() => { setMode("choose"); setError(""); setJoinCode("") }} style={{ flex: 1 }}>
                返回
              </button>
              <button className="px-btn solid" onClick={handleJoin} disabled={loading} style={{ flex: 1 }}>
                {loading ? "验证中..." : "加入"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
