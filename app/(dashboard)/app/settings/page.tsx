/**
 * ============================================================================
 * FILE: app/(dashboard)/app/settings/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Advisor-facing settings page with tabs for Profile, Team, Security,
 *   and Notifications preferences.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ SettingsPage                                                      │
 *   │   ├── useCurrentMember()          → current user's org membership │
 *   │   ├── useOrgMembers()             → fetches team member list      │
 *   │   ├── useInviteOrgMember()        → invites by email              │
 *   │   ├── useUpdateOrgMemberRole()    → changes a member's role       │
 *   │   ├── useRemoveOrgMember()        → removes a member              │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ orgResolvers → Drizzle ORM → PostgreSQL                           │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * CONSUMERS:
 *   This page is rendered at /app/settings for advisors/admins.
 */
"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  User,
  Users,
  Shield,
  Bell,
  Key,
  Smartphone,
  Plus,
  MoreHorizontal,
  CreditCard,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileDown,
  Trash2,
  Clock,
  ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  useOrgMembers,
  useCurrentMember,
  useInviteOrgMember,
  useUpdateOrgMemberRole,
  useRemoveOrgMember,
} from "@/lib/hooks/crud/use-org-members"
import type { OrgMemberRole, OrgMemberRecord } from "@/lib/hooks/crud/use-org-members"
import { useSubscription } from "@/lib/hooks/crud/use-subscription"
import { PLAN_LIMITS, type PlanTier } from "@/lib/stripe/plan-limits"
import { Progress } from "@/components/ui/progress"
import {
  exportOrgData,
  exportUserData,
} from "@/lib/actions/export.actions"

import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionRequestStatus,
  getRetentionSettings,
  updateRetentionSettings,
  type DeletionRequestInfo,
  type RetentionSettings,
} from "@/lib/actions/privacy.actions"

// ─── ROLE DISPLAY CONFIG ─────────────────────────────────────────────────────

const roleLabels: Record<OrgMemberRole, string> = {
  admin: "Admin",
  assistant: "Assistant",
  client: "Client",
}

const roleBadgeVariants: Record<OrgMemberRole, "primary" | "secondary" | "default"> = {
  admin: "primary",
  assistant: "secondary",
  client: "default",
}

// ─── INVITE DIALOG ───────────────────────────────────────────────────────────

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (email: string, role: OrgMemberRole) => void
  isPending: boolean
}

function InviteDialog({ open, onOpenChange, onSubmit, isPending }: InviteDialogProps) {
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<OrgMemberRole>("assistant")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    onSubmit(email.trim(), role)
    setEmail("")
    setRole("assistant")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgMemberRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Inviting..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── MEMBER ROW ──────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: OrgMemberRecord
  isCurrentUser: boolean
  onUpdateRole: (id: string, role: OrgMemberRole) => void
  onRemove: (id: string) => void
}

function MemberRow({ member, isCurrentUser, onUpdateRole, onRemove }: MemberRowProps) {
  const displayName = member.user.fullName || member.user.email

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
      <div className="flex items-center gap-3">
        <Avatar fallback={displayName} />
        <div>
          <p className="font-medium text-zinc-100">
            {displayName}
            {isCurrentUser && (
              <span className="text-xs text-zinc-500 ml-2">(you)</span>
            )}
          </p>
          <p className="text-sm text-zinc-500">{member.user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={roleBadgeVariants[member.role]}>
          {roleLabels[member.role]}
        </Badge>
        {!isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["admin", "assistant", "client"] as OrgMemberRole[])
                .filter((r) => r !== member.role)
                .map((r) => (
                  <DropdownMenuItem key={r} onClick={() => onUpdateRole(member.id, r)}>
                    Change to {roleLabels[r]}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem
                className="text-red-400"
                onClick={() => onRemove(member.id)}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

// ─── PRIVACY TAB ─────────────────────────────────────────────────────────────

function PrivacyTab({ isAdmin }: { isAdmin: boolean }) {
  const [exportLoading, setExportLoading] = React.useState<string | null>(null)
  const [deletionStatus, setDeletionStatus] = React.useState<DeletionRequestInfo | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState(false)
  const [deleteReason, setDeleteReason] = React.useState("")
  const [retention, setRetention] = React.useState<RetentionSettings>({
    archiveRetentionMonths: null,
    deletedItemRetentionMonths: null,
  })
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      getDeletionRequestStatus(),
      getRetentionSettings(),
    ]).then(([status, ret]) => {
      if (cancelled) return
      setDeletionStatus(status)
      setRetention(ret)
      setLoaded(true)
    }).catch(() => setLoaded(true))
    return () => { cancelled = true }
  }, [])

  const handleExportOrgData = async () => {
    setExportLoading("org")
    try {
      const result = await exportOrgData("both")
      // Generate download as JSON
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `lacoda-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Error handled
    } finally {
      setExportLoading(null)
    }
  }

  const handleExportMyData = async () => {
    setExportLoading("personal")
    try {
      const result = await exportUserData()
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `my-data-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Error handled
    } finally {
      setExportLoading(null)
    }
  }

  const handleRequestDeletion = async () => {
    try {
      const status = await requestAccountDeletion(deleteReason || undefined)
      setDeletionStatus(status)
      setDeleteConfirm(false)
      setDeleteReason("")
    } catch {
      // Error handled
    }
  }

  const handleCancelDeletion = async () => {
    try {
      await cancelAccountDeletion()
      setDeletionStatus(null)
    } catch {
      // Error handled
    }
  }

  const handleSaveRetention = async () => {
    try {
      await updateRetentionSettings(retention)
    } catch {
      // Error handled
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <>
      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Export</CardTitle>
          <CardDescription>
            Download your data in JSON and CSV formats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <FileDown className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-100">Export My Data</p>
                <p className="text-sm text-zinc-500">
                  Download your personal data (profile, activity log)
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMyData}
              disabled={exportLoading !== null}
            >
              {exportLoading === "personal" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileDown className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">
                    Export All Organization Data
                  </p>
                  <p className="text-sm text-zinc-500">
                    Full export: clients, assets, documents, ledger (JSON + CSV)
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportOrgData}
                disabled={exportLoading !== null}
              >
                {exportLoading === "org" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Retention (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Retention</CardTitle>
            <CardDescription>
              Configure automatic cleanup of archived and deleted items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Archive retention (months)</Label>
                <Select
                  value={String(retention.archiveRetentionMonths ?? "none")}
                  onValueChange={(v) =>
                    setRetention((r) => ({
                      ...r,
                      archiveRetentionMonths: v === "none" ? null : parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Never (keep forever)</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  Auto-delete archived items after this period
                </p>
              </div>
              <div className="space-y-2">
                <Label>Deleted item retention (months)</Label>
                <Select
                  value={String(retention.deletedItemRetentionMonths ?? "none")}
                  onValueChange={(v) =>
                    setRetention((r) => ({
                      ...r,
                      deletedItemRetentionMonths: v === "none" ? null : parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Never (keep forever)</SelectItem>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  Hard-delete soft-deleted items after this period
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveRetention} size="sm">
                Save Retention Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Deletion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-red-400">
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all personal data. This action
            has a 30-day grace period during which you can cancel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deletionStatus ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <Clock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-300">
                    Account deletion scheduled
                  </p>
                  <p className="text-sm text-amber-400/80 mt-1">
                    Your account will be permanently deleted on{" "}
                    {new Date(deletionStatus.scheduledFor).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
                    . You have {deletionStatus.daysRemaining} days to cancel.
                  </p>
                  <p className="text-sm text-amber-400/80 mt-1">
                    Export your data before this date.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleCancelDeletion}
              >
                Cancel Deletion Request
              </Button>
            </div>
          ) : !deleteConfirm ? (
            <Button
              variant="outline"
              className="text-red-400 hover:text-red-300"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300 space-y-1">
                  <p className="font-medium">This will:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-red-400/80">
                    <li>Schedule permanent deletion in 30 days</li>
                    <li>Erase all personal data (name, email, phone)</li>
                    <li>Remove you from all organizations</li>
                    <li>Cancel any active subscriptions</li>
                  </ul>
                  <p>Audit log entries will be preserved with anonymized references.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">
                  Reason for leaving (optional)
                </Label>
                <Input
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Help us improve..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-red-400"
                  onClick={handleRequestDeletion}
                >
                  Confirm — Delete My Account
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteConfirm(false)
                    setDeleteReason("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

// ─── BILLING TAB ─────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  trialing: "text-blue-400 bg-blue-500/10",
  active: "text-emerald-400 bg-emerald-500/10",
  past_due: "text-amber-400 bg-amber-500/10",
  cancelling: "text-amber-400 bg-amber-500/10",
  cancelled: "text-red-400 bg-red-500/10",
  unpaid: "text-red-400 bg-red-500/10",
  free: "text-zinc-400 bg-zinc-500/10",
}

const statusLabels: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past Due",
  cancelling: "Cancelling",
  cancelled: "Cancelled",
  unpaid: "Unpaid",
  free: "Free",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

function BillingTab({ isAdmin }: { isAdmin: boolean }) {
  const {
    overview,
    invoices,
    isLoading,
    error,
    checkout,
    openBillingPortal,
    cancel,
    resume,
  } = useSubscription()

  const [cancelConfirm, setCancelConfirm] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const sub = overview?.subscription
  const plan = (sub?.plan ?? "free") as PlanTier
  const status = sub?.status ?? "free"
  const limits = PLAN_LIMITS[plan]
  const usageStatuses = overview?.usageStatuses ?? []
  const handleAction = async (action: string, fn: () => Promise<unknown>) => {
    setActionLoading(action)
    try {
      await fn()
    } catch {
      // Error handled by hook
    } finally {
      setActionLoading(null)
      setCancelConfirm(false)
    }
  }

  return (
    <>
      {/* Current Plan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Current Plan</CardTitle>
            <CardDescription>
              Manage your subscription and billing details.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "px-3 py-1",
                statusColors[status] ?? statusColors.free
              )}
            >
              {statusLabels[status] ?? status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-zinc-800">
              <p className="text-sm text-zinc-500">Plan</p>
              <p className="text-lg font-semibold text-zinc-100">
                {limits.displayName}
              </p>
              {limits.monthlyPrice > 0 && (
                <p className="text-sm text-zinc-400">
                  {formatCurrency(limits.monthlyPrice)}/month
                </p>
              )}
            </div>
            <div className="p-4 rounded-lg border border-zinc-800">
              <p className="text-sm text-zinc-500">Billing Period</p>
              <p className="text-lg font-semibold text-zinc-100">
                {sub?.currentPeriodEnd
                  ? formatDate(sub.currentPeriodEnd)
                  : "—"}
              </p>
              <p className="text-sm text-zinc-400">
                {sub?.cancelAtPeriodEnd
                  ? "Access ends on this date"
                  : "Next invoice"}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-zinc-800">
              <p className="text-sm text-zinc-500">Trial</p>
              <p className="text-lg font-semibold text-zinc-100">
                {status === "trialing" && sub?.trialEnd
                  ? `Ends ${formatDate(sub.trialEnd)}`
                  : "—"}
              </p>
              <p className="text-sm text-zinc-400">
                {status === "trialing"
                  ? "14-day free trial"
                  : "Trial period"}
              </p>
            </div>
          </div>

          {/* Actions */}
          {isAdmin && (
            <div className="flex flex-wrap gap-3">
              {plan === "free" || status === "cancelled" ? (
                <>
                  <Button
                    onClick={() => handleAction("checkout_starter", () => checkout("starter", "monthly"))}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === "checkout_starter" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Starter — $299/mo
                  </Button>
                  <Button
                    onClick={() => handleAction("checkout_growth", () => checkout("growth", "monthly"))}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === "checkout_growth" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Growth — $599/mo
                  </Button>
                  <Button
                    onClick={() => handleAction("checkout_pro", () => checkout("professional", "monthly"))}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === "checkout_pro" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Professional — $999/mo
                  </Button>
                  <Button
                    variant="glow"
                    onClick={() => handleAction("checkout_elite", () => checkout("elite", "monthly"))}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === "checkout_elite" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Elite — $1,499/mo
                  </Button>
                </>
              ) : (
                <>
                  {plan === "starter" && status !== "cancelling" && (
                    <Button
                      variant="glow"
                      onClick={() => handleAction("upgrade_growth", () => checkout("growth", "monthly"))}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === "upgrade_growth" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Upgrade to Growth
                    </Button>
                  )}
                  {(plan === "starter" || plan === "growth") && status !== "cancelling" && (
                    <Button
                      variant="glow"
                      onClick={() => handleAction("upgrade_pro", () => checkout("professional", "monthly"))}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === "upgrade_pro" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Upgrade to Professional
                    </Button>
                  )}
                  {(plan === "starter" || plan === "growth" || plan === "professional") && status !== "cancelling" && (
                    <Button
                      variant="glow"
                      onClick={() => handleAction("upgrade_elite", () => checkout("elite", "monthly"))}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === "upgrade_elite" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Upgrade to Elite
                    </Button>
                  )}
                  {sub?.stripeCustomerId && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleAction("portal", () => openBillingPortal())
                      }
                      disabled={actionLoading !== null}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage Payment Method
                    </Button>
                  )}
                  {sub?.cancelAtPeriodEnd ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleAction("resume", () => resume())
                      }
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === "resume" && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Resume Subscription
                    </Button>
                  ) : (
                    <>
                      {!cancelConfirm ? (
                        <Button
                          variant="outline"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => setCancelConfirm(true)}
                        >
                          Cancel Subscription
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                          <span className="text-sm text-red-300">
                            Cancel at end of billing period?
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-400"
                            onClick={() =>
                              handleAction("cancel", () => cancel())
                            }
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === "cancel" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Confirm"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancelConfirm(false)}
                          >
                            Keep Plan
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Cancelling notice */}
          {sub?.cancelAtPeriodEnd && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-300">
                  Subscription cancelled
                </p>
                <p className="text-sm text-amber-400/80 mt-1">
                  You&apos;ll have access until{" "}
                  {formatDate(sub.currentPeriodEnd)}. After that, your
                  account will be downgraded to read-only. Export your data
                  before then.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      {plan !== "free" && plan !== "enterprise" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage</CardTitle>
            <CardDescription>
              Track your resource usage against plan limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageStatuses.map((us) => {
              const Icon =
                us.level === "exceeded"
                  ? XCircle
                  : us.level === "warning"
                  ? AlertTriangle
                  : CheckCircle2
              const iconColor =
                us.level === "exceeded"
                  ? "text-red-400"
                  : us.level === "warning"
                  ? "text-amber-400"
                  : "text-emerald-400"
              const barColor =
                us.level === "exceeded"
                  ? "bg-red-500"
                  : us.level === "warning"
                  ? "bg-amber-500"
                  : "bg-teal-500"

              const label =
                us.resource === "aum"
                  ? "Assets Under Management"
                  : us.resource === "team_members"
                  ? "Team Members"
                  : "Document Storage"

              const currentDisplay =
                us.resource === "aum"
                  ? `$${(us.current / 1_000_000).toFixed(1)}M`
                  : us.resource === "storage"
                  ? `${(us.current / (1024 * 1024 * 1024)).toFixed(1)} GB`
                  : `${us.current}`

              const limitDisplay =
                us.resource === "aum"
                  ? `$${(us.limit / 1_000_000).toFixed(0)}M`
                  : us.resource === "storage"
                  ? `${(us.limit / (1024 * 1024 * 1024)).toFixed(0)} GB`
                  : `${us.limit}`

              return (
                <div key={us.resource} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", iconColor)} />
                      <span className="text-sm font-medium text-zinc-200">
                        {label}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-400">
                      {currentDisplay} / {limitDisplay}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(us.ratio * 100, 100)}
                    className="h-2"
                    indicatorClassName={barColor}
                  />
                  {us.message && (
                    <p className={cn("text-xs", iconColor)}>{us.message}</p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice History</CardTitle>
            <CardDescription>
              Download receipts for your records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-zinc-800"
                >
                  <div>
                    <p className="font-medium text-zinc-100">
                      {formatCurrency(inv.amountPaid)}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatDate(inv.periodStart)} —{" "}
                      {formatDate(inv.periodEnd)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={inv.status === "paid" ? "success" : "default"}
                    >
                      {inv.status === "paid" ? "Paid" : inv.status}
                    </Badge>
                    {inv.invoicePdf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a
                          href={inv.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Download receipt"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ─── PAGE COMPONENT ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const reducedMotion = useReducedMotion()
  const { member: currentMember } = useCurrentMember()
  const { members } = useOrgMembers()
  const { mutate: inviteMember, isPending: invitePending } = useInviteOrgMember()
  const { mutate: updateRole } = useUpdateOrgMemberRole()
  const { mutate: removeMember } = useRemoveOrgMember()

  const [inviteOpen, setInviteOpen] = React.useState(false)

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const handleInvite = async (email: string, role: OrgMemberRole) => {
    await inviteMember({ email, role })
    setInviteOpen(false)
  }

  const handleUpdateRole = (id: string, role: OrgMemberRole) => {
    updateRole(id, { role })
  }

  const handleRemove = (id: string) => {
    removeMember(id)
  }

  const displayName = currentMember?.user?.fullName || ""
  const [firstName = "", lastName = ""] = displayName.split(" ")

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400 mt-1">
          Manage your account and organization settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar fallback={displayName || "User"} size="lg" />
                <div>
                  <Button variant="outline" size="sm">
                    Change Photo
                  </Button>
                  <p className="text-xs text-zinc-500 mt-1">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue={firstName} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue={lastName} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={currentMember?.user?.email ?? ""} type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={currentMember ? roleLabels[currentMember.role] : ""}
                    disabled
                    className="bg-zinc-800"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>
                Customize your experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-100">Timezone</p>
                  <p className="text-sm text-zinc-500">
                    Used for displaying dates and times
                  </p>
                </div>
                <Select defaultValue="america_new_york">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america_new_york">
                      Eastern Time (ET)
                    </SelectItem>
                    <SelectItem value="america_los_angeles">
                      Pacific Time (PT)
                    </SelectItem>
                    <SelectItem value="europe_london">
                      London (GMT)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-100">Currency Display</p>
                  <p className="text-sm text-zinc-500">
                    Primary currency for valuations
                  </p>
                </div>
                <Select defaultValue="usd">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (&euro;)</SelectItem>
                    <SelectItem value="gbp">GBP (&pound;)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>
                  Manage your organization&apos;s team and permissions.
                </CardDescription>
              </div>
              {currentMember?.role === "admin" && (
                <Button onClick={() => setInviteOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isCurrentUser={member.id === currentMember?.id}
                    onUpdateRole={handleUpdateRole}
                    onRemove={handleRemove}
                  />
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-8">
                    No team members found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Multi-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Smartphone className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">
                      Authenticator App
                    </p>
                    <p className="text-sm text-zinc-500">
                      Use an authenticator app like Google Authenticator
                    </p>
                  </div>
                </div>
                <Badge variant="success">Enabled</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Password</CardTitle>
              <CardDescription>
                Change your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" />
              </div>
              <div className="flex justify-end">
                <Button>Update Password</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions across devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800">
                      <Key className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">
                        Chrome on macOS
                      </p>
                      <p className="text-sm text-zinc-500">
                        New York, NY &middot; Current session
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Notifications</CardTitle>
              <CardDescription>
                Choose what updates you receive by email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: "Document Alerts",
                  description: "Get notified about expiring or missing documents",
                  enabled: true,
                },
                {
                  title: "Valuation Updates",
                  description: "Receive updates when asset valuations change",
                  enabled: true,
                },
                {
                  title: "Team Activity",
                  description: "Be informed about team member actions",
                  enabled: false,
                },
                {
                  title: "Weekly Summary",
                  description: "Receive a weekly digest of portfolio activity",
                  enabled: true,
                },
              ].map((notification) => (
                <div
                  key={notification.title}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-100">
                      {notification.title}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {notification.description}
                    </p>
                  </div>
                  <Button
                    variant={notification.enabled ? "default" : "outline"}
                    size="sm"
                  >
                    {notification.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <BillingTab isAdmin={currentMember?.role === "admin"} />
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <PrivacyTab isAdmin={currentMember?.role === "admin"} />
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleInvite}
        isPending={invitePending}
      />
    </animated.div>
  )
}
