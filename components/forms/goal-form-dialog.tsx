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
import type { FinancialGoal, GoalCategory, GoalStatus } from "@/lib/mock/types"
import type { CreateGoalInput } from "@/lib/hooks/crud/use-goals"

const goalCategories: { value: GoalCategory; label: string }[] = [
  { value: "retirement", label: "Retirement" },
  { value: "education", label: "Education" },
  { value: "realestate", label: "Real Estate" },
  { value: "emergency", label: "Emergency Fund" },
  { value: "travel", label: "Travel" },
  { value: "vehicle", label: "Vehicle" },
  { value: "investment", label: "Investment" },
  { value: "custom", label: "Custom" },
]

interface GoalFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<FinancialGoal>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateGoalInput) => void
}

export function GoalFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: GoalFormDialogProps) {
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState<GoalCategory>("custom")
  const [targetAmount, setTargetAmount] = React.useState("0")
  const [currentAmount, setCurrentAmount] = React.useState("0")
  const [targetDate, setTargetDate] = React.useState("")
  const [monthlyContribution, setMonthlyContribution] = React.useState("0")
  const [priority, setPriority] = React.useState<"high" | "medium" | "low">("medium")
  const [status, setStatus] = React.useState<GoalStatus>("on_track")
  const [notes, setNotes] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "")
      setCategory(initialData?.category ?? "custom")
      setTargetAmount(initialData?.targetAmount?.toString() ?? "0")
      setCurrentAmount(initialData?.currentAmount?.toString() ?? "0")
      setTargetDate(initialData?.targetDate ?? "")
      setMonthlyContribution(initialData?.monthlyContribution?.toString() ?? "0")
      setPriority(initialData?.priority ?? "medium")
      setStatus(initialData?.status ?? "on_track")
      setNotes(initialData?.notes ?? "")
    }
  }, [open, initialData])

  function handleSubmit() {
    if (!name.trim() || !targetDate) return
    onSubmit({
      name: name.trim(),
      category,
      targetAmount: parseFloat(targetAmount) || 0,
      currentAmount: parseFloat(currentAmount) || 0,
      targetDate,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      priority,
      status,
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Goal" : "Edit Goal"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Set a new financial target to work towards." : "Update goal details."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Goal Name</Label>
            <Input
              placeholder="e.g., Dream Home Down Payment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {goalCategories.map((gc) => (
                    <SelectItem key={gc.value} value={gc.value}>{gc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "high" | "medium" | "low")}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Amount ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Amount ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Contribution ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Create Goal" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
