/**
 * ============================================================================
 * FILE: /components/forms/compliance-control-form-dialog.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   A modal dialog for creating and editing compliance controls. Used for
 *   both "Add Control" (create) and "Edit Control" (update) flows.
 *
 * PATTERN:
 *   Follows the same architecture as report-form-dialog.tsx and
 *   task-form-dialog.tsx:
 *     - TanStack Form for state management + validation
 *     - Zod schema (updateComplianceControlSchema) for field validation
 *     - Radix Dialog (via shadcn/ui) for the modal container
 *     - FieldError helper for inline validation messages
 *
 * DATA FLOW:
 *   User clicks "Add Control" or "Edit" → dialog opens with optional
 *   pre-filled data → user fills fields → "Save" → schema validates →
 *   onSubmit(parsedData) → parent calls create/update mutation → DB updated
 *   → GET_COMPLIANCE_CONTROLS refetched → list updates.
 *
 * FIELDS:
 *   code (required, create-only — immutable after creation like reportType)
 *   name (required)
 *   description (optional)
 *   category (optional — grouping label e.g., "KYC", "AML", "TAX")
 *   frequency (optional — recurrence e.g., "annually", "quarterly")
 *
 * WHY ONE DIALOG FOR BOTH CREATE AND EDIT?
 *   The form fields are identical — the only difference is:
 *     - Create: code is editable, parent calls useCreateComplianceControl
 *     - Edit: code is read-only/hidden, parent calls useUpdateComplianceControl
 *   The `mode` prop controls the title and button label.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/compliance/page.tsx
 *
 * RELATED FILES:
 *   - lib/validations/compliance.schema.ts  — Zod validation schemas
 *   - lib/hooks/crud/use-compliance.ts      — ComplianceControlRecord type
 *   - components/forms/report-form-dialog.tsx — same pattern for reports
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
import { updateComplianceControlSchema } from "@/lib/validations/compliance.schema"
import type { UpdateComplianceControlInput } from "@/lib/validations/compliance.schema"
import type { ComplianceControlRecord } from "@/lib/hooks/crud/use-compliance"

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/**
 * Common compliance categories — matches the convention used by the mock data
 * and the metadata.regulatorySource field. Users can also type a custom value.
 */
const CATEGORY_OPTIONS = [
  { value: "KYC", label: "KYC — Know Your Customer" },
  { value: "AML", label: "AML — Anti-Money Laundering" },
  { value: "TAX", label: "TAX — Tax Reporting" },
  { value: "REGULATORY", label: "REGULATORY — Regulatory" },
  { value: "OPERATIONAL", label: "OPERATIONAL — Operational" },
  { value: "SECURITY", label: "SECURITY — Security" },
]

/**
 * Recurrence frequency options for how often a control must be re-satisfied.
 * Maps to the `frequency` column in the `complianceControls` table.
 */
const FREQUENCY_OPTIONS = [
  { value: "once", label: "Once (one-time only)" },
  { value: "annually", label: "Annually" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
  { value: "on_change", label: "On Change (re-verify on any update)" },
]

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface ComplianceControlFormDialogProps {
  /** "create" shows "Add Control" title; "edit" shows "Edit Control". */
  mode: "create" | "edit"

  /** Existing control data to pre-fill form fields (for edit mode). */
  initialData?: Partial<ComplianceControlRecord>

  /** Controls dialog visibility. */
  open: boolean

  /** Callback to open/close the dialog. Called with `false` to close. */
  onOpenChange: (open: boolean) => void

  /**
   * Callback when the form is submitted with validated data.
   * The parent component decides whether to call createMutation or updateMutation.
   *
   * In create mode, `code` is included (from the form's code field).
   * In edit mode, `code` is not included (immutable — resolver ignores it).
   */
  onSubmit: (data: UpdateComplianceControlInput & { code?: string }) => void

  /** Shows a loading state on the submit button while the mutation runs. */
  isPending?: boolean
}

// ─── FIELD ERROR HELPER ─────────────────────────────────────────────────────

/** Renders the first validation error below a form field. Null if no errors. */
function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export function ComplianceControlFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: ComplianceControlFormDialogProps) {
  const isCreate = mode === "create"

  const form = useForm({
    defaultValues: {
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      category: initialData?.category ?? "",
      frequency: initialData?.frequency ?? "",
    },
    onSubmit: async ({ value }) => {
      const payload: Record<string, unknown> = {
        name: value.name || undefined,
        description: value.description || null,
        category: value.category || null,
        frequency: value.frequency || null,
      }

      const parsed = updateComplianceControlSchema.safeParse(payload)
      if (!parsed.success) return

      // Pass code alongside the parsed data for create mode.
      // The parent component will include it in CreateComplianceControlInput.
      onSubmit(isCreate ? { ...parsed.data, code: value.code } : parsed.data)
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        if (!value.name?.trim()) return "Control name is required"
        if (isCreate && !value.code?.trim()) return "Control code is required"
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
            {isCreate ? "Add Compliance Control" : "Edit Compliance Control"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Define a new compliance requirement for your organization."
              : "Update control details. Code cannot be changed after creation."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4 py-4"
        >
          {/* Code (required, create-only — immutable) */}
          {isCreate && (
            <form.Field
              name="code"
              validators={{
                onBlur: ({ value }) => {
                  if (!value?.trim()) return "Code is required"
                  return undefined
                },
              }}
            >
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor="control-code">Code *</Label>
                  <Input
                    id="control-code"
                    placeholder="e.g., KYC-001, AML-002"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="bg-zinc-800/50 border-zinc-700 font-mono"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <p className="text-xs text-zinc-500">
                    Unique identifier — cannot be changed after creation.
                  </p>
                  <FieldError
                    errors={field.state.meta.errors.filter(Boolean) as string[]}
                  />
                </div>
              )}
            </form.Field>
          )}

          {/* Name (required) */}
          <form.Field
            name="name"
            validators={{
              onBlur: ({ value }) => {
                if (!value?.trim()) return "Name is required"
                return undefined
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="control-name">Name *</Label>
                <Input
                  id="control-name"
                  placeholder="e.g., Collect Passport for KYC"
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

          {/* Description (optional) */}
          <form.Field name="description">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="control-description">Description</Label>
                <Input
                  id="control-description"
                  placeholder="What this control requires..."
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <form.Field name="category">
              {(field) => (
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select
                    value={field.state.value ?? ""}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Control category"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Frequency */}
            <form.Field name="frequency">
              {(field) => (
                <div className="space-y-1">
                  <Label>Frequency</Label>
                  <Select
                    value={field.state.value ?? ""}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Review frequency"
                    >
                      <SelectValue placeholder="How often?" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {FREQUENCY_OPTIONS.map((opt) => (
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
                  ? "Add Control"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
