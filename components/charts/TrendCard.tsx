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

export function TrendCard({
  getData,
  members,
  totalColor,
}: {
  getData: (scope: "year" | "month" | "day") => TrendRow[]
  members: Member[]
  totalColor: string
}) {
  const [range, setRange] = useState<"year" | "month" | "day">("month")
  const [kind, setKind] = useState<"line" | "bar">("line")
  const data = getData(range)
  const Chart = kind === "line" ? LineChart : BarChart
  const axisStyle = { fontFamily: "var(--font-pixel), monospace", fontSize: 8, fill: "#9A8F86" }
  const chartMembers = members.slice(0, 2)

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
