"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LedgerEntry {
  id: string
  category: string
  label: string
  value: number
  change: number
  flow: "in" | "out" | "neutral"
}

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const ledgerData: LedgerEntry[] = [
  { id: "1", category: "EQUITIES", label: "Public Markets", value: 12450000, change: 2.4, flow: "in" },
  { id: "2", category: "EQUITIES", label: "Private Equity", value: 8200000, change: 0.8, flow: "neutral" },
  { id: "3", category: "FIXED", label: "Treasury Bonds", value: 5600000, change: -0.2, flow: "out" },
  { id: "4", category: "FIXED", label: "Corporate Bonds", value: 3400000, change: 0.5, flow: "in" },
  { id: "5", category: "REAL", label: "Real Estate", value: 15800000, change: 1.2, flow: "in" },
  { id: "6", category: "REAL", label: "Infrastructure", value: 4200000, change: 0.3, flow: "neutral" },
  { id: "7", category: "ALT", label: "Hedge Funds", value: 6700000, change: -1.1, flow: "out" },
  { id: "8", category: "ALT", label: "Commodities", value: 2100000, change: 3.2, flow: "in" },
]

const categoryColors: Record<string, string> = {
  EQUITIES: "#14b8a6",
  FIXED: "#06b6d4",
  REAL: "#2dd4bf",
  ALT: "#22d3ee",
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Number Component
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedValue({
  value,
  prefix = "",
  reducedMotion,
}: {
  value: number
  prefix?: string
  reducedMotion: boolean
}) {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [hasAnimated, setHasAnimated] = React.useState(false)

  React.useEffect(() => {
    if (reducedMotion || hasAnimated) {
      setDisplayValue(value)
      return
    }

    let startTime: number
    let animationFrame: number
    const duration = 1800

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4) // easeOutQuart
      setDisplayValue(Math.floor(value * eased))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setHasAnimated(true)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, reducedMotion, hasAnimated])

  const formatted = new Intl.NumberFormat("en-US").format(displayValue)

  return (
    <span>
      {prefix}
      {formatted}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger Row
// ─────────────────────────────────────────────────────────────────────────────

function LedgerRow({
  entry,
  index,
  reducedMotion,
}: {
  entry: LedgerEntry
  index: number
  reducedMotion: boolean
}) {
  const color = categoryColors[entry.category]
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true)
      return
    }
    const timer = setTimeout(() => setIsVisible(true), index * 60)
    return () => clearTimeout(timer)
  }, [index, reducedMotion])

  const changeColor =
    entry.change > 0
      ? "text-emerald-400"
      : entry.change < 0
      ? "text-red-400"
      : "text-zinc-500"

  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-2 px-4 py-3 transition-all duration-300",
        "hover:bg-zinc-800/40",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
      )}
    >
      {/* Category indicator */}
      <div className="col-span-1 flex items-center">
        <div
          className="w-1 h-6 rounded-full transition-all duration-300"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Category */}
      <div className="col-span-2 flex items-center">
        <span
          className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {entry.category}
        </span>
      </div>

      {/* Label */}
      <div className="col-span-4 flex items-center">
        <span className="text-sm text-zinc-300">{entry.label}</span>
      </div>

      {/* Value */}
      <div className="col-span-3 flex items-center justify-end font-mono">
        <span className="text-sm font-medium text-zinc-100">
          <AnimatedValue value={entry.value} prefix="$" reducedMotion={reducedMotion} />
        </span>
      </div>

      {/* Change */}
      <div className="col-span-2 flex items-center justify-end">
        <span className={cn("text-sm font-mono font-medium", changeColor)}>
          {entry.change > 0 && "+"}
          {entry.change.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function BioFabricLedger({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion()
  const total = React.useMemo(
    () => ledgerData.reduce((acc, entry) => acc + entry.value, 0),
    []
  )

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Capital Holdings Ledger
            </h3>
            <p className="text-2xl font-bold text-zinc-100 font-mono mt-1">
              <AnimatedValue value={total} prefix="$" reducedMotion={reducedMotion} />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Live</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/50">
        <div className="col-span-1" />
        <div className="col-span-2 text-[10px] font-semibold text-zinc-500 tracking-wider">
          CLASS
        </div>
        <div className="col-span-4 text-[10px] font-semibold text-zinc-500 tracking-wider">
          ASSET
        </div>
        <div className="col-span-3 text-[10px] font-semibold text-zinc-500 tracking-wider text-right">
          VALUE
        </div>
        <div className="col-span-2 text-[10px] font-semibold text-zinc-500 tracking-wider text-right">
          24H
        </div>
      </div>

      {/* Ledger Rows */}
      <div className="divide-y divide-zinc-800/30">
        {ledgerData.map((entry, index) => (
          <LedgerRow
            key={entry.id}
            entry={entry}
            index={index}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{ledgerData.length} positions</span>
          <span>Updated just now</span>
        </div>
      </div>
    </div>
  )
}
