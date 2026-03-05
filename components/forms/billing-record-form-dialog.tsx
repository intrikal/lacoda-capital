/**
 * ============================================================================
 * FILE: components/forms/billing-record-form-dialog.tsx
 * ============================================================================
 *
 * Modal dialog for creating and editing billing records (advisory fee invoices).
 * Follows the TanStack Form + Zod validation pattern used across the app.
 *
 * FIELDS:
 *   client (required), period, amount, aum, dueDate, paidDate,
 *   effectiveRate, status, description, notes.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/billing/page.tsx
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
import {
  createBillingRecordSchema,
  updateBillingRecordSchema,
} from "@/lib/validations/billing-record.schema"
import type {
  CreateBillingRecordInput,
  UpdateBillingRecordInput,
} from "@/lib/validations/billing-record.schema"
import type { BillingRecordItem } from "@/lib/hooks/crud/use-billing-records"

const BILLING_STATUSES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "due", label: "Due" },
  { value: "paid", label: "Paid" },
] as const

interface ClientOption {
  id: string
  displayName: string
}

interface BillingRecordFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<BillingRecordItem>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateBillingRecordInput | UpdateBillingRecordInput) => void
  isPending?: boolean
  clients: ClientOption[]
}

function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

export function BillingRecordFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  clients,
}: BillingRecordFormDialogProps) {
  const form = useForm({
    defaultValues: {
      clientId: initialData?.clientId ?? "",
      period: initialData?.period ?? "",
      amount: initialData?.amount?.toString() ?? "",
      aum: initialData?.aum?.toString() ?? "0",
      dueDate: initialData?.dueDate ?? "",
      paidDate: initialData?.paidDate ?? "",
      effectiveRate: initialData?.effectiveRate?.toString() ?? "",
      status: (initialData?.status ?? "upcoming") as string,
      description: initialData?.description ?? "",
      notes: initialData?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      const raw = {
        clientId: value.clientId || undefined,
        period: value.period.trim() || undefined,
        amount: value.amount ? parseFloat(value.amount) : 0,
        aum: value.aum ? parseFloat(value.aum) : 0,
        dueDate: value.dueDate || undefined,
        paidDate: value.paidDate.trim() || null,
        effectiveRate: value.effectiveRate ? parseFloat(value.effectiveRate) : 0,
        status: value.status || undefined,
        description: value.description.trim() || null,
        notes: value.notes.trim() || null,
      }

      const schema =
        mode === "create" ? createBillingRecordSchema : updateBillingRecordSchema
      const parsed = schema.safeParse(raw)
      if (!parsed.success) return
      onSubmit(parsed.data as CreateBillingRecordInput & UpdateBillingRecordInput)
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        if (mode === "create" && !value.clientId) return "Client is required"
        if (!value.period.trim()) return "Period is required"
        if (!value.dueDate) return "Due date is required"
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
            {mode === "create" ? "Create Invoice" : "Edit Invoice"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new advisory fee invoice for a client."
              : "Update invoice details and payment status."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          {/* Client + Period */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="clientId"
              validators={{
                onChange: ({ value }) =>
                  mode === "create" && !value ? "Client is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError
                    errors={
                      field.state.meta.errors.filter(Boolean) as string[]
                    }
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="period"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() ? "Period is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Period</Label>
                  <Input
                    id={field.name}
                    placeholder="e.g., Q1 2024"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <FieldError
                    errors={
                      field.state.meta.errors.filter(Boolean) as string[]
                    }
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Amount + AUM */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="amount">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Amount ($)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="aum">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>AUM ($)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Due Date + Paid Date */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="dueDate"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Due date is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Due Date</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <FieldError
                    errors={
                      field.state.meta.errors.filter(Boolean) as string[]
                    }
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="paidDate">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Paid Date</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Effective Rate + Status */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="effectiveRate">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Effective Rate</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g., 0.0085"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {BILLING_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Description</Label>
                <Input
                  id={field.name}
                  placeholder="e.g., Q1 2024 Advisory Fee"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          {/* Notes */}
          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Notes</Label>
                <Input
                  id={field.name}
                  placeholder="Optional internal notes..."
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
          <Button onClick={() => form.handleSubmit()} disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
              ? "Create Invoice"
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
