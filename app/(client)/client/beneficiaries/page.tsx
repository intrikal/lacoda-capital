/**
 * @file app/(client)/client/beneficiaries/page.tsx
 *
 * Client portal — Beneficiaries page.
 *
 * Data source: `useClientBeneficiaries` hook from
 * `@/lib/hooks/crud/use-client-beneficiaries`
 * The hook returns `{ beneficiaries, addBeneficiary, updateBeneficiary,
 * deleteBeneficiary, stats, isLoading }`.
 *
 * Form dialog: `BeneficiaryFormDialog` from
 * `@/components/forms/beneficiary-form-dialog` replaces the inline
 * `AddBeneficiaryDialog` component (which has been removed).
 *
 * Interactive wiring:
 *   - "Add Beneficiary" button → opens form in "create" mode.
 *   - Edit (pencil) button on `BeneficiaryCard` → opens form in "edit" mode
 *     with `editingBeneficiary` set as `initialData`.
 *   - Delete (trash) button on `BeneficiaryCard` → calls `deleteBeneficiary(id)`.
 *   - `BeneficiaryFormDialog.onSubmit` routes to `addBeneficiary` or
 *     `updateBeneficiary` depending on `formMode`.
 *   - Summary alert and section badges read from `stats.*`.
 *
 * Type mapping:
 *   The `Beneficiary` type uses `designation` ("primary" | "contingent")
 *   instead of the old mock `type` field, and `ssnLast4` instead of `ssn`.
 *   The `BeneficiaryCard` component below has been updated to match.
 *
 * Preserved as-is:
 *   - Full card layout, badge styling, alert card, info card.
 *   - Account summary section (static display config — account data is
 *     advisor-managed, not part of the beneficiaries CRUD contract).
 */

"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  User,
  Building2,
  Heart,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useClientBeneficiaries } from "@/lib/hooks/crud/use-client-beneficiaries"
import { BeneficiaryFormDialog } from "@/components/forms/beneficiary-form-dialog"
import type { Beneficiary } from "@/lib/types/mock"

// ─────────────────────────────────────────────────────────────────────────────
// Static display config (not data)
// ─────────────────────────────────────────────────────────────────────────────

/** Investment accounts shown in the account summary section */
const accounts = [
  { id: "1", name: "Brokerage Account", totalPercentage: 100, hasBeneficiaries: true },
  { id: "2", name: "Retirement IRA", totalPercentage: 100, hasBeneficiaries: true },
  { id: "3", name: "Roth IRA", totalPercentage: 0, hasBeneficiaries: false },
]

// ─────────────────────────────────────────────────────────────────────────────
// BeneficiaryCard
// ─────────────────────────────────────────────────────────────────────────────

interface BeneficiaryCardProps {
  beneficiary: Beneficiary
  onEdit: (b: Beneficiary) => void
  onDelete: (id: string) => void
}

function BeneficiaryCard({ beneficiary, onEdit, onDelete }: BeneficiaryCardProps) {
  const isPrimary = beneficiary.designation === "primary"

  return (
    <Card className={cn(!beneficiary.verified && "border-amber-500/50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-full",
              isPrimary ? "bg-tiffany-500/10" : "bg-zinc-700"
            )}>
              <User className={cn("h-5 w-5", isPrimary ? "text-tiffany-500" : "text-zinc-400")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-zinc-100">{beneficiary.name}</h3>
                {beneficiary.verified ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
              </div>
              <p className="text-sm text-zinc-400">{beneficiary.relationship}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isPrimary ? "default" : "secondary"}>
                  {isPrimary ? "Primary" : "Contingent"}
                </Badge>
                <Badge variant="outline" className="text-tiffany-500">
                  {beneficiary.percentage}%
                </Badge>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                {beneficiary.ssnLast4 && <p>SSN: ***-**-{beneficiary.ssnLast4}</p>}
                {beneficiary.dateOfBirth && (
                  <p>DOB: {new Date(beneficiary.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                )}
                <p className="mt-1">Accounts: {beneficiary.accounts.join(", ")}</p>
              </div>
              {!beneficiary.verified && (
                <div className="mt-3 flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">Verification required</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(beneficiary)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-rose-400 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Beneficiary</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {beneficiary.name} as a beneficiary?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-rose-500 hover:bg-rose-600"
                    onClick={() => onDelete(beneficiary.id)}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientBeneficiariesPage() {
  const reducedMotion = useReducedMotion()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create")
  const [editingBeneficiary, setEditingBeneficiary] = React.useState<Beneficiary | undefined>(undefined)

  // ── Hook ───────────────────────────────────────────────────────────────────
  const { beneficiaries, addBeneficiary, updateBeneficiary, deleteBeneficiary, stats } =
    useClientBeneficiaries()

  // ── Derived lists ──────────────────────────────────────────────────────────
  const primaryBeneficiaries = beneficiaries.filter((b) => b.designation === "primary")
  const contingentBeneficiaries = beneficiaries.filter((b) => b.designation === "contingent")

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleAddClick() {
    setFormMode("create")
    setEditingBeneficiary(undefined)
    setFormOpen(true)
  }

  function handleEditClick(b: Beneficiary) {
    setFormMode("edit")
    setEditingBeneficiary(b)
    setFormOpen(true)
  }

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Beneficiaries</h1>
          <p className="text-zinc-400 mt-1">
            Manage beneficiaries for your investment accounts
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Beneficiary
        </Button>
      </div>

      {/* Alert if unverified */}
      {stats.unverifiedCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div>
                <p className="font-medium text-zinc-100">
                  {stats.unverifiedCount} beneficiary{" "}
                  {stats.unverifiedCount === 1 ? "requires" : "require"} verification
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Please review and verify beneficiary information to ensure accuracy.
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  account.hasBeneficiaries ? "bg-tiffany-500/10" : "bg-amber-400/10"
                )}>
                  <Building2 className={cn(
                    "h-5 w-5",
                    account.hasBeneficiaries ? "text-tiffany-500" : "text-amber-400"
                  )} />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">{account.name}</p>
                  <p className="text-sm text-zinc-500">
                    {account.hasBeneficiaries
                      ? `${account.totalPercentage}% allocated`
                      : "No beneficiaries assigned"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Primary Beneficiaries */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-tiffany-500" />
          <h2 className="text-lg font-semibold text-zinc-100">Primary Beneficiaries</h2>
          <Badge variant="secondary">{primaryBeneficiaries.length}</Badge>
        </div>
        <div className="grid gap-4">
          {primaryBeneficiaries.map((beneficiary) => (
            <BeneficiaryCard
              key={beneficiary.id}
              beneficiary={beneficiary}
              onEdit={handleEditClick}
              onDelete={deleteBeneficiary}
            />
          ))}
        </div>
      </div>

      {/* Contingent Beneficiaries */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Contingent Beneficiaries</h2>
          <Badge variant="secondary">{contingentBeneficiaries.length}</Badge>
        </div>
        {contingentBeneficiaries.length > 0 ? (
          <div className="grid gap-4">
            {contingentBeneficiaries.map((beneficiary) => (
              <BeneficiaryCard
                key={beneficiary.id}
                beneficiary={beneficiary}
                onEdit={handleEditClick}
                onDelete={deleteBeneficiary}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No contingent beneficiaries assigned</p>
              <p className="text-sm text-zinc-500 mt-1">
                Contingent beneficiaries receive assets if primary beneficiaries are unavailable
              </p>
              <Button variant="outline" className="mt-4" onClick={handleAddClick}>
                Add Contingent Beneficiary
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-zinc-100">Important Information</p>
              <ul className="text-sm text-zinc-400 mt-2 space-y-1 list-disc list-inside">
                <li>Primary beneficiary percentages should total 100% for each account</li>
                <li>Contingent beneficiaries receive assets only if no primary beneficiaries survive</li>
                <li>Changes to beneficiaries may require notarization for certain accounts</li>
                <li>Contact your advisor for help with complex beneficiary designations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beneficiary Form Dialog */}
      <BeneficiaryFormDialog
        mode={formMode}
        initialData={editingBeneficiary}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(data) => {
          if (formMode === "create") {
            addBeneficiary(data)
          } else if (editingBeneficiary) {
            updateBeneficiary(editingBeneficiary.id, data)
          }
        }}
      />
    </animated.div>
  )
}
