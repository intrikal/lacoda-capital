"use client"

import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { getAssetTWRTimeSeries } from "@/lib/actions/performance.actions"
import type { TWRDataPoint } from "@/lib/calculations/performance"

// ============================================================================
// TWR Over Time Chart — Recharts LineChart on asset detail
// ============================================================================

interface TWRChartProps {
  assetId: string
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function TWRChart({ assetId }: TWRChartProps) {
  const [data, setData] = useState<TWRDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAssetTWRTimeSeries(assetId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [assetId])

  if (loading) {
    return <div className="h-[200px] animate-pulse rounded-md bg-zinc-800/50" />
  }

  if (data.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-md bg-zinc-800/20">
        <span className="text-sm text-zinc-500">Not enough data for TWR chart</span>
      </div>
    )
  }

  const isPositive = data[data.length - 1].cumulativeTWR >= 0

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-zinc-300">
        Time-Weighted Return
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(d) => {
              const date = new Date(d)
              return date.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              })
            }}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(v) => formatPercent(v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#f4f4f5",
            }}
            formatter={(value: number) => [formatPercent(value), "TWR"]}
            labelFormatter={(label) => {
              const date = new Date(label)
              return date.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulativeTWR"
            stroke={isPositive ? "#10b981" : "#ef4444"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {/* Zero line */}
          <Line
            type="monotone"
            dataKey={() => 0}
            stroke="#52525b"
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
