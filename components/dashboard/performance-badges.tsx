"use client"

import { useEffect, useState } from "react"
import { getAssetPerformance } from "@/lib/actions/performance.actions"
import type { PeriodReturns } from "@/lib/calculations/performance"

// ============================================================================
// Performance Badges — YTD, 1Y, Since Inception
// ============================================================================

interface PerformanceBadgesProps {
  assetId: string
}

function formatReturn(value: number | null): string {
  if (value === null) return "—"
  const pct = value * 100
  if (Math.abs(pct) >= 10000) return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
}

function getReturnColor(value: number | null): string {
  if (value === null) return "text-zinc-500"
  if (value > 0) return "text-emerald-400"
  if (value < 0) return "text-red-400"
  return "text-zinc-400"
}

function getReturnBg(value: number | null): string {
  if (value === null) return "bg-zinc-800/50"
  if (value > 0) return "bg-emerald-950/30"
  if (value < 0) return "bg-red-950/30"
  return "bg-zinc-800/50"
}

export function PerformanceBadges({ assetId }: PerformanceBadgesProps) {
  const [data, setData] = useState<(PeriodReturns & { hasData: boolean }) | null>(null)
  const [loadedForId, setLoadedForId] = useState("")
  const loading = loadedForId !== assetId

  useEffect(() => {
    let cancelled = false
    getAssetPerformance(assetId)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoadedForId(assetId)
        }
      })
    return () => { cancelled = true }
  }, [assetId])

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-md bg-zinc-800" />
        ))}
      </div>
    )
  }

  if (!data?.hasData) {
    return (
      <span className="text-xs text-zinc-500">Insufficient data</span>
    )
  }

  const badges = [
    { label: "YTD", value: data.ytd },
    { label: "1Y", value: data.oneYear },
    { label: "Inception", value: data.sinceInception },
  ]

  return (
    <div className="flex gap-2">
      {badges.map(({ label, value }) => (
        <div
          key={label}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${getReturnBg(value)}`}
        >
          <span className="text-zinc-400">{label}</span>
          <span className={getReturnColor(value)}>
            {formatReturn(value)}
          </span>
        </div>
      ))}
    </div>
  )
}
