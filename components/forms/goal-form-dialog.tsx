/**
 * ============================================================================
 * FILE: components/forms/goal-form-dialog.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   A modal dialog for creating and editing financial goals.
 *   Supports create mode (new goal) and edit mode (update existing goal).
 *
 * PATTERN:
 *   Follows the same architecture as document-form-dialog.tsx:
 *     - TanStack Form for state management + validation
 *     - Zod schema for field validation (createGoalSchema / updateGoalSchema)
 *     - Radix Dialog (via shadcn/ui) for the modal container
 *     - FieldError helper for inline validation messages
 *
 * DATA FLOW (create):
 *   "Add Goal" → dialog opens empty → user fills fields → "Create Goal" →
 *   createGoalSchema validates → onSubmit(data) → page calls createMutation →
 *   DB row inserted → GET_GOALS refetched → list updates.
 *
 * DATA FLOW (edit):
 *   "Edit" on goal card → page sets editTarget → dialog opens pre-filled →
 *   user modifies fields → "Save Changes" → updateGoalSchema validates →
 *   onSubmit(data) → page calls updateMutation → DB updated → list updates.
 *
 * FIELDS:
 *   name (required), category, priority, targetAmount (required),
 *   currentAmount, monthlyContribution, targetDate (required), notes.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/goals/page.tsx
 *   - app/(client)/client/goals/page.tsx
 *
 * RELATED FILES:
 *   - lib/validations/goal.schema.ts  — Zod validation schemas
 *   - lib/hooks/crud/use-goals.ts     — GoalRecord type + mutation hooks
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
import { createGoalSchema, updateGoalSchema } from "@/lib/validations/goal.schema"
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validations/goal.schema"
import type { GoalRecord } from "@/lib/hooks/crud/use-goals"

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const GOAL_CATEGORIES = [
  { value: "retirement", label: "Retirement" },
  { value: "education", label: "Education" },
  { value: "realestate", label: "Real Estate" },
  { value: "emergency", label: "Emergency Fund" },
  { value: "travel", label: "Travel" },
  { value: "vehicle", label: "Vehicle" },
  { value: "investment", label: "Investment" },
  { value: "custom", label: "Custom" },
] as const

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface GoalFormDialogProps {
  /**
   * "create" — empty form, onSubmit receives CreateGoalInput.
   * "edit"   — pre-filled form, onSubmit receives UpdateGoalInput.
   */
  mode: "create" | "edit"

  /** Pre-fill fields when mode === "edit". */
  initialData?: Partial<GoalRecord>

  /** Controls dialog visibility. */
  open: boolean

  /** Callback to open/close the dialog. Called with `false` to close. */
  onOpenChange: (open: boolean) => void

  /** Callback when the form is submitted with validated data. */
  onSubmit: (data: CreateGoalInput | UpdateGoalInput) => void

  /** Shows a loading state on the submit button while the mutation runs. */
  isPending?: boolean
}

// ─── FIELD ERROR HELPER ───────────────────────────────────────────────────────

/** Renders the first validation error below a form field. Null if no errors. */
function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function GoalFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: GoalFormDialogProps) {
  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? "",
      category: (initialData?.category ?? "custom") as string,
      priority: (initialData?.priority ?? "medium") as string,
      targetAmount: initialData?.targetAmount?.toString() ?? "",
      currentAmount: initialData?.currentAmount?.toString() ?? "0",
      monthlyContribution: initialData?.monthlyContribution?.toString() ?? "0",
      targetDate: initialData?.targetDate ?? "",
      notes: initialData?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      const raw = {
        name: value.name.trim() || undefined,
        category: value.category || undefined,
        priority: value.priority || undefined,
        targetAmount: value.targetAmount ? parseFloat(value.targetAmount) : undefined,
        currentAmount: value.currentAmount ? parseFloat(value.currentAmount) : 0,
        monthlyContribution: value.monthlyContribution
          ? parseFloat(value.monthlyContribution)
          : 0,
        targetDate: value.targetDate || undefined,
        notes: value.notes.trim() || null,
      }

      const schema = mode === "create" ? createGoalSchema : updateGoalSchema
      const parsed = schema.safeParse(raw)
      if (!parsed.success) return
      onSubmit(parsed.data as CreateGoalInput & UpdateGoalInput)
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        if (!value.name.trim()) return "Name is required"
        if (!value.targetAmount || parseFloat(value.targetAmount) <= 0)
          return "Target amount must be positive"
        if (!value.targetDate) return "Target date is required"
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
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Goal" : "Edit Goal"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Set a new financial target to work towards."
              : "Update goal details and progress."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          {/* Name */}
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Name is required" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Goal Name</Label>
                <Input
                  id={field.name}
                  placeholder="e.g., Retirement Fund, Dream Home"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
                <FieldError
                  errors={field.state.meta.errors.filter(Boolean) as string[]}
                />
              </div>
            )}
          </form.Field>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="category">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {GOAL_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="priority">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
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
              )}
            </form.Field>
          </div>

          {/* Target Amount + Current Amount */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="targetAmount"
              validators={{
                onChange: ({ value }) => {
                  const n = parseFloat(value)
                  if (!value || isNaN(n) || n <= 0)
                    return "Must be a positive number"
                  return undefined
                },
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Target Amount ($)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <FieldError
                    errors={field.state.meta.errors.filter(Boolean) as string[]}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="currentAmount">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Current Amount ($)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Target Date + Monthly Contribution */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="targetDate"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Target date is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Target Date</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <FieldError
                    errors={field.state.meta.errors.filter(Boolean) as string[]}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="monthlyContribution">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Monthly Contribution ($)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Notes */}
          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Notes</Label>
                <Input
                  id={field.name}
                  placeholder="Optional notes about this goal..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => form.handleSubmit()}
            disabled={isPending}
          >
            {isPending
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
              ? "Create Goal"
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
