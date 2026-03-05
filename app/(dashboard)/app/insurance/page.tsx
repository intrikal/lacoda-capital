"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, differenceInDays } from "date-fns"
import {
  Shield,
  Plus,
  Search,
  Home,
  Car,
  Heart,
  Umbrella,
  Briefcase,
  Users,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Download,
  Phone,
  Mail,
  Building2,
  Pencil,
  Trash2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  AllocationChart,
  PerformanceChart,
} from "@/components/dashboard/charts"
import {
  useInsurancePolicies,
  useCreateInsurancePolicy,
  useUpdateInsurancePolicy,
  useDeleteInsurancePolicy,
} from "@/lib/hooks/crud/use-insurance-policies"
import type { InsurancePolicyRecord } from "@/lib/hooks/crud/use-insurance-policies"
import { InsurancePolicyFormDialog } from "@/components/forms/insurance-policy-form-dialog"
import type {
  CreateInsurancePolicyInput,
  UpdateInsurancePolicyInput,
} from "@/lib/validations/insurance-policy.schema"

// Policy type configurations
const policyTypeConfig = {
  home: {
    label: "Homeowners",
    icon: Home,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    chartColor: "#3b82f6",
  },
  auto: {
    label: "Auto",
    icon: Car,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
    chartColor: "#14b8a6",
  },
  life: {
    label: "Life",
    icon: Heart,
    color: "text-red-400",
    bg: "bg-red-400/10",
    chartColor: "#ef4444",
  },
  umbrella: {
    label: "Umbrella",
    icon: Umbrella,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    chartColor: "#8b5cf6",
  },
  liability: {
    label: "Liability",
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    chartColor: "#f59e0b",
  },
  health: {
    label: "Health",
    icon: Users,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    chartColor: "#10b981",
  },
  business: {
    label: "Business",
    icon: Briefcase,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    chartColor: "#06b6d4",
  },
  property: {
    label: "Property",
    icon: Building2,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    chartColor: "#6366f1",
  },
}

type PolicyType = keyof typeof policyTypeConfig

const statusConfig = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  expiring: { label: "Expiring Soon", color: "text-amber-400", bg: "bg-amber-400/10" },
  expired: { label: "Expired", color: "text-red-400", bg: "bg-red-400/10" },
  pending: { label: "Pending", color: "text-blue-400", bg: "bg-blue-400/10" },
}

type PolicyStatus = keyof typeof statusConfig

/** Annualize a premium based on its frequency. */
function annualizePremium(premium: number, frequency: string): number {
  switch (frequency) {
    case "monthly":
      return premium * 12
    case "quarterly":
      return premium * 4
    default:
      return premium
  }
}

function PolicyCard({
  policy,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  policy: InsurancePolicyRecord
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: PolicyStatus) => void
}) {
  const typeConfig = policyTypeConfig[policy.policyType as PolicyType]
  const status = statusConfig[policy.status as PolicyStatus]
  const TypeIcon = typeConfig?.icon ?? Shield
  const daysUntilExpiration = differenceInDays(
    new Date(policy.expirationDate),
    new Date()
  )

  const annual = annualizePremium(policy.premium, policy.premiumFrequency)

  return (
    <Card
      className="group cursor-pointer hover:border-zinc-700 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", typeConfig?.bg)}>
              <TypeIcon className={cn("h-5 w-5", typeConfig?.color)} />
            </div>
            <div>
              <p className="font-medium text-zinc-100 truncate max-w-[200px]">
                {policy.name}
              </p>
              <p className="text-xs text-zinc-500">{policy.provider}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Policy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onStatusChange("active")}>
                Mark Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("expiring")}>
                Mark Expiring
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("expired")}>
                Mark Expired
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("pending")}>
                Mark Pending
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-zinc-500">Coverage</p>
            <p className="text-lg font-semibold text-zinc-100">
              {policy.coverageAmount > 0
                ? formatCurrency(policy.coverageAmount)
                : "See Plan"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Annual Premium</p>
            <p className="text-lg font-semibold text-tiffany-500">
              {formatCurrency(annual)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            {daysUntilExpiration > 0 ? (
              <span>
                Expires{" "}
                {format(new Date(policy.expirationDate), "MMM d, yyyy")}
              </span>
            ) : (
              <span className="text-red-400">Expired</span>
            )}
          </div>
          <Badge className={cn(status?.bg, status?.color, "border-0")}>
            {status?.label}
          </Badge>
        </div>

        {policy.status === "expiring" && daysUntilExpiration <= 30 && (
          <div className="mt-3 p-2 rounded-lg bg-amber-400/10 border border-amber-400/30">
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Expires in {daysUntilExpiration} days - Renewal required
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PolicyDetailDrawer({
  policy,
  open,
  onClose,
}: {
  policy: InsurancePolicyRecord | null
  open: boolean
  onClose: () => void
}) {
  if (!policy) return null

  const typeConfig = policyTypeConfig[policy.policyType as PolicyType]
  const status = statusConfig[policy.status as PolicyStatus]
  const TypeIcon = typeConfig?.icon ?? Shield

  const annual = annualizePremium(policy.premium, policy.premiumFrequency)

  const coveredAssets = (policy.coveredAssets ?? []) as string[]
  const beneficiaries = (policy.beneficiaries ?? []) as string[]
  const agent = policy.agent as { name: string; phone: string; email: string } | null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg", typeConfig?.bg)}>
              <TypeIcon className={cn("h-6 w-6", typeConfig?.color)} />
            </div>
            <div>
              <DialogTitle className="text-lg">{policy.name}</DialogTitle>
              <DialogDescription>
                {policy.provider} • {typeConfig?.label}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Policy Number */}
          <div className="flex items-center gap-3">
            <Badge className={cn(status?.bg, status?.color, "border-0")}>
              {status?.label}
            </Badge>
            <span className="text-sm text-zinc-400 font-mono">
              {policy.policyNumber}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-xs text-zinc-500">Coverage</p>
              <p className="text-lg font-bold text-zinc-100 mt-1">
                {policy.coverageAmount > 0
                  ? formatCurrency(policy.coverageAmount)
                  : "See Plan"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-xs text-zinc-500">Deductible</p>
              <p className="text-lg font-bold text-zinc-100 mt-1">
                {formatCurrency(policy.deductible)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-xs text-zinc-500">Premium/Year</p>
              <p className="text-lg font-bold text-tiffany-500 mt-1">
                {formatCurrency(annual)}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Effective Date</span>
              <span className="text-zinc-100">
                {format(new Date(policy.effectiveDate), "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Expiration Date</span>
              <span className="text-zinc-100">
                {format(new Date(policy.expirationDate), "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Payment</span>
              <span className="text-zinc-100 capitalize">
                {formatCurrency(policy.premium)} {policy.premiumFrequency}
              </span>
            </div>
          </div>

          {/* Covered Assets */}
          {coveredAssets.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">Covered Assets</p>
              <div className="space-y-2">
                {coveredAssets.map((asset, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 text-sm text-zinc-300"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    {asset}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Beneficiaries */}
          {beneficiaries.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">Beneficiaries</p>
              <div className="space-y-2">
                {beneficiaries.map((beneficiary, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-zinc-300"
                  >
                    <Users className="h-3 w-3 text-zinc-500" />
                    {beneficiary}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent */}
          {agent && (
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400 mb-2">Insurance Agent</p>
              <p className="font-medium text-zinc-100">{agent.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <a
                  href={`tel:${agent.phone}`}
                  className="flex items-center gap-1 text-zinc-400 hover:text-tiffany-500 transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  {agent.phone}
                </a>
                <a
                  href={`mailto:${agent.email}`}
                  className="flex items-center gap-1 text-zinc-400 hover:text-tiffany-500 transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  Email
                </a>
              </div>
            </div>
          )}

          {/* Notes */}
          {policy.notes && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">Notes</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 p-3 rounded-lg">
                {policy.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Policy
            </Button>
            <Button variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              File Claim
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function InsurancePage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [selectedPolicy, setSelectedPolicy] =
    React.useState<InsurancePolicyRecord | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] =
    React.useState<InsurancePolicyRecord | null>(null)
  const [deleteTarget, setDeleteTarget] =
    React.useState<InsurancePolicyRecord | null>(null)
  const reducedMotion = useReducedMotion()

  const { policies, isLoading, stats } = useInsurancePolicies()
  const createMutation = useCreateInsurancePolicy()
  const updateMutation = useUpdateInsurancePolicy()
  const deleteMutation = useDeleteInsurancePolicy()

  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.provider.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      typeFilter === "all" || policy.policyType === typeFilter
    return matchesSearch && matchesType
  })

  // Compute chart data from real policies
  const coverageByTypeData = React.useMemo(() => {
    const byType: Record<string, number> = {}
    for (const p of policies) {
      const cfg = policyTypeConfig[p.policyType as PolicyType]
      const label = cfg?.label ?? p.policyType
      byType[label] = (byType[label] ?? 0) + p.coverageAmount
    }
    return Object.entries(byType)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => {
        const entry = Object.entries(policyTypeConfig).find(
          ([, c]) => c.label === name
        )
        return {
          name,
          value,
          color: entry ? entry[1].chartColor : "#6b7280",
        }
      })
  }, [policies])

  function handleCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function handleEdit(policy: InsurancePolicyRecord) {
    setEditTarget(policy)
    setDialogOpen(true)
  }

  function handleFormSubmit(
    data: CreateInsurancePolicyInput | UpdateInsurancePolicyInput
  ) {
    if (editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        input: data as UpdateInsurancePolicyInput,
      })
    } else {
      createMutation.mutate(data as CreateInsurancePolicyInput)
    }
  }

  function handleStatusChange(id: string, status: PolicyStatus) {
    updateMutation.mutate({ id, input: { status } })
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
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
          <h1 className="text-2xl font-bold text-zinc-100">Insurance</h1>
          <p className="text-zinc-400 mt-1">
            Manage policies, coverage, and premium schedules
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Policy
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Policies</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">
              {isLoading ? "—" : stats.total}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {stats.active} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Coverage</p>
            <p className="text-2xl font-bold text-tiffany-500 mt-1">
              {isLoading ? "—" : formatCurrency(stats.totalCoverage)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Across all policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Annual Premiums</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">
              {isLoading ? "—" : formatCurrency(stats.totalAnnualPremium)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              ~{formatCurrency(stats.totalAnnualPremium / 12)}/month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Expiring Soon</p>
            <p
              className={cn(
                "text-2xl font-bold mt-1",
                stats.expiring > 0 ? "text-amber-400" : "text-emerald-400"
              )}
            >
              {isLoading ? "—" : stats.expiring}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Policies expiring</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts — only show when there are policies with coverage data */}
      {coverageByTypeData.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <AllocationChart
            data={coverageByTypeData}
            title="Coverage by Type"
            description="Total coverage across policy categories"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(policyTypeConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-zinc-800 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-zinc-800 rounded w-3/4" />
                      <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-12 bg-zinc-800 rounded" />
                    <div className="h-12 bg-zinc-800 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && policies.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
              No insurance policies yet
            </h3>
            <p className="text-zinc-500 mb-4">
              Add your first policy to start tracking coverage and premiums.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Policies Grid */}
      {!isLoading && filteredPolicies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onClick={() => setSelectedPolicy(policy)}
              onEdit={() => handleEdit(policy)}
              onDelete={() => setDeleteTarget(policy)}
              onStatusChange={(status) =>
                handleStatusChange(policy.id, status)
              }
            />
          ))}
        </div>
      )}

      {/* Policy Detail Drawer */}
      <PolicyDetailDrawer
        policy={selectedPolicy}
        open={!!selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
      />

      {/* Form Dialog */}
      <InsurancePolicyFormDialog
        mode={editTarget ? "edit" : "create"}
        initialData={editTarget ?? undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}
              &rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </animated.div>
  )
}
