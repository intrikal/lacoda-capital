/**
 * ============================================================================
 * FILE: components/forms/deal-form-dialog.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Form dialog for creating and editing deals in the pipeline.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/pipeline/page.tsx
 */
"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import type { DealRecord, DealStage, DealType } from "@/lib/hooks/crud/use-deals"
import type { CreateDealInput } from "@/lib/validations/deal.schema"

// ─── DISPLAY LABELS ──────────────────────────────────────────────────────────

const dealTypeLabels: Record<DealType, string> = {
  real_estate: "Real Estate",
  private_equity: "Private Equity",
  venture_capital: "Venture Capital",
  fixed_income: "Fixed Income",
}

interface DealFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<DealRecord>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateDealInput) => void
  isPending?: boolean
}

export function DealFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: DealFormDialogProps) {
  const [name, setName] = React.useState("")
  const [stage, setStage] = React.useState<DealStage>("prospecting")
  const [type, setType] = React.useState<DealType>("real_estate")
  const [potentialValue, setPotentialValue] = React.useState("0")
  const [probability, setProbability] = React.useState("50")
  const [assigneeName, setAssigneeName] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")
  const [notes, setNotes] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "")
      setStage(initialData?.stage ?? "prospecting")
      setType(initialData?.type ?? "real_estate")
      setPotentialValue(initialData?.potentialValue?.toString() ?? "0")
      setProbability(initialData?.probability?.toString() ?? "50")
      setAssigneeName(initialData?.assigneeName ?? "")
      setDueDate(initialData?.dueDate ?? "")
      setNotes(initialData?.notes ?? "")
    }
  }, [open, initialData])

  function handleSubmit() {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      stage,
      type,
      potentialValue: parseFloat(potentialValue) || 0,
      probability: parseInt(probability) || 50,
      assigneeName: assigneeName.trim() || null,
      dueDate: dueDate || null,
      notes: notes.trim() || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Deal" : "Edit Deal"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new deal to the pipeline." : "Update deal information."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Deal Name</Label>
            <Input
              placeholder="e.g., Series B - FinTech Startup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="due_diligence">Due Diligence</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="exit_planning">Exit Planning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as DealType)}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {(Object.entries(dealTypeLabels) as [DealType, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Potential Value ($)</Label>
              <Input
                type="number"
                value={potentialValue}
                onChange={(e) => setPotentialValue(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Input
                placeholder="e.g., Sarah Chen"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              placeholder="Deal notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : mode === "create" ? "Add Deal" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
