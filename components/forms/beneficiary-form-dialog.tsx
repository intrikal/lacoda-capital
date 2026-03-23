/**
 * beneficiary-form-dialog.tsx
 *
 * Modal dialog for adding or editing a beneficiary designation.
 * Supports both create and edit modes via the `mode` prop.
 *
 * Fields collected:
 *   - Full legal name
 *   - Relationship to account holder
 *   - Designation type (primary / contingent)
 *   - Percentage allocation (must sum to 100 per type — validated server-side in production)
 *   - Accounts this beneficiary applies to
 *   - Optional: SSN last 4, date of birth, phone, email
 *
 * Props:
 *   mode         — "create" | "edit"
 *   initialData  — existing beneficiary data for edit mode
 *   open         — controls dialog visibility
 *   onOpenChange — parent state setter
 *   onSubmit     — called with validated form data on confirmation
 *
 * @example
 * ```tsx
 * <BeneficiaryFormDialog
 *   mode="create"
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSubmit={(data) => addBeneficiary(data)}
 * />
 * ```
 */

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
import { Checkbox } from "@/components/ui/checkbox"
import type { CreateBeneficiaryInput } from "@/lib/hooks/crud/use-client-beneficiaries"
import type { Beneficiary, BeneficiaryDesignation } from "@/lib/types/mock"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Grandchild",
  "Domestic Partner",
  "Trust",
  "Estate",
  "Charity",
  "Other",
]

/** Investment accounts available for beneficiary designation */
const AVAILABLE_ACCOUNTS = ["Brokerage Account", "Retirement IRA", "Roth IRA"]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface BeneficiaryFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<Beneficiary>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateBeneficiaryInput) => void
}

export function BeneficiaryFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
}: BeneficiaryFormDialogProps) {
  const [name, setName] = React.useState("")
  const [relationship, setRelationship] = React.useState("Spouse")
  const [designation, setDesignation] = React.useState<BeneficiaryDesignation>("primary")
  const [percentage, setPercentage] = React.useState("0")
  const [selectedAccounts, setSelectedAccounts] = React.useState<string[]>(AVAILABLE_ACCOUNTS)
  const [ssnLast4, setSsnLast4] = React.useState("")
  const [dateOfBirth, setDateOfBirth] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")

  // Populate fields when editing an existing beneficiary or when dialog re-opens
  React.useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "")
      setRelationship(initialData?.relationship ?? "Spouse")
      setDesignation(initialData?.designation ?? "primary")
      setPercentage(initialData?.percentage?.toString() ?? "0")
      setSelectedAccounts(initialData?.accounts ?? AVAILABLE_ACCOUNTS)
      setSsnLast4(initialData?.ssnLast4 ?? "")
      setDateOfBirth(initialData?.dateOfBirth ?? "")
      setPhone(initialData?.phone ?? "")
      setEmail(initialData?.email ?? "")
    }
  }, [open, initialData])

  // ── Account checkbox toggle ───────────────────────────────────────────────
  function toggleAccount(account: string) {
    setSelectedAccounts((prev) =>
      prev.includes(account) ? prev.filter((a) => a !== account) : [...prev, account]
    )
  }

  function handleSubmit() {
    if (!name.trim() || !relationship || selectedAccounts.length === 0) return
    const pct = parseFloat(percentage) || 0

    onSubmit({
      name: name.trim(),
      relationship,
      designation,
      percentage: pct,
      accounts: selectedAccounts,
      ssnLast4: ssnLast4.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Beneficiary" : "Edit Beneficiary"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a beneficiary to your investment accounts."
              : "Update this beneficiary's designation details."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Full Legal Name</Label>
            <Input
              placeholder="e.g., Emily Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>

          {/* Relationship + Designation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Designation</Label>
              <Select
                value={designation}
                onValueChange={(v) => setDesignation(v as BeneficiaryDesignation)}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="contingent">Contingent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Percentage */}
          <div className="space-y-2">
            <Label>Allocation Percentage (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="0"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
            <p className="text-xs text-zinc-500">
              Primary beneficiary percentages must total 100%.
            </p>
          </div>

          {/* Account assignment */}
          <div className="space-y-2">
            <Label>Apply to Accounts</Label>
            <div className="space-y-2 rounded-lg bg-zinc-800/40 p-3">
              {AVAILABLE_ACCOUNTS.map((account) => (
                <label
                  key={account}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedAccounts.includes(account)}
                    onCheckedChange={() => toggleAccount(account)}
                  />
                  <span className="text-sm text-zinc-300">{account}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Identity fields (optional but encouraged for verification) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SSN (Last 4)</Label>
              <Input
                placeholder="e.g., 4521"
                maxLength={4}
                value={ssnLast4}
                onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, ""))}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>

          {/* Contact (optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "Add Beneficiary" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
