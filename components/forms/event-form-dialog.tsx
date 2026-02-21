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
import type { CalendarEvent, CalendarEventType } from "@/lib/mock/types"
import type { CreateCalendarEventInput } from "@/lib/hooks/crud/use-calendar-events"

const eventTypes: { value: CalendarEventType; label: string }[] = [
  { value: "meeting", label: "Meeting" },
  { value: "payment", label: "Payment Due" },
  { value: "dividend", label: "Dividend" },
  { value: "deadline", label: "Deadline" },
  { value: "document", label: "Document" },
  { value: "call", label: "Call" },
]

interface EventFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<CalendarEvent>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCalendarEventInput) => void
}

export function EventFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: EventFormDialogProps) {
  const [title, setTitle] = React.useState("")
  const [type, setType] = React.useState<CalendarEventType>("meeting")
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [description, setDescription] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setTitle(initialData?.title ?? "")
      setType(initialData?.type ?? "meeting")
      setDate(initialData?.date ?? "")
      setTime(initialData?.time ?? "")
      setEndTime(initialData?.endTime ?? "")
      setLocation(initialData?.location ?? "")
      setAmount(initialData?.amount?.toString() ?? "")
      setDescription(initialData?.description ?? "")
    }
  }, [open, initialData])

  function handleSubmit() {
    if (!title.trim() || !date) return
    onSubmit({
      title: title.trim(),
      type,
      date,
      time: time || undefined,
      endTime: endTime || undefined,
      location: location.trim() || undefined,
      amount: amount ? parseFloat(amount) : undefined,
      description: description.trim() || undefined,
      reminder: true,
    })
    onOpenChange(false)
  }

  const showAmount = type === "payment" || type === "dividend"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Event" : "Edit Event"}</DialogTitle>
          <DialogDescription>
            Schedule a meeting, payment, or deadline.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Event Title</Label>
            <Input
              placeholder="Enter event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {eventTypes.map((et) => (
                  <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          {showAmount && (
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="e.g., Conference Room A"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Add Event" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
