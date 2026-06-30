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

function hasSavedRoom() {
  return typeof window !== "undefined" && !!localStorage.getItem("couple-room-id")
}

export default function Page() {
  const ledger = useLedger()
  const [showSetup, setShowSetup] = useState(() => !hasSavedRoom())
  const [showPaydayAlert, setShowPaydayAlert] = useState(false)

  const dismissPaydayAlert = () => {
    sessionStorage.setItem(paydayAlertStorageKey(), "1")
    setShowPaydayAlert(false)
  }

  useEffect(() => {
    if (ledger.hydrated && !hasSavedRoom()) {
      setShowSetup(true)
    }
  }, [ledger.hydrated])

  useEffect(() => {
    if (!ledger.hydrated || ledger.members.length === 0) return
    const today = new Date().getDate()
    const isAnyPayday = ledger.members.some((m) => m.payday === today)
    if (isAnyPayday && !sessionStorage.getItem(paydayAlertStorageKey())) {
      setShowPaydayAlert(true)
    }
  }, [ledger.hydrated, ledger.members])

  if (!ledger.hydrated) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <span style={{ fontFamily: "var(--font-pixel-cjk), monospace", fontSize: 12 }}>加载中...</span>
      </div>
    )
  }

  if (showSetup) {
    return (
      <RoomSetup
        onDone={(roomId, fresh) => {
          setShowSetup(false)
          void ledger.enterRoom(roomId, { fresh })
        }}
      />
    )
  }

  const t = THEMES[ledger.theme]

  return (
    <div
      className="app"
      style={{ "--accent": t.accent, "--accent-dark": t.accentDark } as React.CSSProperties}
    >
      {!ledger.cloudSynced && (
        <div className="sync-banner" role="status">云同步中…</div>
      )}

      {ledger.tab === "home" && <HomeTab ledger={ledger} />}
      {ledger.tab === "flow" && <FlowTab ledger={ledger} />}
      {ledger.tab === "review" && <ReviewTab ledger={ledger} />}
      {ledger.tab === "mine" && (
        <MineTab
          ledger={ledger}
          onSelectImportMember={ledger.onSelectImportMember}
          onSelectExportMember={ledger.onSelectExportMember}
          onSwitchRoom={() => {
            ledger.leaveRoom()
            setShowSetup(true)
          }}
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
