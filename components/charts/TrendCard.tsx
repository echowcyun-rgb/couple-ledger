"use client"

import { useState } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { MEMBER_CHART_COLORS } from "@/lib/constants"
import { yuan } from "@/lib/format"
import type { Member, TrendRow } from "@/lib/types"

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"]

export function TrendCard({
  getData,
  members,
  totalColor,
  refYear,
  refMonth,
}: {
  getData: (scope: "year" | "month" | "day") => TrendRow[]
  members: Member[]
  totalColor: string
  refYear?: number
  refMonth?: number
}) {
  const [range, setRange] = useState<"year" | "month" | "day">("month")
  const [kind, setKind] = useState<"line" | "bar">("line")
  const data = getData(range)
  const chartMembers = members.slice(0, 2)

  // 日历热力图渲染
  const renderCalendar = () => {
    const year = refYear ?? new Date().getFullYear()
    const month = refMonth ?? new Date().getMonth() + 1
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0=Sunday

    // 构建日历网格：前面空格子 + 日期格子
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    // 找出最大金额用于颜色深浅
    const maxTotal = Math.max(...data.map(r => r.total), 1)

    return (
      <div className="card chart-card">
        <div className="chart-toggles">
          <div className="seg">
            {(["year", "month", "day"] as const).map((r) => (
              <button key={r} className={`seg-btn ${range === r ? "on" : ""}`} onClick={() => setRange(r)}>
                {r === "year" ? "按年" : r === "month" ? "按月" : "按日"}
              </button>
            ))}
          </div>
        </div>
        <div className="cal-heatmap">
          {/* 星期头 */}
          <div className="cal-header">
            {WEEKDAY_LABELS.map((w) => (
              <div className="cal-head-cell" key={w}>{w}</div>
            ))}
          </div>
          {/* 日历格子 */}
          <div className="cal-grid">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div className="cal-cell empty" key={`empty-${idx}`} />
              }
              const row = data.find(r => r.k === String(day))
              const total = row?.total ?? 0
              const intensity = total / maxTotal
              const bgOpacity = total > 0 ? Math.min(0.85, 0.2 + intensity * 0.65) : 0
              const isToday = day === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear()
              return (
                <div
                  className={`cal-cell ${total > 0 ? "has-data" : ""} ${isToday ? "today" : ""}`}
                  key={day}
                  style={{
                    background: total > 0
                      ? `rgba(${totalColor === "#3DAE83" ? "61,174,131" : totalColor === "#D96A7E" ? "217,106,126" : "96,121,201"},${bgOpacity})`
                      : "var(--cream)",
                  }}
                >
                  <span className="cal-day-num">{day}</span>
                  {total > 0 && <span className="cal-amount">{yuan(total)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // 非日历模式：折线/柱状图
  const renderChart = () => {
    const Chart = kind === "line" ? LineChart : BarChart
    const axisStyle = { fontFamily: "var(--font-pixel), monospace", fontSize: 8, fill: "#9A8F86" }

    return (
      <div className="card chart-card">
        <div className="chart-toggles">
          <div className="seg scope-seg">
            {(["year", "month", "day"] as const).map((r) => (
              <button key={r} className={`seg-btn ${range === r ? "on" : ""}`} onClick={() => setRange(r)}>
                {r === "year" ? "按年" : r === "month" ? "按月" : "按日"}
              </button>
            ))}
          </div>
          <div className="seg">
            {(["line", "bar"] as const).map((k) => (
              <button key={k} className={`seg-btn ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>
                {k === "line" ? "折线" : "柱状"}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={200}>
            <Chart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#EAE0CF" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="k" tick={axisStyle} axisLine={{ stroke: "#D8CDB9" }} tickLine={false} />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={38}
                tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`)}
              />
              <Tooltip
                contentStyle={{
                  border: "3px solid #2B2433",
                  borderRadius: 10,
                  fontFamily: "var(--font-pixel-cjk), monospace",
                  fontSize: 11,
                  boxShadow: "3px 3px 0 #2B2433",
                }}
                formatter={(v) => yuan(Number(v ?? 0))}
              />
              <Legend wrapperStyle={{ fontFamily: "var(--font-pixel-cjk), monospace", fontSize: 10, paddingTop: 6 }} />
              {kind === "line" ? (
                <>
                  <Line type="monotone" dataKey="total" name="总计" stroke={totalColor} strokeWidth={3} dot={{ r: 3 }} />
                  {chartMembers.map((m, i) => (
                    <Line
                      key={m.id}
                      type="monotone"
                      dataKey={m.id}
                      name={m.name}
                      stroke={MEMBER_CHART_COLORS[i % MEMBER_CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  ))}
                </>
              ) : (
                chartMembers.map((m, i) => (
                  <Bar
                    key={m.id}
                    dataKey={m.id}
                    name={m.name}
                    fill={MEMBER_CHART_COLORS[i % MEMBER_CHART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (range === "day") {
    return renderCalendar()
  }

  return renderChart()
}
