"use client"

import { useEffect, useMemo, useState } from "react"
import type { Category, ImportBatch, Transaction } from "@/lib/types"
import { yuan } from "@/lib/format"
import { markImportDuplicates } from "@/lib/import-dedup"

export const IMPORT_SOURCE_LABELS: Record<ImportBatch["source"], string> = {
  alipay: "支付宝",
  wechat: "微信",
  generic: "通用",
}

type PreviewRow = Transaction & { isDuplicate: boolean }

interface Props {
  open: boolean
  source: ImportBatch["source"]
  transactions: Transaction[]
  existingTransactions: Transaction[]
  cats: Category[]
  onCancel: () => void
  onConfirm: (transactions: Transaction[]) => void
  onToast: (msg: string) => void
}

export function ImportPreviewSheet({
  open,
  source,
  transactions,
  existingTransactions,
  cats,
  onCancel,
  onConfirm,
  onToast,
}: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [skipDuplicate, setSkipDuplicate] = useState(true)
  const [confirmUncategorized, setConfirmUncategorized] = useState(false)
  const swipe = useSheetSwipe(onCancel, open)

  useEffect(() => {
    if (open) {
      setRows(markImportDuplicates(transactions, existingTransactions))
      setSkipDuplicate(true)
      setConfirmUncategorized(false)
    }
  }, [open, transactions, existingTransactions])

  const duplicateCount = useMemo(() => rows.filter((t) => t.isDuplicate).length, [rows])

  const importableRows = useMemo(
    () => (skipDuplicate ? rows.filter((t) => !t.isDuplicate) : rows),
    [rows, skipDuplicate]
  )

  const uncategorizedCount = useMemo(
    () => importableRows.filter((t) => !t.categoryKey).length,
    [importableRows]
  )

  function updateCategory(id: string, categoryKey: string) {
    setRows((prev) =>
      prev.map((t) => (t.id === id ? { ...t, categoryKey } : t))
    )
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((t) => t.id !== id))
  }

  function submitImport() {
    const payload = importableRows.map(({ isDuplicate: _, ...t }) => t)
    onConfirm(payload)
    setConfirmUncategorized(false)
  }

  function handleConfirmClick() {
    if (rows.length === 0) return
    if (skipDuplicate && rows.length > 0 && rows.every((t) => t.isDuplicate)) {
      onToast("请勿导入重复账单！")
      return
    }
    if (importableRows.length === 0) return
    if (uncategorizedCount > 0) {
      setConfirmUncategorized(true)
      return
    }
    submitImport()
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
            {duplicateCount > 0 && (
              <span className="import-preview-dup"> · 检测到 {duplicateCount} 条可能重复</span>
            )}
            {uncategorizedCount > 0 && (
              <span className="import-preview-uncat"> · {uncategorizedCount} 条未分类</span>
            )}
          </div>
          {duplicateCount > 0 && (
            <label className="import-preview-skip-dup">
              <input
                type="checkbox"
                checked={skipDuplicate}
                onChange={(e) => setSkipDuplicate(e.target.checked)}
              />
              跳过重复
            </label>
          )}
        </div>

        <div className="import-preview-table-wrap">
          {rows.length === 0 ? (
            <div className="import-preview-empty">已删除所有项目，可点击取消退出</div>
          ) : (
          <table className="import-preview-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>金额</th>
                <th>分类</th>
                <th>商品说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className={t.isDuplicate ? "import-preview-row-dup" : undefined}>
                  <td>
                    {t.isDuplicate && <span className="import-preview-dup-tag">⚠️ 重复 </span>}
                    {t.date.slice(5)}
                  </td>
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
                  <td className="import-preview-action">
                    <button
                      type="button"
                      className="import-preview-del"
                      aria-label="删除此行"
                      onClick={() => removeRow(t.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

        <div className="import-preview-actions">
          <button type="button" className="px-btn ghost" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="px-btn solid" onClick={handleConfirmClick}>
            确认导入 {importableRows.length} 条
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
              <button type="button" className="px-btn solid" onClick={submitImport}>
                继续导入
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
