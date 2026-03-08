/**
 * ============================================================================
 * FILE: components/forms/tax-deduction-form-dialog.tsx
 * ============================================================================
 *
 * Modal dialog for creating and editing client tax deductions.
 * Follows the TanStack Form + Zod validation pattern used across the app.
 *
 * FIELDS:
 *   client (required), name (required), category, type, status,
 *   amount, estimatedSavings, taxYear (required), description, notes.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/tax-writeoffs/page.tsx
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
  createTaxDeductionSchema,
  updateTaxDeductionSchema,
} from "@/lib/validations/tax-deduction.schema"
import type {
  CreateTaxDeductionInput,
  UpdateTaxDeductionInput,
} from "@/lib/validations/tax-deduction.schema"
import type { TaxDeductionItem } from "@/lib/hooks/crud/use-tax-deductions"

const TAX_CATEGORIES = [
  { value: "home_office", label: "Home Office" },
  { value: "vehicle", label: "Vehicle & Mileage" },
  { value: "travel", label: "Business Travel" },
  { value: "equipment", label: "Equipment & Software" },
  { value: "professional", label: "Professional Services" },
  { value: "education", label: "Education & Training" },
  { value: "healthcare", label: "Healthcare & Insurance" },
  { value: "meals", label: "Meals & Entertainment" },
  { value: "utilities", label: "Utilities & Services" },
  { value: "charitable", label: "Charitable Contributions" },
  { value: "retirement", label: "Retirement Contributions" },
  { value: "taxes", label: "Taxes (SALT, etc.)" },
  { value: "other", label: "Other" },
] as const

const TAX_TYPES = [
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
] as const

const TAX_STATUSES = [
  { value: "eligible", label: "Eligible" },
  { value: "pending_review", label: "Pending Review" },
  { value: "claimed", label: "Claimed" },
  { value: "ineligible", label: "Ineligible" },
] as const

interface ClientOption {
  id: string
  displayName: string
}

interface TaxDeductionFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<TaxDeductionItem>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTaxDeductionInput | UpdateTaxDeductionInput) => void
  isPending?: boolean
  clients: ClientOption[]
}

function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

export function TaxDeductionFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  clients,
}: TaxDeductionFormDialogProps) {
  const form = useForm({
    defaultValues: {
      clientId: initialData?.clientId ?? "",
      name: initialData?.name ?? "",
      category: (initialData?.category ?? "other") as string,
      type: (initialData?.type ?? "personal") as string,
      status: (initialData?.status ?? "eligible") as string,
      amount: initialData?.amount?.toString() ?? "0",
      estimatedSavings: initialData?.estimatedSavings?.toString() ?? "0",
      taxYear: initialData?.taxYear ?? new Date().getFullYear().toString(),
      description: initialData?.description ?? "",
      notes: initialData?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      const raw = {
        clientId: value.clientId || undefined,
        name: value.name.trim() || undefined,
        category: value.category || undefined,
        type: value.type || undefined,
        status: value.status || undefined,
        amount: value.amount ? parseFloat(value.amount) : 0,
        estimatedSavings: value.estimatedSavings
          ? parseFloat(value.estimatedSavings)
          : 0,
        taxYear: value.taxYear || undefined,
        description: value.description.trim() || null,
        notes: value.notes.trim() || null,
      }

      const schema =
        mode === "create" ? createTaxDeductionSchema : updateTaxDeductionSchema
      const parsed = schema.safeParse(raw)
      if (!parsed.success) return
      onSubmit(parsed.data as CreateTaxDeductionInput & UpdateTaxDeductionInput)
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        if (mode === "create" && !value.clientId) return "Client is required"
        if (!value.name.trim()) return "Name is required"
        if (!value.taxYear.trim()) return "Tax year is required"
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
            {mode === "create" ? "Add Deduction" : "Edit Deduction"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Track a new tax deduction for a client."
              : "Update tax deduction details."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          {/* Client + Tax Year */}
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
              name="taxYear"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() ? "Tax year is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Tax Year</Label>
                  <Input
                    id={field.name}
                    placeholder="e.g., 2024"
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
                <Label htmlFor={field.name}>Deduction Name</Label>
                <Input
                  id={field.name}
                  placeholder="e.g., Mortgage Interest, SEP-IRA Contribution"
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

          {/* Category + Type */}
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
                      {TAX_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="type">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {TAX_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* Amount + Estimated Savings */}
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

            <form.Field name="estimatedSavings">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Est. Savings ($)</Label>
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

          {/* Status */}
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
                    {TAX_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Description</Label>
                <Input
                  id={field.name}
                  placeholder="Brief description of the deduction..."
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
                  placeholder="Optional advisor notes..."
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
              ? "Add Deduction"
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
