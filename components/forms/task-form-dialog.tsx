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
import type { Task } from "@/lib/mock/types"
import type { CreateTaskInput } from "@/lib/hooks/crud/use-tasks"

interface TaskFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<Task>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTaskInput) => void
}

export function TaskFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: TaskFormDialogProps) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")
  const [assignedTo, setAssignedTo] = React.useState("")
  const [priority, setPriority] = React.useState<Task["priority"]>("medium")
  const [status, setStatus] = React.useState<Task["status"]>("pending")

  React.useEffect(() => {
    if (open) {
      setTitle(initialData?.title ?? "")
      setDescription(initialData?.description ?? "")
      setDueDate(initialData?.dueDate ?? "")
      setAssignedTo(initialData?.assignedTo ?? "")
      setPriority(initialData?.priority ?? "medium")
      setStatus(initialData?.status ?? "pending")
    }
  }, [open, initialData])

  function handleSubmit() {
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      assignedTo: assignedTo.trim() || "Unassigned",
      priority,
      status,
      relatedEntity: initialData?.relatedEntity,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Task" : "Edit Task"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Create a new task." : "Update task details."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g., Review Q4 compliance report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Task details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Input
                placeholder="e.g., Sarah Chen"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Add Task" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
