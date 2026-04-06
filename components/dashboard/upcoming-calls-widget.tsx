"use client"

import { useState, useEffect } from "react"
import { getUpcomingCapitalCalls } from "@/lib/actions/capital-event.actions"

// ============================================================================
// Upcoming Capital Calls Widget — Dashboard
// ============================================================================

interface UpcomingCall {
  id: string
  assetId: string
  assetName: string
  amount: string
  currency: string
  dueDate: Date | null
  eventDate: Date
  status: string
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

export function UpcomingCallsWidget() {
  const [calls, setCalls] = useState<UpcomingCall[]>([])
  const [loaded, setLoaded] = useState(false)
  const loading = !loaded

  useEffect(() => {
    let cancelled = false
    getUpcomingCapitalCalls(30)
      .then((data) => {
        if (!cancelled) {
          setCalls(data as unknown as UpcomingCall[])
          setLoaded(true)
        }
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Upcoming Capital Calls</h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-300">
        Upcoming Capital Calls
        {calls.length > 0 && (
          <span className="ml-2 rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] text-amber-400">
            {calls.length}
          </span>
        )}
      </h3>

      {calls.length === 0 ? (
        <p className="text-sm text-zinc-500">No upcoming calls in the next 30 days</p>
      ) : (
        <div className="space-y-2">
          {calls.slice(0, 5).map((call) => {
            const days = call.dueDate ? daysUntil(new Date(call.dueDate)) : null
            const isOverdue = call.status === "overdue" || (days !== null && days < 0)

            return (
              <div
                key={call.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-200">
                    {call.assetName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {call.dueDate
                      ? `Due ${new Date(call.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : "No due date"
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-100 tabular-nums">
                    {formatCurrency(parseFloat(call.amount), call.currency)}
                  </p>
                  {days !== null && (
                    <p className={`text-[10px] font-medium ${isOverdue ? "text-red-400" : days <= 7 ? "text-amber-400" : "text-zinc-500"}`}>
                      {isOverdue
                        ? `${Math.abs(days)} days overdue`
                        : days === 0
                          ? "Due today"
                          : `${days} days`
                      }
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
