"use client"

import Link from "next/link"
import { Shield, CheckCircle2, AlertCircle, CalendarClock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ComplianceWidgetProps {
  score: number
  active: number
  verified: number
  overdue: number
  byFramework: Record<string, { total: number; verified: number }>
}

function ProgressBar({ value }: { value: number }) {
  const barColor =
    value === 100
      ? "bg-emerald-500"
      : value >= 60
        ? "bg-tiffany-500"
        : value >= 30
          ? "bg-amber-500"
          : "bg-red-500"

  return (
    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", barColor)}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function ComplianceWidget({
  score,
  active,
  verified,
  overdue,
  byFramework,
}: ComplianceWidgetProps) {
  const frameworks = Object.entries(byFramework).sort(([a], [b]) => a.localeCompare(b))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-tiffany-500" />
            Compliance Status
          </span>
          <Link href="/app/compliance">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-zinc-400">Overall</span>
              <span className="text-sm font-bold text-zinc-100">{score}%</span>
            </div>
            <ProgressBar value={score} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-zinc-100">{verified}</p>
            <p className="text-[10px] text-zinc-500">Verified</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-zinc-100">{active - verified}</p>
            <p className="text-[10px] text-zinc-500">Remaining</p>
          </div>
          <div className={cn(
            "text-center p-2 rounded-lg border",
            overdue > 0
              ? "bg-red-500/5 border-red-500/10"
              : "bg-zinc-800/50 border-zinc-700/50"
          )}>
            <CalendarClock className={cn(
              "h-4 w-4 mx-auto mb-1",
              overdue > 0 ? "text-red-400" : "text-zinc-500"
            )} />
            <p className={cn(
              "text-lg font-bold",
              overdue > 0 ? "text-red-400" : "text-zinc-100"
            )}>
              {overdue}
            </p>
            <p className="text-[10px] text-zinc-500">Overdue</p>
          </div>
        </div>

        {/* Per-Framework Progress */}
        {frameworks.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            {frameworks.slice(0, 4).map(([name, data]) => {
              const pct = data.total > 0 ? Math.round((data.verified / data.total) * 100) : 0
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-zinc-400">{name}</span>
                    <span className="text-xs text-zinc-500">
                      {data.verified}/{data.total}
                    </span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
