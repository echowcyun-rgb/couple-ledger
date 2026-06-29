"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { numberToPercent, percentToNumber } from "@/lib/couple-bg"

interface Props {
  open: boolean
  imageUrl: string
  initialPosX?: string
  initialPosY?: string
  onSave: (posX: string, posY: string) => void
  onCancel: () => void
}

export function CoupleBgAdjustSheet({
  open,
  imageUrl,
  initialPosX = "50%",
  initialPosY = "center",
  onSave,
  onCancel,
}: Props) {
  const [posX, setPosX] = useState(() => percentToNumber(initialPosX))
  const [posY, setPosY] = useState(() => percentToNumber(initialPosY))
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, pointerId: -1 })

  useEffect(() => {
    if (!open) return
    setPosX(percentToNumber(initialPosX))
    setPosY(percentToNumber(initialPosY))
  }, [open, imageUrl, initialPosX, initialPosY])

  const applyDragDelta = useCallback((dx: number, dy: number) => {
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    setPosX((p) => Math.min(100, Math.max(0, p - (dx / rect.width) * 100)))
    setPosY((p) => Math.min(100, Math.max(0, p - (dy / rect.height) * 100)))
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return
      const dx = e.clientX - dragRef.current.lastX
      const dy = e.clientY - dragRef.current.lastY
      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
      applyDragDelta(dx, dy)
    },
    [applyDragDelta]
  )

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return
    dragRef.current.active = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  if (!open || !imageUrl) return null

  const previewStyle = {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: `${numberToPercent(posX)} ${numberToPercent(posY)}`,
  } as const

  return (
    <>
      <div className="sheet-mask show" onClick={onCancel} />
      <div className="sheet show" role="dialog" aria-label="调整背景位置">
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-title">调整背景位置</div>
        <p className="couple-bg-adjust-hint">单指拖动预览，或使用滑块微调</p>
        <div
          ref={frameRef}
          className="couple-bg-preview-frame"
          style={previewStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="couple-bg-mask" aria-hidden="true" />
          <div className="couple-bg-preview-label">预览区域</div>
        </div>
        <div className="couple-bg-slider-row">
          <label className="couple-bg-slider-label" htmlFor="couple-bg-pos-x">
            水平 {numberToPercent(posX)}
          </label>
          <input
            id="couple-bg-pos-x"
            className="couple-bg-range"
            type="range"
            min={0}
            max={100}
            value={posX}
            onChange={(e) => setPosX(Number(e.target.value))}
          />
        </div>
        <div className="couple-bg-slider-row">
          <label className="couple-bg-slider-label" htmlFor="couple-bg-pos-y">
            垂直 {numberToPercent(posY)}
          </label>
          <input
            id="couple-bg-pos-y"
            className="couple-bg-range"
            type="range"
            min={0}
            max={100}
            value={posY}
            onChange={(e) => setPosY(Number(e.target.value))}
          />
        </div>
        <div className="review-plan-footer couple-bg-adjust-footer">
          <button type="button" className="px-btn ghost" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="px-btn review-plan-save"
            onClick={() => onSave(numberToPercent(posX), numberToPercent(posY))}
          >
            保存
          </button>
        </div>
      </div>
    </>
  )
}
