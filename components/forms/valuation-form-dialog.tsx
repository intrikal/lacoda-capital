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
import type { CreateValuationInput } from "@/lib/validations/valuation.schema"

interface ValuationFormDialogProps {
  assetId: string
  assetName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateValuationInput) => void
  isPending?: boolean
}

export function ValuationFormDialog({
  assetId,
  assetName,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: ValuationFormDialogProps) {
  const [value, setValue] = React.useState("")
  const [asOfDate, setAsOfDate] = React.useState("")
  const [source, setSource] = React.useState("manual")
  const [notes, setNotes] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setValue("")
      setAsOfDate(new Date().toISOString().split("T")[0])
      setSource("manual")
      setNotes("")
    }
  }, [open])

  function handleSubmit() {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || !asOfDate) return

    onSubmit({
      assetId,
      value: numValue,
      asOfDate,
      currency: "USD",
      source: source || null,
      notes: notes.trim() || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Add Valuation</DialogTitle>
          <DialogDescription>
            Record a new valuation{assetName ? ` for ${assetName}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="valuation-value">Value</Label>
            <Input
              id="valuation-value"
              type="number"
              step="0.01"
              min="0"
              placeholder="5,000,000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="appraisal">Appraisal</SelectItem>
                  <SelectItem value="market_data">Market Data</SelectItem>
                  <SelectItem value="ai_extraction">AI Extraction</SelectItem>
                  <SelectItem value="api_feed">API Feed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              placeholder="e.g., Q1 2024 appraisal report"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !value || !asOfDate}>
            {isPending ? "Saving…" : "Add Valuation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
