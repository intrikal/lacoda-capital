"use client"

// ============================================================================
// Performance Cell — Inline return % for asset list table rows
// ============================================================================

interface PerformanceCellProps {
  returnValue: number | null
  hasData: boolean
}

export function PerformanceCell({ returnValue, hasData }: PerformanceCellProps) {
  if (!hasData) {
    return <span className="text-xs text-zinc-500">—</span>
  }

  if (returnValue === null) {
    return <span className="text-xs text-zinc-500">Insufficient data</span>
  }

  const pct = returnValue * 100
  const isPositive = pct > 0
  const isZero = pct === 0

  // Handle very large returns
  const formatted =
    Math.abs(pct) >= 10000
      ? `${isPositive ? "+" : ""}${pct.toFixed(0)}%`
      : `${isPositive ? "+" : ""}${pct.toFixed(1)}%`

  const colorClass = isZero
    ? "text-zinc-400"
    : isPositive
      ? "text-emerald-400"
      : "text-red-400"

  return (
    <span className={`text-sm font-medium tabular-nums ${colorClass}`}>
      {formatted}
    </span>
  )
}
