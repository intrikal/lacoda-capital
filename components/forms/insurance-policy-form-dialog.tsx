/**
 * Modal dialog for creating and editing insurance policies.
 * TanStack Form + Zod validation, following the same pattern as goal-form-dialog.
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
  createInsurancePolicySchema,
  updateInsurancePolicySchema,
} from "@/lib/validations/insurance-policy.schema"
import type {
  CreateInsurancePolicyInput,
  UpdateInsurancePolicyInput,
} from "@/lib/validations/insurance-policy.schema"
import type { InsurancePolicyRecord } from "@/lib/hooks/crud/use-insurance-policies"

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const POLICY_TYPES = [
  { value: "home", label: "Homeowners" },
  { value: "auto", label: "Auto" },
  { value: "life", label: "Life" },
  { value: "umbrella", label: "Umbrella" },
  { value: "liability", label: "Liability" },
  { value: "health", label: "Health" },
  { value: "business", label: "Business" },
  { value: "property", label: "Property" },
] as const

const PREMIUM_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
] as const

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface InsurancePolicyFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<InsurancePolicyRecord>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateInsurancePolicyInput | UpdateInsurancePolicyInput) => void
  isPending?: boolean
}

// ─── FIELD ERROR HELPER ───────────────────────────────────────────────────────

function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function InsurancePolicyFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: InsurancePolicyFormDialogProps) {
  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? "",
      policyType: (initialData?.policyType ?? "home") as string,
      provider: initialData?.provider ?? "",
      policyNumber: initialData?.policyNumber ?? "",
      coverageAmount: initialData?.coverageAmount?.toString() ?? "",
      deductible: initialData?.deductible?.toString() ?? "0",
      premium: initialData?.premium?.toString() ?? "",
      premiumFrequency: (initialData?.premiumFrequency ?? "annual") as string,
      effectiveDate: initialData?.effectiveDate ?? "",
      expirationDate: initialData?.expirationDate ?? "",
      coveredAssets: initialData?.coveredAssets?.join(", ") ?? "",
      beneficiaries: initialData?.beneficiaries?.join(", ") ?? "",
      agentName: initialData?.agent?.name ?? "",
      agentPhone: initialData?.agent?.phone ?? "",
      agentEmail: initialData?.agent?.email ?? "",
      notes: initialData?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      // Build agent object only if at least one field is filled
      const hasAgent = value.agentName || value.agentPhone || value.agentEmail
      const agent = hasAgent
        ? {
            name: value.agentName.trim(),
            phone: value.agentPhone.trim(),
            email: value.agentEmail.trim(),
          }
        : null

      // Parse comma-separated lists into arrays
      const coveredAssets = value.coveredAssets
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      const beneficiaries = value.beneficiaries
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const raw = {
        name: value.name.trim() || undefined,
        policyType: value.policyType || undefined,
        provider: value.provider.trim() || undefined,
        policyNumber: value.policyNumber.trim() || undefined,
        coverageAmount: value.coverageAmount
          ? parseFloat(value.coverageAmount)
          : undefined,
        deductible: value.deductible ? parseFloat(value.deductible) : 0,
        premium: value.premium ? parseFloat(value.premium) : undefined,
        premiumFrequency: value.premiumFrequency || undefined,
        effectiveDate: value.effectiveDate || undefined,
        expirationDate: value.expirationDate || undefined,
        coveredAssets: coveredAssets.length > 0 ? coveredAssets : [],
        beneficiaries: beneficiaries.length > 0 ? beneficiaries : [],
        agent,
        notes: value.notes.trim() || null,
      }

      const schema =
        mode === "create"
          ? createInsurancePolicySchema
          : updateInsurancePolicySchema
      const parsed = schema.safeParse(raw)
      if (!parsed.success) return
      onSubmit(parsed.data as CreateInsurancePolicyInput & UpdateInsurancePolicyInput)
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        if (!value.name.trim()) return "Name is required"
        if (!value.provider.trim()) return "Provider is required"
        if (!value.policyNumber.trim()) return "Policy number is required"
        if (!value.premium || parseFloat(value.premium) < 0)
          return "Premium must be non-negative"
        if (!value.effectiveDate) return "Effective date is required"
        if (!value.expirationDate) return "Expiration date is required"
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
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Insurance Policy" : "Edit Policy"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new insurance policy to track."
              : "Update policy details."}
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
                <Label htmlFor={field.name}>Policy Name</Label>
                <Input
                  id={field.name}
                  placeholder="e.g., Manhattan Penthouse - Homeowners"
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

          {/* Policy Type + Premium Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="policyType">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Policy Type</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {POLICY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="premiumFrequency">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>Premium Frequency</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {PREMIUM_FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* Provider + Policy Number */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="provider"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() ? "Provider is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Provider</Label>
                  <Input
                    id={field.name}
                    placeholder="e.g., Chubb, AIG"
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

            <form.Field
              name="policyNumber"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() ? "Policy number is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Policy Number</Label>
                  <Input
                    id={field.name}
                    placeholder="e.g., HO-2024-001234"
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
          </div>

          {/* Coverage Amount + Deductible */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="coverageAmount">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Coverage Amount ($)</Label>
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

            <form.Field name="deductible">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Deductible ($)</Label>
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

          {/* Premium + (spacer) */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="premium">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Premium ($)</Label>
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

          {/* Effective Date + Expiration Date */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="effectiveDate"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Effective date is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Effective Date</Label>
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

            <form.Field
              name="expirationDate"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Expiration date is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Expiration Date</Label>
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
          </div>

          {/* Covered Assets */}
          <form.Field name="coveredAssets">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Covered Assets</Label>
                <Input
                  id={field.name}
                  placeholder="Comma-separated, e.g., 432 Park Ave, Tesla Model S"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          {/* Beneficiaries */}
          <form.Field name="beneficiaries">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Beneficiaries</Label>
                <Input
                  id={field.name}
                  placeholder="Comma-separated, e.g., Sarah Chen - 50%, Family Trust - 50%"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          {/* Agent Info */}
          <div className="space-y-1.5">
            <Label>Insurance Agent (optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              <form.Field name="agentName">
                {(field) => (
                  <Input
                    placeholder="Name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                )}
              </form.Field>
              <form.Field name="agentPhone">
                {(field) => (
                  <Input
                    placeholder="Phone"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                )}
              </form.Field>
              <form.Field name="agentEmail">
                {(field) => (
                  <Input
                    placeholder="Email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                )}
              </form.Field>
            </div>
          </div>

          {/* Notes */}
          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Notes</Label>
                <Input
                  id={field.name}
                  placeholder="Optional notes about this policy..."
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
                ? "Adding..."
                : "Saving..."
              : mode === "create"
              ? "Add Policy"
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
