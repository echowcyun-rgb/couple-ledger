"use client"

import { useEffect, useState } from "react"
import "@/components/styles/ledger.css"
import { TabBar } from "@/components/TabBar"
import { Toast } from "@/components/Toast"
import { CategorySheet } from "@/components/modals/CategorySheet"
import { GoalSheet } from "@/components/modals/GoalSheet"
import { MemberPage } from "@/components/modals/MemberPage"
import { RecordSheet } from "@/components/modals/RecordSheet"
import RoomSetup from "@/components/modals/RoomSetup"
import { UpdateGoalSheet } from "@/components/modals/UpdateGoalSheet"
import { EditGoalSheet } from "@/components/modals/EditGoalSheet"
import { CoupleBgAdjustSheet } from "@/components/modals/CoupleBgAdjustSheet"
import { FlowTab } from "@/components/tabs/FlowTab"
import { HomeTab } from "@/components/tabs/HomeTab"
import { MineTab } from "@/components/tabs/MineTab"
import { ReviewTab } from "@/components/tabs/ReviewTab"
import { useLedger } from "@/hooks/useLedger"
import { THEMES } from "@/lib/constants"

export default function Page() {
  const ledger = useLedger()
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    if (ledger.hydrated) {
      const savedRoom = localStorage.getItem("couple-room-id")
      if (!savedRoom) {
        setShowSetup(true)
      }
    }
  }, [ledger.hydrated])

  if (showSetup) {
    return <RoomSetup onDone={(roomId) => {
      localStorage.setItem("couple-room-id", roomId)
      setShowSetup(false)
      window.location.reload()
    }} />
  }

  if (!ledger.hydrated) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <span style={{ fontFamily: "var(--font-pixel-cjk), monospace", fontSize: 12 }}>加载中...</span>
      </div>
    )
  }

  const t = THEMES[ledger.theme]

  return (
    <div
      className="app"
      style={{ "--accent": t.accent, "--accent-dark": t.accentDark } as React.CSSProperties}
    >
      {ledger.tab === "home" && <HomeTab ledger={ledger} />}
      {ledger.tab === "flow" && <FlowTab ledger={ledger} />}
      {ledger.tab === "review" && <ReviewTab ledger={ledger} />}
      {ledger.tab === "mine" && <MineTab ledger={ledger} />}

      <TabBar tab={ledger.tab} onSwitch={ledger.switchTab} onRecord={ledger.openRecord} />

      <MemberPage ledger={ledger} />
      <GoalSheet ledger={ledger} />
      <UpdateGoalSheet ledger={ledger} />
      <EditGoalSheet ledger={ledger} />
      <RecordSheet ledger={ledger} />
      <CategorySheet ledger={ledger} />
      <CoupleBgAdjustSheet
        open={ledger.coupleBgAdjustOpen}
        imageUrl={ledger.pendingCoupleBgUrl}
        onSave={ledger.saveCoupleBgAdjust}
        onCancel={ledger.cancelCoupleBgAdjust}
      />

      <Toast show={ledger.toastShow} msg={ledger.toastMsg} />
    </div>
  )
}
