"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBillingOverview } from "@/lib/actions/subscription.actions"
import type { UsageStatus } from "@/lib/stripe/plan-limits"
import { cn } from "@/lib/utils"

/**
 * UsageLimitBanner
 *
 * Renders a warning or error banner when org is approaching or exceeding
 * plan limits (AUM, team members, storage). Shown at the top of the
 * dashboard layout.
 *
 * Soft block: warning only, no hard block on functionality.
 */
export function UsageLimitBanner() {
  const [alerts, setAlerts] = React.useState<UsageStatus[]>([])
  const [dismissed, setDismissed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    getBillingOverview()
      .then((data) => {
        if (cancelled) return
        const warnings = data.usageStatuses.filter(
          (s) => s.level === "warning" || s.level === "exceeded"
        )
        setAlerts(warnings)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (dismissed || alerts.length === 0) return null

  const hasExceeded = alerts.some((a) => a.level === "exceeded")
  const borderColor = hasExceeded ? "border-red-500/30" : "border-amber-500/30"
  const bgColor = hasExceeded ? "bg-red-500/5" : "bg-amber-500/5"
  const iconColor = hasExceeded ? "text-red-400" : "text-amber-400"
  const textColor = hasExceeded ? "text-red-300" : "text-amber-300"

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border mb-4",
        borderColor,
        bgColor
      )}
    >
      <AlertTriangle className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconColor)} />
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", textColor)}>
          {hasExceeded ? "Plan limit exceeded" : "Approaching plan limits"}
        </div>
        <div className="text-xs text-zinc-400 mt-1 space-y-0.5">
          {alerts.map((a) => (
            <p key={a.resource}>{a.message}</p>
          ))}
        </div>
        <Button
          variant="link"
          size="sm"
          className={cn("h-auto p-0 mt-1 text-xs", textColor)}
          asChild
        >
          <Link href="/app/settings?tab=billing">
            {hasExceeded ? "Upgrade your plan" : "View billing"}
          </Link>
        </Button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-zinc-500 hover:text-zinc-400"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
