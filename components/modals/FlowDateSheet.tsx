"use client"

import { useState, useRef, useEffect } from "react"

interface Props {
  open: boolean
  initialYear: number
  initialMonth: number
  onClose: () => void
  onMonthSelect: (year: number, month: number) => void
  onRangeSelect: (startDate: string, endDate: string) => void
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

  const yearRef = useRef<HTMLDivElement>(null)
  const monthRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setSelYear(initialYear)
      setSelMonth(initialMonth)
    }
  }, [open, initialYear, initialMonth])

  useEffect(() => {
    if (open && tab === "month") {
      setTimeout(() => {
        yearRef.current?.querySelector(`[data-val="${selYear}"]`)?.scrollIntoView({ block: "center" })
        monthRef.current?.querySelector(`[data-val="${selMonth}"]`)?.scrollIntoView({ block: "center" })
      }, 50)
    }
  }, [open, tab, selYear, selMonth])

  if (!open) return null

  const years = Array.from({ length: 10 }, (_, i) => initialYear - 5 + i)
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
              <div className="flow-date-scroll-list" ref={yearRef}>
                {years.map(y => (
                  <button key={y} data-val={y} className={`flow-date-scroll-item ${y === selYear ? "on" : ""}`} onClick={() => setSelYear(y)} type="button">
                    {y}年
                  </button>
                ))}
              </div>
            </div>
            <div className="flow-date-scroll-col">
              <div className="flow-date-scroll-label">月份</div>
              <div className="flow-date-scroll-list" ref={monthRef}>
                {months.map(m => (
                  <button key={m} data-val={m} className={`flow-date-scroll-item ${m === selMonth ? "on" : ""}`} onClick={() => setSelMonth(m)} type="button">
                    {m}月
                  </button>
                ))}
              </div>
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
