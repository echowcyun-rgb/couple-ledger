"use client"

import { useState } from "react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import { yuan } from "@/lib/format"
import type { PieSlice, StructureStats } from "@/lib/types"

export function StructureCard({
  monthData,
  yearData,
  stats,
}: {
  monthData: PieSlice[]
  yearData: PieSlice[]
  stats: StructureStats
}) {
  const [scope, setScope] = useState<"month" | "year">("month")
  const data = scope === "month" ? monthData : yearData
  const total = data.reduce((s, d) => s + d.value, 0)
  const noData = total === 0

  return (
    <div className="card">
      <div className="seg scope-seg">
        {(["month", "year"] as const).map((s) => (
          <button key={s} className={`seg-btn ${scope === s ? "on" : ""}`} onClick={() => setScope(s)}>
            {s === "month" ? "本月" : "全年"}
          </button>
        ))}
      </div>
      {noData ? (
        <div className="empty-hint">暂无支出数据，记一笔账试试</div>
      ) : (
        <>
          <div className="pie-wrap">
            <div className="pie-box">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="#2B2433"
                    strokeWidth={2}
                  >
                    {data.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: "3px solid #2B2433",
                      borderRadius: 10,
                      fontFamily: "var(--font-pixel-cjk), monospace",
                      fontSize: 11,
                    }}
                    formatter={(v, n) => [yuan(Number(v ?? 0)), String(n ?? "")]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pie-legend">
              {data.map((d) => (
                <div className="pl-row" key={d.name}>
                  <span className="pl-dot" style={{ background: d.color }} />
                  <span className="pl-name">{d.name}</span>
                  <span className="pl-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="stat-table">
            <div className="st-row">
              <span className="st-l">TOP3支出</span>
              <span className="st-v">{stats.top3}</span>
            </div>
            <div className="st-row">
              <span className="st-l">环比</span>
              <span className="st-v">{stats.momChange}</span>
            </div>
            <div className="st-row">
              <span className="st-l">习惯判定</span>
              <span className={`st-v ${stats.habit.includes("偏高") ? "warn" : ""}`}>{stats.habit}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
