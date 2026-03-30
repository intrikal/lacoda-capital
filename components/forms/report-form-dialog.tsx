/**
 * ============================================================================
 * FILE: /components/forms/report-form-dialog.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   A modal dialog for creating and editing report metadata (name, description,
 *   report type, status). Used for both "Generate Report" (create) and
 *   "Edit Report" (update) flows.
 *
 * PATTERN:
 *   Follows the same architecture as document-form-dialog.tsx:
 *     - TanStack Form for state management + validation
 *     - Zod schema (updateReportSchema) for field validation
 *     - Radix Dialog (via shadcn/ui) for the modal container
 *     - FieldError helper for inline validation messages
 *
 * DATA FLOW:
 *   User clicks "Generate Report" or "Edit" → page opens dialog with optional
 *   pre-filled data → user fills fields → "Save" → updateReportSchema validates
 *   → onSubmit(parsedData) → parent calls create/update mutation → DB updated
 *   → GET_REPORTS refetched → list updates.
 *
 * WHY ONE DIALOG FOR BOTH CREATE AND EDIT?
 *   The form fields are identical — the only difference is:
 *     - Create: no initialData, parent calls useCreateReport().mutate
 *     - Edit: initialData provided, parent calls useUpdateReport().mutate
 *   The `mode` prop controls the dialog title and button label.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/reports/page.tsx
 *
 * RELATED FILES:
 *   - components/forms/document-form-dialog.tsx — same pattern for documents
 *   - lib/validations/report.schema.ts          — Zod validation schemas
 *   - lib/hooks/crud/use-reports.ts             — ReportRecord type
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
import { updateReportSchema } from "@/lib/validations/report.schema"
import type { UpdateReportInput } from "@/lib/validations/report.schema"
import type { ReportRecord } from "@/lib/hooks/crud/use-reports"
import { trackReportGenerated } from "@/lib/analytics/track"

// ─── TYPES ───────────────────────────────────────────────────────────────────

/** Valid report types that match the DB enum (app/db/schema/00_enums.ts). */
type ReportType = ReportRecord["reportType"]

/** Valid report statuses that match the DB enum. */
type ReportStatus = ReportRecord["status"]

/**
 * Report type labels for the dropdown.
 * Keys are the DB enum values; values are human-readable labels.
 */
const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "portfolio_summary", label: "Portfolio Summary" },
  { value: "asset_allocation", label: "Asset Allocation" },
  { value: "performance", label: "Performance" },
  { value: "tax_summary", label: "Tax Summary" },
  { value: "compliance", label: "Compliance" },
  { value: "client_statement", label: "Client Statement" },
  { value: "custom", label: "Custom" },
]

/** Report status labels for the dropdown. */
const REPORT_STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface ReportFormDialogProps {
  /** "create" shows "Generate Report" title; "edit" shows "Edit Report". */
  mode: "create" | "edit"

  /** Existing report data to pre-fill form fields (for edit mode). */
  initialData?: Partial<ReportRecord>

  /** Controls dialog visibility. */
  open: boolean

  /** Callback to open/close the dialog. Called with `false` to close. */
  onOpenChange: (open: boolean) => void

  /**
   * Callback when the form is submitted with validated data.
   * The parent component decides whether to call createMutation or updateMutation.
   */
  onSubmit: (data: UpdateReportInput & { reportType?: ReportType }) => void

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

export function ReportFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: ReportFormDialogProps) {
  const isCreate = mode === "create"

  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      reportType: (initialData?.reportType ?? "portfolio_summary") as ReportType,
      status: (initialData?.status ?? "draft") as ReportStatus,
    },
    onSubmit: async ({ value }) => {
      // Validate the form data against the Zod schema.
      // For create mode, we include reportType (needed by createReportSchema).
      // For edit mode, we use updateReportSchema (reportType is immutable).
      const payload: Record<string, unknown> = {
        name: value.name || undefined,
        description: value.description || null,
        status: value.status || undefined,
      }

      // reportType is only set during creation — it's immutable after that.
      if (isCreate) {
        payload.reportType = value.reportType
      }

      const parsed = updateReportSchema.safeParse(payload)
      if (!parsed.success) return

      // Pass reportType alongside the parsed data for create mode.
      // The parent component will include it in the CreateReportInput.
      onSubmit(
        isCreate
          ? { ...parsed.data, reportType: value.reportType }
          : parsed.data
      )
      if (isCreate) trackReportGenerated(value.reportType)
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        if (!value.name?.trim()) return "Report name is required"
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
            {isCreate ? "Generate New Report" : "Edit Report"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Create a new report from your portfolio data."
              : "Update report details."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4 py-4"
        >
          {/* Report Name (required) */}
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
                <Label htmlFor="report-name">Report Name *</Label>
                <Input
                  id="report-name"
                  placeholder="e.g., Q1 2024 Portfolio Summary"
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
                <Label htmlFor="report-description">Description</Label>
                <Input
                  id="report-description"
                  placeholder="Brief description of this report"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            {/* Report Type — only editable during creation */}
            <form.Field name="reportType">
              {(field) => (
                <div className="space-y-1">
                  <Label>Report Type {isCreate && "*"}</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as ReportType)}
                    disabled={!isCreate}
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Report type"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {REPORT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Status */}
            <form.Field name="status">
              {(field) => (
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as ReportStatus)}
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Report status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {REPORT_STATUS_OPTIONS.map((opt) => (
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
                  ? "Generating…"
                  : "Saving…"
                : isCreate
                  ? "Generate Report"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
