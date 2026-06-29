"use client"

import { useState } from "react"
import type { ImportBatch } from "@/lib/types"
import { IMPORT_SOURCE_LABELS } from "@/components/modals/ImportPreviewSheet"
import { useSheetSwipe } from "@/hooks/useSheetSwipe"

function formatBatchTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  open: boolean
  batches: ImportBatch[]
  loading: boolean
  onClose: () => void
  onRevert: (batchTime: string) => void | Promise<void>
}

export function RevertImportSheet({ open, batches, loading, onClose, onRevert }: Props) {
  const [pendingTime, setPendingTime] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const swipe = useSheetSwipe(onClose, open)

  function handleRevertClick(batch: ImportBatch) {
    if (loading) return
    if (batch.ids.length === 0) return
    setPendingTime(batch.time)
    setPendingCount(batch.ids.length)
  }

  async function handleConfirmRevert() {
    if (!pendingTime || loading) return
    const time = pendingTime
    setPendingTime(null)
    await onRevert(time)
  }

  return (
    <>
      <div className={`sheet-mask ${open ? "show" : ""}`} onClick={onClose} />
      <div
        className={`sheet revert-import-sheet ${open ? "show" : ""}`}
        role="dialog"
        aria-label="撤销导入"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-title">撤销导入</div>
        <p className="revert-import-hint">最近 3 次导入记录，撤销后将删除该批次全部交易</p>

        {batches.length === 0 ? (
          <div className="revert-import-empty">暂无导入记录</div>
        ) : (
          <ul className="revert-import-list">
            {batches.map((batch) => (
              <li key={batch.time} className="revert-import-item">
                <div className="revert-import-meta">
                  <div className="revert-import-time">{formatBatchTime(batch.time)}</div>
                  <div className="revert-import-detail">
                    {IMPORT_SOURCE_LABELS[batch.source]} · {batch.count} 条
                  </div>
                </div>
                <button
                  type="button"
                  className="px-btn revert-import-btn"
                  disabled={loading || batch.ids.length === 0}
                  onClick={() => handleRevertClick(batch)}
                >
                  {loading ? "处理中..." : "撤销"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingTime && (
        <>
          <div
            className="sheet-mask show"
            style={{ zIndex: 96 }}
            onClick={() => setPendingTime(null)}
          />
          <div className="import-confirm-dialog" role="alertdialog" aria-labelledby="revert-confirm-title">
            <div className="sheet-title" id="revert-confirm-title">确认撤销</div>
            <p className="import-confirm-text">
              将删除 {pendingCount} 条交易，不可恢复，确认撤销？
            </p>
            <div className="import-preview-actions">
              <button
                type="button"
                className="px-btn ghost"
                onClick={() => setPendingTime(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="px-btn solid revert-import-confirm-btn"
                onClick={handleConfirmRevert}
              >
                确认撤销
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
