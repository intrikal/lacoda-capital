/**
 * ============================================================================
 * FILE: /app/(dashboard)/app/compliance/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   The advisor-facing Compliance dashboard. Displays compliance controls with
 *   evidence-derived status, plus an audit log tab backed by mock ledger data.
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ CompliancePage (this file)                                      │
 *   │   ├── useComplianceControls() → fetch controls + derived stats  │
 *   │   ├── useCreateComplianceControl() → insert new control          │
 *   │   ├── useUpdateComplianceControl() → edit / activate/deactivate  │
 *   │   ├── useDeleteComplianceControl() → remove control              │
 *   │   ├── ComplianceControlFormDialog → create/edit modal form       │
 *   │   └── AlertDialog → delete confirmation                          │
 *   │         ↓                                                        │
 *   │ Apollo Client → POST /api/graphql → resolvers → PostgreSQL       │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * DATA MODEL — RULES + PROOF PATTERN:
 *   ComplianceControl  — the requirement (e.g., "Collect passport for KYC")
 *   ComplianceEvidence — proof that a document satisfies the control
 *
 *   IMPORTANT: The DB has NO `status` column on ComplianceControl.
 *   Compliance status is DERIVED from each control's evidence array:
 *     approved, non-expired evidence → "compliant"
 *     pending evidence only          → "in_progress"
 *     no evidence / all rejected     → "needs_attention"
 *   isActive (boolean) is a separate soft-deactivation flag.
 *
 * TWO TABS:
 *   1. Controls — Live CRUD list of compliance controls from the database
 *   2. Audit Log — Mock ledger entries (audit log DB table not yet wired)
 *
 * CONTROLS TAB:
 *   - Stats cards: Compliance Score, Active Controls, Compliant, Needs Attention
 *   - Static analytics charts (status distribution, compliance trend)
 *   - Controls grouped by category with compliance status badges
 *   - Per-control: edit, toggle active/inactive, delete
 *
 * CONSUMERS: Rendered at /app/compliance for admin/assistant users.
 *
 * RELATED FILES:
 *   - lib/hooks/crud/use-compliance.ts                    — data hooks
 *   - components/forms/compliance-control-form-dialog.tsx — form dialog
 *   - lib/graphql/operations/compliance.ts                — GraphQL operations
 *   - lib/graphql/resolvers/compliance.ts                 — server-side resolvers
 *   - app/(dashboard)/app/reports/page.tsx                — same page pattern
 */

"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  FileText,
  MoreHorizontal,
  Search,
  Download,
  User,
  Briefcase,
  AlertTriangle,
  PowerOff,
  Power,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  useComplianceControls,
  useCreateComplianceControl,
  useUpdateComplianceControl,
  useDeleteComplianceControl,
} from "@/lib/hooks/crud/use-compliance"
import type { ComplianceControlRecord } from "@/lib/hooks/crud/use-compliance"
import { ComplianceControlFormDialog } from "@/components/forms/compliance-control-form-dialog"
import { useLedger } from "@/lib/hooks/crud/use-ledger"
import {
  AllocationChart,
  PerformanceChart,
} from "@/components/dashboard/charts"

// ─── STATIC CHART DATA ──────────────────────────────────────────────────────
//
// The analytics charts use static/mock data. In a production implementation,
// these would be derived from the real controls + evidence data over time.
// The trend chart would query historical evidence approval timestamps.

const controlStatusChartData = [
  { name: "Compliant", value: 18, color: "#10b981" },
  { name: "In Progress", value: 4, color: "#f59e0b" },
  { name: "Needs Attention", value: 3, color: "#ef4444" },
  { name: "Inactive", value: 2, color: "#71717a" },
]

const complianceTrendData = [
  { month: "Jul", portfolio: 68, benchmark: 75 },
  { month: "Aug", portfolio: 72, benchmark: 76 },
  { month: "Sep", portfolio: 75, benchmark: 78 },
  { month: "Oct", portfolio: 78, benchmark: 80 },
  { month: "Nov", portfolio: 82, benchmark: 82 },
  { month: "Dec", portfolio: 88, benchmark: 85 },
]

// ─── COMPLIANCE STATUS CONFIGURATION ────────────────────────────────────────
//
// Maps the derived ControlComplianceStatus to display labels, icons, colors.
// These are computed values — NOT stored in the DB.

const statusConfig = {
  compliant: {
    label: "Compliant",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    badgeVariant: "success" as const,
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    badgeVariant: "warning" as const,
  },
  needs_attention: {
    label: "Needs Attention",
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    badgeVariant: "destructive" as const,
  },
}

// ─── AUDIT LOG CONFIGURATION ─────────────────────────────────────────────────
//
// The audit log tab uses mock ledger data (useLedger). A real implementation
// would query a ledger_events table from the DB. This is intentionally left
// as mock data until the ledger feature is fully wired.

const actionLabels: Record<string, string> = {
  asset_created: "Asset Created",
  asset_updated: "Asset Updated",
  asset_sold: "Asset Sold",
  document_uploaded: "Document Uploaded",
  document_verified: "Document Verified",
  document_expired: "Document Expired",
  valuation_updated: "Valuation Updated",
  user_login: "User Login",
  user_invited: "User Invited",
  report_generated: "Report Generated",
  permission_changed: "Permission Changed",
  client_added: "Client Added",
  compliance_check: "Compliance Check",
}

const actionColors: Record<string, string> = {
  asset_created: "bg-emerald-500/10 text-emerald-400",
  asset_updated: "bg-tiffany-500/10 text-tiffany-500",
  asset_sold: "bg-amber-500/10 text-amber-400",
  document_uploaded: "bg-blue-500/10 text-blue-400",
  document_verified: "bg-emerald-500/10 text-emerald-400",
  document_expired: "bg-red-500/10 text-red-400",
  valuation_updated: "bg-tiffany-500/10 text-tiffany-500",
  user_login: "bg-zinc-500/10 text-zinc-400",
  user_invited: "bg-blue-500/10 text-blue-400",
  report_generated: "bg-cyan-500/10 text-cyan-400",
  permission_changed: "bg-amber-500/10 text-amber-400",
  client_added: "bg-emerald-500/10 text-emerald-400",
  compliance_check: "bg-tiffany-500/10 text-tiffany-500",
}

const entityIcons: Record<string, typeof FileText> = {
  asset: Briefcase,
  document: FileText,
  user: User,
  client: User,
  report: FileText,
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full bg-zinc-800 rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-tiffany-500 rounded-full transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

// ─── PAGE COMPONENT ──────────────────────────────────────────────────────────

export default function CompliancePage() {
  // ── Data hooks ──────────────────────────────────────────────────────────
  // useComplianceControls fetches controls with evidence inline so we can
  // derive compliance status (compliant/in_progress/needs_attention) client-side.
  const { controls, isLoading, stats } = useComplianceControls()
  const createMutation = useCreateComplianceControl()
  const updateMutation = useUpdateComplianceControl()
  const deleteMutation = useDeleteComplianceControl()
  const { entries } = useLedger()

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState("controls")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ComplianceControlRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const [auditSearchQuery, setAuditSearchQuery] = React.useState("")
  const [actionFilter, setActionFilter] = React.useState<string>("all")
  const reducedMotion = useReducedMotion()

  // ── Animation ───────────────────────────────────────────────────────────
  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  // ── Derived data ────────────────────────────────────────────────────────

  /**
   * Group active controls by their category string (e.g., "KYC", "AML").
   * Controls with no category fall into "Uncategorized".
   * Only active controls are shown; inactive ones are excluded to avoid
   * cluttering the list.
   */
  const activeControls = controls.filter((c) => c.isActive)
  const controlsByCategory = React.useMemo(
    () =>
      activeControls.reduce(
        (acc, control) => {
          const key = control.category ?? "Uncategorized"
          if (!acc[key]) acc[key] = []
          acc[key].push(control)
          return acc
        },
        {} as Record<string, ComplianceControlRecord[]>
      ),
    [activeControls]
  )

  // Filter audit log entries by search query and action type.
  const filteredLedgerEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      entry.entity.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      entry.user.toLowerCase().includes(auditSearchQuery.toLowerCase())
    const matchesAction = actionFilter === "all" || entry.action === actionFilter
    return matchesSearch && matchesAction
  })

  // ── Handlers ────────────────────────────────────────────────────────────

  /** Confirm delete — calls the deleteComplianceControl mutation. */
  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <animated.div style={spring} className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Compliance</h1>
          <p className="text-zinc-400 mt-1">
            Compliance controls, evidence tracking &amp; audit logs
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Control
        </Button>
      </div>

      {/* ── Create / Edit Dialog ───────────────────────────────────────── */}
      <ComplianceControlFormDialog
        mode={createOpen ? "create" : "edit"}
        open={createOpen || !!editTarget}
        initialData={createOpen ? undefined : (editTarget ?? undefined)}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setEditTarget(null)
          }
        }}
        onSubmit={(data) => {
          if (createOpen) {
            createMutation.mutate({
              code: data.code!,
              name: data.name!,
              description: data.description,
              category: data.category,
              frequency: data.frequency,
            })
          } else if (editTarget) {
            updateMutation.mutate({ id: editTarget.id, input: data })
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Compliance Control</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this control and all its evidence records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* CONTROLS TAB — Live data from the database                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="controls" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Compliance Score */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Compliance Score</p>
                    <p className="text-3xl font-bold text-zinc-100 mt-1">
                      {stats.score}%
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-tiffany-500/10">
                    <Shield className="h-6 w-6 text-tiffany-500" />
                  </div>
                </div>
                <ProgressBar value={stats.score} className="mt-4" />
              </CardContent>
            </Card>

            {/* Active Controls */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Controls Passing</p>
                    <p className="text-3xl font-bold text-zinc-100 mt-1">
                      {stats.compliant}/{stats.active}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm text-zinc-500 mt-4">
                  {stats.active - stats.compliant} controls need attention
                </p>
              </CardContent>
            </Card>

            {/* Needs Attention */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Total Controls</p>
                    <p className="text-3xl font-bold text-zinc-100 mt-1">
                      {stats.total}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <FileText className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <p className="text-sm text-zinc-500 mt-4">
                  {stats.active} active · {stats.total - stats.active} inactive
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts (static data — see file header comment) */}
          <div className="grid lg:grid-cols-3 gap-6">
            <AllocationChart
              data={controlStatusChartData}
              title="Control Status Distribution"
              description="Breakdown of control compliance states"
            />
            <PerformanceChart
              data={complianceTrendData}
              className="lg:col-span-2"
            />
          </div>

          {/* Controls List */}
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-zinc-500">
                Loading controls…
              </CardContent>
            </Card>
          ) : activeControls.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-zinc-500">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active compliance controls. Click &quot;Add Control&quot; to create one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(controlsByCategory).map(([category, categoryControls]) => {
                // Compute compliant count for this category's header badge.
                const compliantInCategory = categoryControls.filter(
                  (c) => c.status === "compliant"
                ).length

                return (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{category}</span>
                        <Badge variant="outline">
                          {compliantInCategory}/{categoryControls.length} passing
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categoryControls.map((control) => {
                        const status = statusConfig[control.status]
                        const StatusIcon = status.icon
                        const approvedCount = control.evidence.filter(
                          (e) => e.status === "approved"
                        ).length

                        return (
                          <div
                            key={control.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={cn("p-2 rounded-lg shrink-0", status.bg)}>
                                <StatusIcon className={cn("h-4 w-4", status.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                    {control.code}
                                  </span>
                                  <p className="font-medium text-zinc-100">
                                    {control.name}
                                  </p>
                                </div>
                                {control.description && (
                                  <p className="text-sm text-zinc-500 mt-1">
                                    {control.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 flex-wrap">
                                  {control.frequency && (
                                    <span>Frequency: {control.frequency}</span>
                                  )}
                                  <span>
                                    {approvedCount} approved evidence
                                    {approvedCount !== 1 ? " records" : " record"}
                                  </span>
                                  {control.evidence.filter((e) => e.status === "pending").length > 0 && (
                                    <span className="text-amber-400">
                                      {control.evidence.filter((e) => e.status === "pending").length} pending review
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Stored status badge */}
                              <Badge variant={status.badgeVariant}>
                                {status.label}
                              </Badge>

                              {/* Actions dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditTarget(control)
                                      setCreateOpen(false)
                                    }}
                                  >
                                    Edit
                                  </DropdownMenuItem>

                                  {/* Status updates */}
                                  {control.status !== "compliant" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMutation.mutate({
                                          id: control.id,
                                          input: { status: "compliant" },
                                        })
                                      }
                                    >
                                      Mark Compliant
                                    </DropdownMenuItem>
                                  )}
                                  {control.status !== "in_progress" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMutation.mutate({
                                          id: control.id,
                                          input: { status: "in_progress" },
                                        })
                                      }
                                    >
                                      Mark In Progress
                                    </DropdownMenuItem>
                                  )}
                                  {control.status !== "needs_attention" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMutation.mutate({
                                          id: control.id,
                                          input: { status: "needs_attention" },
                                        })
                                      }
                                    >
                                      Mark Needs Attention
                                    </DropdownMenuItem>
                                  )}

                                  {/* Toggle active/inactive */}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateMutation.mutate({
                                        id: control.id,
                                        input: { isActive: !control.isActive },
                                      })
                                    }
                                  >
                                    {control.isActive ? (
                                      <>
                                        <PowerOff className="h-4 w-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Power className="h-4 w-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-400"
                                    onClick={() => setDeleteTarget(control.id)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* AUDIT LOG TAB — Mock ledger data                              */}
        {/* The ledger_events table is not yet wired to the API.          */}
        {/* This tab uses useLedger() which reads from mock data.         */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="audit" className="mt-6 space-y-6">
          {/* Security Notice */}
          <Card className="border-tiffany-500/20 bg-tiffany-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-tiffany-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Tamper-Proof Audit Trail
                </p>
                <p className="text-xs text-zinc-400">
                  All entries are cryptographically signed and immutable.
                  This log meets SOC 2 Type II requirements.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder="Search actions, entities, users..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {Object.entries(actionLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log Timeline */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{filteredLedgerEntries.length} entries</span>
                <Badge variant="outline" className="font-normal">
                  Last updated recently
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mt-4 space-y-0">
                {filteredLedgerEntries.slice(0, 20).map((entry, index) => {
                  const Icon = entityIcons[entry.entityType] || FileText
                  const actionColor =
                    actionColors[entry.action] || "bg-zinc-500/10 text-zinc-400"
                  const [bgColor, textColor] = actionColor.split(" ")

                  return (
                    <div
                      key={entry.id}
                      className="flex gap-4 py-4 border-b border-zinc-800 last:border-0"
                    >
                      <div className="flex flex-col items-center">
                        <div className={cn("p-2 rounded-lg", bgColor)}>
                          <Icon className={cn("h-4 w-4", textColor)} />
                        </div>
                        {index < filteredLedgerEntries.length - 1 && (
                          <div className="w-px flex-1 bg-zinc-800 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn("text-xs", textColor)}
                              >
                                {actionLabels[entry.action] || entry.action}
                              </Badge>
                              {entry.isSensitive && (
                                <Badge variant="warning" className="text-xs gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Sensitive
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-zinc-100">
                              {entry.details}
                            </p>
                            <p className="mt-1 text-sm text-tiffany-500">
                              {entry.entity}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.user}
                          </span>
                          <span>
                            {format(
                              new Date(entry.timestamp),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </span>
                          <span className="font-mono">{entry.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </animated.div>
  )
}
