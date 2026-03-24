"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, isPast, parseISO } from "date-fns"
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
  CalendarClock,
  Link2,
  Trash2,
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
  useCreateComplianceEvidence,
  useDeleteComplianceEvidence,
  useOrgMembers,
} from "@/lib/hooks/crud/use-compliance"
import type { ComplianceControlRecord } from "@/lib/hooks/crud/use-compliance"
import { ComplianceControlFormDialog } from "@/components/forms/compliance-control-form-dialog"
import { useLedger } from "@/lib/hooks/crud/use-ledger"

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const statusConfig = {
  not_started: {
    label: "Not Started",
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    badgeVariant: "destructive" as const,
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    badgeVariant: "warning" as const,
  },
  implemented: {
    label: "Implemented",
    icon: CheckCircle2,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    badgeVariant: "outline" as const,
  },
  verified: {
    label: "Verified",
    icon: Shield,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    badgeVariant: "success" as const,
  },
}

// ─── AUDIT LOG CONFIG ─────────────────────────────────────────────────────────

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

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────

function ProgressBar({ value, className }: { value: number; className?: string }) {
  const barColor =
    value === 100
      ? "bg-emerald-500"
      : value >= 60
        ? "bg-tiffany-500"
        : value >= 30
          ? "bg-amber-500"
          : "bg-red-500"

  return (
    <div className={cn("h-2 w-full bg-zinc-800 rounded-full overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all", barColor)}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

// ─── EVIDENCE UPLOAD DIALOG ──────────────────────────────────────────────────

function EvidenceUploadDialog({
  open,
  onOpenChange,
  controlId,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  controlId: string
  onSubmit: (data: { controlId: string; documentId: string }) => void
  isPending: boolean
}) {
  const [documentId, setDocumentId] = React.useState("")

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle>Link Evidence Document</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the document ID from the vault to link as evidence for this control.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            placeholder="Document ID (UUID)"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 font-mono text-sm"
          />
          <p className="text-xs text-zinc-500 mt-2">
            Go to the Document Vault to find the document ID, then paste it here.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!documentId.trim() || isPending}
            onClick={() => {
              onSubmit({ controlId, documentId: documentId.trim() })
              setDocumentId("")
            }}
          >
            {isPending ? "Linking…" : "Link Evidence"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── PAGE COMPONENT ──────────────────────────────────────────────────────────

export default function CompliancePage() {
  // ── Data hooks ──────────────────────────────────────────────────────────
  const { controls, isLoading, stats, refetch } = useComplianceControls()
  const createMutation = useCreateComplianceControl()
  const updateMutation = useUpdateComplianceControl()
  const deleteMutation = useDeleteComplianceControl()
  const evidenceCreateMutation = useCreateComplianceEvidence()
  const evidenceDeleteMutation = useDeleteComplianceEvidence()
  const { members: orgMembers } = useOrgMembers()
  const { entries } = useLedger()

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState("controls")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ComplianceControlRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const [evidenceTarget, setEvidenceTarget] = React.useState<string | null>(null)
  const [frameworkFilter, setFrameworkFilter] = React.useState<string>("all")
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

  const activeControls = controls.filter((c) => c.isActive)

  // Get unique frameworks
  const frameworks = React.useMemo(() => {
    const set = new Set<string>()
    for (const c of activeControls) {
      if (c.framework) set.add(c.framework)
    }
    return Array.from(set).sort()
  }, [activeControls])

  // Filter by framework
  const filteredControls = React.useMemo(
    () =>
      frameworkFilter === "all"
        ? activeControls
        : activeControls.filter((c) => c.framework === frameworkFilter),
    [activeControls, frameworkFilter]
  )

  // Group by framework for progress bars
  const frameworkProgress = React.useMemo(() => {
    const map: Record<string, { total: number; verified: number }> = {}
    for (const c of activeControls) {
      const fw = c.framework ?? "Uncategorized"
      if (!map[fw]) map[fw] = { total: 0, verified: 0 }
      map[fw].total++
      if (c.status === "verified") map[fw].verified++
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [activeControls])

  // Group filtered controls by category
  const controlsByCategory = React.useMemo(
    () =>
      filteredControls.reduce(
        (acc, control) => {
          const key = control.category ?? "Uncategorized"
          if (!acc[key]) acc[key] = []
          acc[key].push(control)
          return acc
        },
        {} as Record<string, ComplianceControlRecord[]>
      ),
    [filteredControls]
  )

  // Filter audit log
  const filteredLedgerEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      entry.entity.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      entry.user.toLowerCase().includes(auditSearchQuery.toLowerCase())
    const matchesAction = actionFilter === "all" || entry.action === actionFilter
    return matchesSearch && matchesAction
  })

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        setDeleteTarget(null)
        refetch()
      },
    })
  }

  function handleEvidenceSubmit(data: { controlId: string; documentId: string }) {
    evidenceCreateMutation.mutate(
      { controlId: data.controlId, documentId: data.documentId, status: "pending" },
      {
        onSuccess: () => {
          setEvidenceTarget(null)
          refetch()
        },
      }
    )
  }

  function handleEvidenceDelete(evidenceId: string) {
    evidenceDeleteMutation.mutate(evidenceId, {
      onSuccess: () => refetch(),
    })
  }

  function isOverdue(control: ComplianceControlRecord): boolean {
    return !!(control.dueDate && isPast(parseISO(control.dueDate)) && control.status !== "verified")
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
            createMutation.mutate(
              {
                code: data.code!,
                name: data.name!,
                description: data.description,
                category: data.category,
                framework: data.framework,
                frequency: data.frequency,
                assigneeId: data.assigneeId,
                dueDate: data.dueDate,
              },
              { onSuccess: () => refetch() }
            )
          } else if (editTarget) {
            updateMutation.mutate(
              { id: editTarget.id, input: data },
              { onSuccess: () => refetch() }
            )
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
        orgMembers={orgMembers}
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

      {/* ── Evidence Upload Dialog ─────────────────────────────────────── */}
      <EvidenceUploadDialog
        open={!!evidenceTarget}
        onOpenChange={(o) => { if (!o) setEvidenceTarget(null) }}
        controlId={evidenceTarget ?? ""}
        onSubmit={handleEvidenceSubmit}
        isPending={evidenceCreateMutation.isPending}
      />

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* ═══════════ CONTROLS TAB ═══════════════════════════════════════ */}
        <TabsContent value="controls" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Verified</p>
                    <p className="text-3xl font-bold text-zinc-100 mt-1">
                      {stats.verified}/{stats.active}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm text-zinc-500 mt-4">
                  {stats.active - stats.verified} controls remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Overdue</p>
                    <p className={cn(
                      "text-3xl font-bold mt-1",
                      stats.overdue > 0 ? "text-red-400" : "text-zinc-100"
                    )}>
                      {stats.overdue}
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-full",
                    stats.overdue > 0 ? "bg-red-500/10" : "bg-zinc-800"
                  )}>
                    <CalendarClock className={cn(
                      "h-6 w-6",
                      stats.overdue > 0 ? "text-red-400" : "text-zinc-500"
                    )} />
                  </div>
                </div>
                <p className="text-sm text-zinc-500 mt-4">
                  Past due date
                </p>
              </CardContent>
            </Card>

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

          {/* Framework Progress Bars */}
          {frameworkProgress.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Framework Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {frameworkProgress.map(([framework, data]) => {
                  const pct = data.total > 0 ? Math.round((data.verified / data.total) * 100) : 0
                  return (
                    <div key={framework}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-zinc-200">{framework}</span>
                        <span className="text-xs text-zinc-400">
                          {data.verified}/{data.total} verified ({pct}%)
                        </span>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Framework Filter */}
          <div className="flex items-center gap-3">
            <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Frameworks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frameworks</SelectItem>
                {frameworks.map((fw) => (
                  <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-zinc-500">
              {filteredControls.length} control{filteredControls.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Controls List */}
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-zinc-500">
                Loading controls…
              </CardContent>
            </Card>
          ) : filteredControls.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-zinc-500">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  {frameworkFilter !== "all"
                    ? `No controls for ${frameworkFilter}. Add your first control.`
                    : "No active compliance controls. Click \"Add Control\" to create one."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(controlsByCategory).map(([category, categoryControls]) => {
                const verifiedInCategory = categoryControls.filter(
                  (c) => c.status === "verified"
                ).length

                return (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{category}</span>
                        <Badge variant="outline">
                          {verifiedInCategory}/{categoryControls.length} verified
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categoryControls.map((control) => {
                        const status = statusConfig[control.status]
                        const StatusIcon = status.icon
                        const overdue = isOverdue(control)

                        return (
                          <div
                            key={control.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-colors",
                              overdue
                                ? "border-red-500/50 bg-red-500/5"
                                : "border-zinc-800 hover:border-zinc-700"
                            )}
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
                                  {control.framework && (
                                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded">
                                      {control.framework}
                                    </span>
                                  )}
                                  {control.assigneeName ? (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {control.assigneeName}
                                    </span>
                                  ) : (
                                    overdue && (
                                      <span className="text-red-400 font-medium">Unassigned</span>
                                    )
                                  )}
                                  {control.dueDate && (
                                    <span className={cn(
                                      "flex items-center gap-1",
                                      overdue ? "text-red-400 font-medium" : ""
                                    )}>
                                      <CalendarClock className="h-3 w-3" />
                                      {overdue ? "Overdue: " : "Due: "}
                                      {format(parseISO(control.dueDate), "MMM d, yyyy")}
                                    </span>
                                  )}
                                  {control.frequency && (
                                    <span>Frequency: {control.frequency}</span>
                                  )}
                                  <span>
                                    {control.evidence.length} evidence record{control.evidence.length !== 1 ? "s" : ""}
                                  </span>
                                </div>

                                {/* Evidence list */}
                                {control.evidence.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {control.evidence.map((ev) => (
                                      <div key={ev.id} className="flex items-center gap-2 text-xs">
                                        <Link2 className="h-3 w-3 text-zinc-500" />
                                        <span className="text-zinc-400 font-mono truncate">
                                          {ev.documentId ? ev.documentId.slice(0, 8) + "…" : "No document"}
                                        </span>
                                        <Badge
                                          variant={
                                            ev.status === "approved" ? "success" :
                                            ev.status === "rejected" ? "destructive" :
                                            "outline"
                                          }
                                          className="text-[10px] px-1 py-0"
                                        >
                                          {ev.status}
                                        </Badge>
                                        <button
                                          onClick={() => handleEvidenceDelete(ev.id)}
                                          className="text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                                          title="Remove evidence"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
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

                                  <DropdownMenuItem
                                    onClick={() => setEvidenceTarget(control.id)}
                                  >
                                    <Link2 className="h-4 w-4 mr-2" />
                                    Link Evidence
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {/* Status updates */}
                                  {control.status !== "verified" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMutation.mutate(
                                          { id: control.id, input: { status: "verified" } },
                                          { onSuccess: () => refetch() }
                                        )
                                      }
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      Mark Verified
                                    </DropdownMenuItem>
                                  )}
                                  {control.status !== "implemented" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMutation.mutate(
                                          { id: control.id, input: { status: "implemented" } },
                                          { onSuccess: () => refetch() }
                                        )
                                      }
                                    >
                                      Mark Implemented
                                    </DropdownMenuItem>
                                  )}
                                  {control.status !== "in_progress" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMutation.mutate(
                                          { id: control.id, input: { status: "in_progress" } },
                                          { onSuccess: () => refetch() }
                                        )
                                      }
                                    >
                                      Mark In Progress
                                    </DropdownMenuItem>
                                  )}
                                  {control.status !== "not_started" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMutation.mutate(
                                          { id: control.id, input: { status: "not_started" } },
                                          { onSuccess: () => refetch() }
                                        )
                                      }
                                    >
                                      Mark Not Started
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateMutation.mutate(
                                        { id: control.id, input: { isActive: !control.isActive } },
                                        { onSuccess: () => refetch() }
                                      )
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

        {/* ═══════════ AUDIT LOG TAB ════════════════════════════════════════ */}
        <TabsContent value="audit" className="mt-6 space-y-6">
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
