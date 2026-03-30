"use client"

import { useEffect } from "react"
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
import { trackComplianceControlCreated } from "@/lib/analytics/track"

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "KYC", label: "KYC — Know Your Customer" },
  { value: "AML", label: "AML — Anti-Money Laundering" },
  { value: "TAX", label: "TAX — Tax Reporting" },
  { value: "REGULATORY", label: "REGULATORY — Regulatory" },
  { value: "OPERATIONAL", label: "OPERATIONAL — Operational" },
  { value: "SECURITY", label: "SECURITY — Security" },
]

const FRAMEWORK_OPTIONS = [
  { value: "SOC2", label: "SOC 2" },
  { value: "ISO27001", label: "ISO 27001" },
  { value: "PCI-DSS", label: "PCI-DSS" },
  { value: "NIST", label: "NIST" },
  { value: "GDPR", label: "GDPR" },
  { value: "CUSTOM", label: "Custom / Internal" },
]

const FREQUENCY_OPTIONS = [
  { value: "once", label: "Once (one-time only)" },
  { value: "annually", label: "Annually" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
  { value: "on_change", label: "On Change (re-verify on any update)" },
]

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface ComplianceControlFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<ComplianceControlRecord>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpdateComplianceControlInput & { code?: string }) => void
  isPending?: boolean
  orgMembers?: { id: string; name: string }[]
}

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
  orgMembers = [],
}: ComplianceControlFormDialogProps) {
  const isCreate = mode === "create"

  const form = useForm({
    defaultValues: {
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      category: initialData?.category ?? "",
      framework: initialData?.framework ?? "",
      frequency: initialData?.frequency ?? "",
      assigneeId: initialData?.assigneeId ?? "",
      dueDate: initialData?.dueDate ?? "",
    },
    onSubmit: async ({ value }) => {
      const payload: Record<string, unknown> = {
        name: value.name || undefined,
        description: value.description || null,
        category: value.category || null,
        framework: value.framework || null,
        frequency: value.frequency || null,
        assigneeId: value.assigneeId || null,
        dueDate: value.dueDate || null,
      }

      const parsed = updateComplianceControlSchema.safeParse(payload)
      if (!parsed.success) return

      onSubmit(isCreate ? { ...parsed.data, code: value.code } : parsed.data)
      if (isCreate) trackComplianceControlCreated(value.framework ?? undefined)
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

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      form.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
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
          {/* Code (required, create-only) */}
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
            {/* Framework */}
            <form.Field name="framework">
              {(field) => (
                <div className="space-y-1">
                  <Label>Framework</Label>
                  <Select
                    value={field.state.value ?? ""}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700" aria-label="Compliance framework">
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {FRAMEWORK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Category */}
            <form.Field name="category">
              {(field) => (
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select
                    value={field.state.value ?? ""}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700" aria-label="Control category">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <form.Field name="assigneeId">
              {(field) => (
                <div className="space-y-1">
                  <Label>Assignee</Label>
                  <Select
                    value={field.state.value ?? ""}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700" aria-label="Assignee">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {orgMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                      {orgMembers.length === 0 && (
                        <SelectItem value="_none" disabled>
                          No team members
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Due Date */}
            <form.Field name="dueDate">
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor="control-due-date">Due Date</Label>
                  <Input
                    id="control-due-date"
                    type="date"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Frequency */}
          <form.Field name="frequency">
            {(field) => (
              <div className="space-y-1">
                <Label>Frequency</Label>
                <Select
                  value={field.state.value ?? ""}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700" aria-label="Review frequency">
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
