"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getCapitalEvents,
  createCapitalEvent,
  updateCapitalEventStatus,
  archiveCapitalEvent,
} from "@/lib/actions/capital-event.actions"
import { calculatePEMetrics } from "@/lib/calculations/pe-metrics"
import type { CapitalEvent } from "@/app/db/schema"

// ============================================================================
// Capital Activity Tab — PE/VC asset detail
// ============================================================================

interface CapitalActivityProps {
  assetId: string
  committedCapital: number
  calledCapitalCached: number
  distributedCached: number
  currentValue: number
  currency: string
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatMetric(value: number | null): string {
  if (value === null) return "—"
  return `${value.toFixed(2)}x`
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-400",
  paid: "bg-emerald-900/40 text-emerald-400",
  received: "bg-cyan-900/40 text-cyan-400",
  overdue: "bg-red-900/40 text-red-400",
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  capital_call: "Capital Call",
  distribution: "Distribution",
  recallable: "Recallable Distribution",
}

export function CapitalActivity({
  assetId,
  committedCapital,
  calledCapitalCached,
  distributedCached,
  currentValue,
  currency,
}: CapitalActivityProps) {
  const [events, setEvents] = useState<CapitalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<"capital_call" | "distribution">("capital_call")

  // Form state
  const [amount, setAmount] = useState("")
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState<"pending" | "paid" | "received">("pending")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use the latest cached values for live updates
  const [called, setCalled] = useState(calledCapitalCached)
  const [distributed, setDistributed] = useState(distributedCached)

  const metrics = calculatePEMetrics({
    committedCapital,
    calledCapital: called,
    distributed,
    currentValue,
  })

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCapitalEvents(assetId)
      setEvents(data)
      // Recalculate from events for accuracy
      let newCalled = 0
      let newDistributed = 0
      for (const e of data) {
        const amt = parseFloat(e.amount)
        if (e.eventType === "capital_call" && e.status === "paid") newCalled += amt
        if (e.eventType === "distribution" && e.status === "received") newDistributed += amt
        if (e.eventType === "recallable" && e.status === "received") newDistributed -= amt
      }
      setCalled(newCalled)
      setDistributed(Math.max(0, newDistributed))
    } finally {
      setLoading(false)
    }
  }, [assetId])

  useEffect(() => { loadEvents() }, [loadEvents])

  const handleAdd = async () => {
    setSaving(true)
    setError(null)
    try {
      await createCapitalEvent({
        assetId,
        eventType: addType,
        amount: parseFloat(amount),
        currency,
        eventDate,
        dueDate: dueDate || null,
        status,
        notes: notes || null,
      })
      setShowAddDialog(false)
      setAmount("")
      setNotes("")
      setDueDate("")
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event")
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      await updateCapitalEventStatus({ id: eventId, status: newStatus })
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  const handleArchive = async (eventId: string) => {
    try {
      await archiveCapitalEvent(eventId)
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive event")
    }
  }

  const openAddDialog = (type: "capital_call" | "distribution") => {
    setAddType(type)
    setStatus(type === "capital_call" ? "pending" : "pending")
    setShowAddDialog(true)
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-500">Committed</p>
          <p className="text-sm font-semibold text-zinc-100">
            {formatCurrency(committedCapital, currency)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-500">Called to Date</p>
          <p className="text-sm font-semibold text-zinc-100">
            {formatCurrency(called, currency)}
          </p>
          {metrics.isOverCommitted && (
            <span className="text-[10px] text-amber-400">Over-committed</span>
          )}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-500">Distributed</p>
          <p className="text-sm font-semibold text-zinc-100">
            {formatCurrency(distributed, currency)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-500">Remaining</p>
          <p className="text-sm font-semibold text-zinc-100">
            {formatCurrency(metrics.remainingCommitment, currency)}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">TVPI</span>
          <span className="text-sm font-semibold text-zinc-200">
            {formatMetric(metrics.tvpi)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">DPI</span>
          <span className="text-sm font-semibold text-zinc-200">
            {formatMetric(metrics.dpi)}
          </span>
          {metrics.isFullyReturned && (
            <span className="text-[10px] text-emerald-400">Capital returned</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">RVPI</span>
          <span className="text-sm font-semibold text-zinc-200">
            {formatMetric(metrics.rvpi)}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => openAddDialog("capital_call")}>
          Add Capital Call
        </Button>
        <Button size="sm" variant="outline" onClick={() => openAddDialog("distribution")}>
          Add Distribution
        </Button>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-zinc-800" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">
          No capital events yet. Add a capital call or distribution to get started.
        </p>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-3 py-2 text-left text-xs text-zinc-400">Type</th>
                <th className="px-3 py-2 text-right text-xs text-zinc-400">Amount</th>
                <th className="px-3 py-2 text-right text-xs text-zinc-400">Date</th>
                <th className="px-3 py-2 text-center text-xs text-zinc-400">Status</th>
                <th className="px-3 py-2 text-right text-xs text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-zinc-800/50">
                  <td className="px-3 py-2 text-zinc-300">
                    {EVENT_TYPE_LABELS[event.eventType]}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-200">
                    {formatCurrency(parseFloat(event.amount), event.currency)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-400">
                    {new Date(event.eventDate).toLocaleDateString()}
                    {event.dueDate && (
                      <div className="text-[10px] text-zinc-500">
                        Due: {new Date(event.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[event.status]}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {event.status === "pending" && event.eventType === "capital_call" && (
                        <button
                          onClick={() => handleStatusChange(event.id, "paid")}
                          className="text-[10px] text-emerald-400 hover:underline"
                        >
                          Mark Paid
                        </button>
                      )}
                      {event.status === "overdue" && event.eventType === "capital_call" && (
                        <button
                          onClick={() => handleStatusChange(event.id, "paid")}
                          className="text-[10px] text-emerald-400 hover:underline"
                        >
                          Mark Paid
                        </button>
                      )}
                      {event.status === "pending" && event.eventType !== "capital_call" && (
                        <button
                          onClick={() => handleStatusChange(event.id, "received")}
                          className="text-[10px] text-cyan-400 hover:underline"
                        >
                          Mark Received
                        </button>
                      )}
                      <button
                        onClick={() => handleArchive(event.id)}
                        className="text-[10px] text-zinc-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addType === "capital_call" ? "Add Capital Call" : "Add Distribution"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2,000,000"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              {addType === "capital_call" && (
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  {addType === "capital_call" ? (
                    <SelectItem value="paid">Paid</SelectItem>
                  ) : (
                    <SelectItem value="received">Received</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="mt-1"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving || !amount}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
