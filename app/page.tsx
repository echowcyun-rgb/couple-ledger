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
import { ImportPreviewSheet } from "@/components/modals/ImportPreviewSheet"
import { RevertImportSheet } from "@/components/modals/RevertImportSheet"
import { FlowTab } from "@/components/tabs/FlowTab"
import { HomeTab } from "@/components/tabs/HomeTab"
import { MineTab } from "@/components/tabs/MineTab"
import { ReviewTab } from "@/components/tabs/ReviewTab"
import { useLedger } from "@/hooks/useLedger"
import { THEMES } from "@/lib/constants"

function paydayAlertStorageKey() {
  return `payday-alerted-${new Date().toDateString()}`
}

const ROOM_ENTERED_KEY = "couple-room-entered"

export default function Page() {
  const ledger = useLedger()
  const [showSetup, setShowSetup] = useState(false)
  const [showPaydayAlert, setShowPaydayAlert] = useState(false)

  const dismissPaydayAlert = () => {
    sessionStorage.setItem(paydayAlertStorageKey(), "1")
    setShowPaydayAlert(false)
  }

  // 每个浏览器会话首次打开先显示 RoomSetup；用户进入账本后本会话不再重复弹出
  useEffect(() => {
    if (ledger.hydrated && !sessionStorage.getItem(ROOM_ENTERED_KEY)) {
      setShowSetup(true)
    }
  }, [ledger.hydrated])

  useEffect(() => {
    if (!ledger.hydrated || !ledger.cloudSynced || ledger.members.length === 0) return
    const today = new Date().getDate()
    const isAnyPayday = ledger.members.some((m) => m.payday === today)
    if (isAnyPayday && !sessionStorage.getItem(paydayAlertStorageKey())) {
      setShowPaydayAlert(true)
    }
  }, [ledger.hydrated, ledger.cloudSynced, ledger.members])

  if (showSetup) {
    return <RoomSetup onDone={(roomId) => {
      localStorage.setItem("couple-room-id", roomId)
      sessionStorage.setItem(ROOM_ENTERED_KEY, "1")
      setShowSetup(false)
      window.location.reload()
    }} />
  }

  if (!ledger.hydrated || !ledger.cloudSynced) {
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
      {ledger.tab === "mine" && (
        <MineTab
          ledger={ledger}
          onSelectImportMember={ledger.onSelectImportMember}
          onSelectExportMember={ledger.onSelectExportMember}
        />
      )}

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
      <ImportPreviewSheet
        open={ledger.importPreviewOpen}
        source={ledger.importPreviewSource}
        transactions={ledger.importPreviewTransactions}
        existingTransactions={ledger.transactions}
        cats={ledger.cats}
        onCancel={ledger.cancelImportPreview}
        onConfirm={ledger.confirmImportPreview}
        onToast={ledger.toast}
      />
      <RevertImportSheet
        open={ledger.revertImportOpen}
        batches={ledger.revertableBatches}
        loading={ledger.revertImportLoading}
        onClose={ledger.closeRevertImport}
        onRevert={ledger.revertImportBatch}
      />

      <Toast show={ledger.toastShow} msg={ledger.toastMsg} />

      {showPaydayAlert && (
        <div className="sheet-mask show" onClick={dismissPaydayAlert} />
      )}
      {showPaydayAlert && (
        <div className="sheet show payday-alert-sheet" role="alertdialog" aria-label="发薪日提醒">
          <div className="payday-alert-emoji">🎉</div>
          <div className="payday-alert-title">今天是发薪日</div>
          <div className="payday-alert-text">记得存一笔哦！</div>
          <div className="payday-alert-btns">
            <button className="px-btn solid" onClick={() => {
              dismissPaydayAlert()
              ledger.openRecord()
            }}>马上记一笔</button>
            <button className="px-btn ghost" onClick={dismissPaydayAlert}>知道了</button>
          </div>
        </div>
      )}

      {ledger.celebrateOpen && (
        <>
          <div className="sheet-mask show" onClick={() => ledger.setCelebrateOpen(false)} />
          <div className="sheet show celebrate-sheet" role="alertdialog" aria-label="恭喜">
            <div className="celebrate-emoji">🎊</div>
            <div className="celebrate-title">存钱成功</div>
            <div className="celebrate-msg">{ledger.celebrateMsg}</div>
            <div className="celebrate-btns">
              <button className="px-btn solid" onClick={() => ledger.setCelebrateOpen(false)}>继续加油</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
