"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface Props {
  open: boolean
  initialYear: number
  initialMonth: number
  onClose: () => void
  onMonthSelect: (year: number, month: number) => void
  onRangeSelect: (startDate: string, endDate: string) => void
}

const ITEM_HEIGHT = 40
const VISIBLE_COUNT = 5

function WheelPicker({
  values,
  value,
  onChange,
  itemHeight = ITEM_HEIGHT,
  visibleCount = VISIBLE_COUNT,
}: {
  values: number[]
  value: number
  onChange: (v: number) => void
  itemHeight?: number
  visibleCount?: number
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerHeight = itemHeight * visibleCount
  const centerOffset = (containerHeight - itemHeight) / 2

  const scrollToValue = useCallback((v: number, smooth = true) => {
    const list = listRef.current
    if (!list) return
    const idx = values.indexOf(v)
    if (idx < 0) return
    const top = idx * itemHeight
    list.scrollTo({ top, behavior: smooth ? "smooth" : "auto" })
  }, [values, itemHeight])

  useEffect(() => {
    scrollToValue(value, false)
  }, [scrollToValue, value])

  const handleScroll = useCallback(() => {
    const list = listRef.current
    if (!list) return
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const scrollTop = list.scrollTop
      const idx = Math.round(scrollTop / itemHeight)
      const clamped = Math.max(0, Math.min(values.length - 1, idx))
      const newValue = values[clamped]
      if (newValue !== value) {
        onChange(newValue)
      }
      list.scrollTo({ top: clamped * itemHeight, behavior: "smooth" })
    }, 120)
  }, [values, value, onChange, itemHeight])

  const step = (delta: number) => {
    const idx = values.indexOf(value)
    const next = Math.max(0, Math.min(values.length - 1, idx + delta))
    onChange(values[next])
    scrollToValue(values[next], true)
  }

  return (
    <div className="wheel-picker" style={{ height: containerHeight }}>
      <button className="wheel-arrow wheel-arrow-up" type="button" onClick={() => step(-1)} aria-label="上一个">▲</button>
      <div className="wheel-highlight" style={{ top: centerOffset, height: itemHeight }} />
      <div
        className="wheel-list"
        ref={listRef}
        onScroll={handleScroll}
        style={{
          height: containerHeight,
          paddingTop: centerOffset,
          paddingBottom: centerOffset,
        }}
      >
        {values.map(v => (
          <div
            key={v}
            className={`wheel-item ${v === value ? "on" : ""}`}
            style={{ height: itemHeight, lineHeight: `${itemHeight}px` }}
            onClick={() => {
              onChange(v)
              scrollToValue(v, true)
            }}
          >
            {v}
          </div>
        ))}
      </div>
      <button className="wheel-arrow wheel-arrow-down" type="button" onClick={() => step(1)} aria-label="下一个">▼</button>
    </div>
  )
}

export function FlowDateSheet({
  open,
  initialYear,
  initialMonth,
  onClose,
  onMonthSelect,
  onRangeSelect,
}: Props) {
  const [tab, setTab] = useState<"month" | "range">("month")
  const [selYear, setSelYear] = useState(initialYear)
  const [selMonth, setSelMonth] = useState(initialMonth)
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")

  useEffect(() => {
    if (open) {
      setSelYear(initialYear)
      setSelMonth(initialMonth)
      setTab("month")
    }
  }, [open, initialYear, initialMonth])

  if (!open) return null

  const years = Array.from({ length: 12 }, (_, i) => initialYear - 6 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="modal-overlay flow-date-overlay" onClick={onClose}>
      <div className="member-modal-panel flow-date-panel" onClick={(e) => e.stopPropagation()}>
        <div className="member-modal-header">
          <span className="member-modal-title">选择时间</span>
          <button className="member-modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="flow-date-tabs">
          <button className={`flow-date-tab ${tab === "month" ? "on" : ""}`} onClick={() => setTab("month")} type="button">可选月份</button>
          <button className={`flow-date-tab ${tab === "range" ? "on" : ""}`} onClick={() => setTab("range")} type="button">自定义时间</button>
        </div>

        {tab === "month" && (
          <div className="flow-date-month-picker">
            <div className="flow-date-scroll-col">
              <div className="flow-date-scroll-label">年份</div>
              <WheelPicker values={years} value={selYear} onChange={setSelYear} />
            </div>
            <div className="flow-date-scroll-col">
              <div className="flow-date-scroll-label">月份</div>
              <WheelPicker values={months} value={selMonth} onChange={setSelMonth} />
            </div>
            <button className="px-btn flow-date-confirm" onClick={() => { onMonthSelect(selYear, selMonth); onClose() }} type="button">
              查看 {selYear}年{selMonth}月
            </button>
          </div>
        )}

        {tab === "range" && (
          <div className="flow-date-range-picker">
            <div className="flow-date-range-row">
              <span className="flow-date-range-label">开始日期</span>
              <input className="flow-date-range-input" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            </div>
            <div className="flow-date-range-row">
              <span className="flow-date-range-label">结束日期</span>
              <input className="flow-date-range-input" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
            {rangeStart && rangeEnd && rangeStart > rangeEnd && (
              <div className="flow-date-range-error">开始日期不能晚于结束日期</div>
            )}
            <button
              className="px-btn flow-date-confirm"
              disabled={!rangeStart || !rangeEnd || rangeStart > rangeEnd}
              onClick={() => { onRangeSelect(rangeStart, rangeEnd); onClose() }}
              type="button"
            >
              查看 {rangeStart} ~ {rangeEnd}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
