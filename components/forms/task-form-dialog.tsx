/**
 * ============================================================================
 * FILE: /components/forms/task-form-dialog.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   A modal dialog for creating and editing tasks. Used for both "Add Task"
 *   (create) and "Edit Task" (update) flows.
 *
 * PATTERN:
 *   Follows the same architecture as report-form-dialog.tsx:
 *     - TanStack Form for state management + validation
 *     - Zod schema (updateTaskSchema) for field validation
 *     - Radix Dialog (via shadcn/ui) for the modal container
 *
 * DATA FLOW:
 *   User clicks "Add Task" or "Edit" → dialog opens with optional pre-filled
 *   data → user fills fields → "Save" → updateTaskSchema validates →
 *   onSubmit(parsedData) → parent calls create/update mutation → DB updated
 *   → GET_TASKS refetched → list updates.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/tasks/page.tsx
 *
 * RELATED FILES:
 *   - components/forms/report-form-dialog.tsx — same pattern for reports
 *   - lib/validations/task.schema.ts          — Zod validation schemas
 *   - lib/hooks/crud/use-tasks.ts             — TaskRecord type
 */

"use client"

import { useForm } from "@tanstack/react-form"
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
import { updateTaskSchema } from "@/lib/validations/task.schema"
import type { UpdateTaskInput } from "@/lib/validations/task.schema"
import type { TaskRecord } from "@/lib/hooks/crud/use-tasks"

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TaskStatus = TaskRecord["status"]
type TaskPriority = TaskRecord["priority"]

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface TaskFormDialogProps {
  /** "create" shows "Add Task" title; "edit" shows "Edit Task". */
  mode: "create" | "edit"

  /** Existing task data to pre-fill form fields (for edit mode). */
  initialData?: Partial<TaskRecord>

  /** Controls dialog visibility. */
  open: boolean

  /** Callback to open/close the dialog. */
  onOpenChange: (open: boolean) => void

  /**
   * Callback when the form is submitted with validated data.
   * The parent component decides whether to call createMutation or updateMutation.
   */
  onSubmit: (data: UpdateTaskInput & { title?: string }) => void

  /** Shows a loading state on the submit button while the mutation runs. */
  isPending?: boolean
}

// ─── FIELD ERROR HELPER ─────────────────────────────────────────────────────

function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function TaskFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: TaskFormDialogProps) {
  const isCreate = mode === "create"

  const form = useForm({
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      dueDate: initialData?.dueDate?.split("T")[0] ?? "",
      priority: (initialData?.priority ?? "medium") as TaskPriority,
      status: (initialData?.status ?? "pending") as TaskStatus,
    },
    onSubmit: async ({ value }) => {
      const payload: Record<string, unknown> = {
        title: value.title || undefined,
        description: value.description || null,
        dueDate: value.dueDate || null,
        priority: value.priority || undefined,
        status: value.status || undefined,
      }

      const parsed = updateTaskSchema.safeParse(payload)
      if (!parsed.success) return

      onSubmit({ ...parsed.data, title: value.title })
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        if (!value.title?.trim()) return "Task title is required"
        return undefined
      },
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "Add New Task" : "Edit Task"}
          </DialogTitle>
          <DialogDescription>
            {isCreate ? "Create a new task." : "Update task details."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4 py-4"
        >
          {/* Title (required) */}
          <form.Field
            name="title"
            validators={{
              onBlur: ({ value }) => {
                if (!value?.trim()) return "Title is required"
                return undefined
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="task-title">Title *</Label>
                <Input
                  id="task-title"
                  placeholder="e.g., Review Q4 compliance report"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="bg-zinc-800/50 border-zinc-700"
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError
                  errors={field.state.meta.errors.filter(Boolean) as string[]}
                />
              </div>
            )}
          </form.Field>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="task-description">Description</Label>
                <Input
                  id="task-description"
                  placeholder="Task details..."
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <form.Field name="dueDate">
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor="task-duedate">Due Date</Label>
                  <Input
                    id="task-duedate"
                    type="date"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>

            {/* Priority */}
            <form.Field name="priority">
              {(field) => (
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as TaskPriority)}
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Task priority"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {TASK_PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* Status */}
          <form.Field name="status">
            {(field) => (
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as TaskStatus)}
                >
                  <SelectTrigger
                    className="bg-zinc-800/50 border-zinc-700"
                    aria-label="Task status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {TASK_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isCreate
                  ? "Adding…"
                  : "Saving…"
                : isCreate
                  ? "Add Task"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
