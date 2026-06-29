"use client"

import { useEffect, useMemo, useState } from "react"
import type { Category, ImportBatch, Transaction } from "@/lib/types"
import { yuan } from "@/lib/format"
import { useSheetSwipe } from "@/hooks/useSheetSwipe"

export const IMPORT_SOURCE_LABELS: Record<ImportBatch["source"], string> = {
  alipay: "支付宝",
  wechat: "微信",
  generic: "通用",
}

interface Props {
  open: boolean
  source: ImportBatch["source"]
  transactions: Transaction[]
  cats: Category[]
  onCancel: () => void
  onConfirm: (transactions: Transaction[]) => void
}

export function ImportPreviewSheet({
  open,
  source,
  transactions,
  cats,
  onCancel,
  onConfirm,
}: Props) {
  const [rows, setRows] = useState<Transaction[]>([])
  const [confirmUncategorized, setConfirmUncategorized] = useState(false)
  const swipe = useSheetSwipe(onCancel, open)

  useEffect(() => {
    if (open) {
      setRows(transactions.map((t) => ({ ...t })))
      setConfirmUncategorized(false)
    }
  }, [open, transactions])

  const uncategorizedCount = useMemo(
    () => rows.filter((t) => !t.categoryKey).length,
    [rows]
  )

  function updateCategory(id: string, categoryKey: string) {
    setRows((prev) =>
      prev.map((t) => (t.id === id ? { ...t, categoryKey } : t))
    )
  }

  function handleConfirmClick() {
    if (rows.length === 0) return
    if (uncategorizedCount > 0) {
      setConfirmUncategorized(true)
      return
    }
    onConfirm(rows)
  }

  function handleForceConfirm() {
    onConfirm(rows)
    setConfirmUncategorized(false)
  }

  function catsForType(type: Transaction["type"]) {
    return cats.filter((c) => c.type === type)
  }

  return (
    <>
      <div className={`sheet-mask ${open ? "show" : ""}`} onClick={onCancel} />
      <div
        className={`sheet import-preview-sheet ${open ? "show" : ""}`}
        role="dialog"
        aria-label="导入预览"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="import-preview-header">
          <div className="sheet-title">导入预览</div>
          <div className="import-preview-meta">
            {IMPORT_SOURCE_LABELS[source]} · 共 {rows.length} 条
            {uncategorizedCount > 0 && (
              <span className="import-preview-uncat"> · {uncategorizedCount} 条未分类</span>
            )}
          </div>
        </div>

        <div className="import-preview-table-wrap">
          <table className="import-preview-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>金额</th>
                <th>分类</th>
                <th>商品说明</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>{t.date.slice(5)}</td>
                  <td>{yuan(t.amount)}</td>
                  <td>
                    <select
                      className="import-preview-select"
                      value={t.categoryKey}
                      onChange={(e) => updateCategory(t.id, e.target.value)}
                      aria-label="分类"
                    >
                      <option value="">未分类</option>
                      {catsForType(t.type).map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.glyph} {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="import-preview-note" title={t.note}>
                    {t.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="import-preview-actions">
          <button type="button" className="px-btn ghost" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="px-btn solid" onClick={handleConfirmClick}>
            确认导入 {rows.length} 条
          </button>
        </div>
      </div>

      {confirmUncategorized && (
        <>
          <div className="sheet-mask show" style={{ zIndex: 96 }} onClick={() => setConfirmUncategorized(false)} />
          <div className="import-confirm-dialog" role="alertdialog" aria-labelledby="import-confirm-title">
            <div className="sheet-title" id="import-confirm-title">未分类提醒</div>
            <p className="import-confirm-text">
              {uncategorizedCount} 条交易未分类，是否继续？继续将按未分类导入。
            </p>
            <div className="import-preview-actions">
              <button type="button" className="px-btn ghost" onClick={() => setConfirmUncategorized(false)}>
                返回修改
              </button>
              <button type="button" className="px-btn solid" onClick={handleForceConfirm}>
                继续导入
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
