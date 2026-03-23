"use client"

import * as React from "react"
import {
  Plus,
  Search,
  Filter,
  Download,
  ChevronRight,
  Building2,
  TrendingUp,
  Briefcase,
  Banknote,
  PiggyBank,
  Lightbulb,
  Puzzle,
  Loader2,
  AlertCircle,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from "@/lib/hooks/crud/use-assets"
import { useEntities } from "@/lib/hooks/crud/use-entities"
import { useValuationHistory, useAddValuation } from "@/lib/hooks/crud/use-valuations"
import { AssetFormDialog } from "@/components/forms/asset-form-dialog"
import { ValuationFormDialog } from "@/components/forms/valuation-form-dialog"
import type { CreateAssetInput } from "@/lib/validations/asset.schema"
import { ContentCard, StatCard, PageHeader, Tabs } from "@/components/dashboard/content-card"
import {
  AllocationChart,
  ROIChart,
  PerformanceChart as PerformanceLineChart,
} from "@/components/dashboard/charts"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const assetClassConfig: Record<string, { label: string; color: string }> = {
  real_estate: { label: "Real Estate", color: "#0d9488" },
  equities: { label: "Equities", color: "#0891b2" },
  private_equity: { label: "Private Equity", color: "#22d3d1" },
  cash: { label: "Cash", color: "#5eead4" },
  fixed_income: { label: "Fixed Income", color: "#06b6d4" },
  crypto: { label: "Crypto", color: "#8b5cf6" },
  intellectual_property: { label: "IP", color: "#14b8a6" },
  venture_capital: { label: "Venture Capital", color: "#f59e0b" },
  hedge_funds: { label: "Hedge Funds", color: "#ec4899" },
  commodities: { label: "Commodities", color: "#f97316" },
  collectibles: { label: "Collectibles", color: "#a855f7" },
  insurance: { label: "Insurance", color: "#10b981" },
  other: { label: "Other", color: "#6b7280" },
}

const assetIcons: Record<string, LucideIcon> = {
  real_estate: Building2,
  equities: TrendingUp,
  private_equity: Briefcase,
  cash: Banknote,
  fixed_income: PiggyBank,
  crypto: Banknote,
  intellectual_property: Lightbulb,
  venture_capital: Briefcase,
  hedge_funds: TrendingUp,
  commodities: PiggyBank,
  collectibles: Puzzle,
  insurance: PiggyBank,
  other: Puzzle,
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10" },
  sold: { label: "Sold", color: "text-zinc-400", bg: "bg-zinc-500/10" },
  transferred: { label: "Transferred", color: "text-blue-400", bg: "bg-blue-500/10" },
}

const assetAllocationData = [
  { name: "Real Estate", value: 1450000, color: "#0FBFBF" },
  { name: "Public Equities", value: 980000, color: "#06b6d4" },
  { name: "Private Equity", value: 650000, color: "#8b5cf6" },
  { name: "Fixed Income", value: 420000, color: "#f59e0b" },
  { name: "Crypto Assets", value: 185000, color: "#ec4899" },
  { name: "Cash & Equivalents", value: 310000, color: "#10b981" },
]

const assetROIData = [
  { name: "Manhattan Penthouse", roi: 28.5, invested: 850000, currentValue: 1092250 },
  { name: "Tech Growth Fund", roi: 22.3, invested: 350000, currentValue: 428050 },
  { name: "Series B - FinTech", roi: 45.2, invested: 200000, currentValue: 290400 },
  { name: "Corporate Bonds", roi: 4.8, invested: 250000, currentValue: 262000 },
  { name: "Bitcoin Holdings", roi: -12.4, invested: 150000, currentValue: 131400 },
  { name: "Miami Beach Condo", roi: 18.7, invested: 480000, currentValue: 569760 },
]

const assetPerformanceData = [
  { month: "Jan", portfolio: 0, benchmark: 0 },
  { month: "Feb", portfolio: 2.1, benchmark: 1.8 },
  { month: "Mar", portfolio: 3.8, benchmark: 2.9 },
  { month: "Apr", portfolio: 5.2, benchmark: 4.1 },
  { month: "May", portfolio: 7.5, benchmark: 5.3 },
  { month: "Jun", portfolio: 8.9, benchmark: 6.2 },
  { month: "Jul", portfolio: 11.2, benchmark: 7.8 },
  { month: "Aug", portfolio: 10.5, benchmark: 8.1 },
  { month: "Sep", portfolio: 13.4, benchmark: 9.2 },
  { month: "Oct", portfolio: 15.1, benchmark: 10.5 },
  { month: "Nov", portfolio: 17.8, benchmark: 11.9 },
  { month: "Dec", portfolio: 19.6, benchmark: 13.2 },
]

interface AssetRecord {
  id: string
  entityId: string
  name: string
  description: string | null
  assetClass: string
  status: string
  acquisitionDate: string | null
  acquisitionCost: number | null
  currency: string
  currentValue: number | null
  valuedAt: string | null
  externalId: string | null
  createdAt: string
  updatedAt: string
}

// ─── Valuation Chart ─────────────────────────────────────────────────────────

function ValuationChart({ assetId }: { assetId: string }) {
  const { valuations, isLoading } = useValuationHistory(assetId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (valuations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
        <DollarSign className="h-8 w-8 mb-2" />
        <p className="text-sm">No valuation history yet</p>
      </div>
    )
  }

  // Sort ASC for chart display
  const chartData = [...valuations]
    .sort((a, b) => new Date(a.asOfDate).getTime() - new Date(b.asOfDate).getTime())
    .map((v) => ({
      date: formatDate(new Date(v.asOfDate)),
      value: v.value,
    }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#27272a" }}
        />
        <YAxis
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#27272a" }}
          tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Value"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#14b8a6"
          strokeWidth={2}
          dot={{ fill: "#14b8a6", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Valuation Table ─────────────────────────────────────────────────────────

function ValuationTable({ assetId }: { assetId: string }) {
  const { valuations } = useValuationHistory(assetId)

  if (valuations.length === 0) return null

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/60">
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs text-right">Value</TableHead>
            <TableHead className="text-xs">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {valuations.slice(0, 5).map((v) => (
            <TableRow key={v.id} className="border-zinc-800/60">
              <TableCell className="text-xs text-zinc-300">
                {formatDate(new Date(v.asOfDate))}
              </TableCell>
              <TableCell className="text-xs text-right font-medium text-zinc-100">
                {formatCurrency(v.value)}
              </TableCell>
              <TableCell className="text-xs text-zinc-500 capitalize">
                {v.source?.replace("_", " ") ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Asset Detail Drawer ─────────────────────────────────────────────────────

function AssetDetailDrawer({
  asset,
  open,
  onClose,
  onEdit,
  onDelete,
}: {
  asset: AssetRecord | null
  open: boolean
  onClose: () => void
  onEdit: (asset: AssetRecord) => void
  onDelete: (asset: AssetRecord) => void
}) {
  const [valuationFormOpen, setValuationFormOpen] = React.useState(false)
  const addValuation = useAddValuation()
  const { refetch: refetchValuations } = useValuationHistory(asset?.id ?? null)

  if (!asset) return null

  const classConfig = assetClassConfig[asset.assetClass] ?? { label: asset.assetClass, color: "#6b7280" }
  const Icon = assetIcons[asset.assetClass] ?? Puzzle
  const status = statusConfig[asset.status] ?? { label: asset.status, color: "text-zinc-400", bg: "bg-zinc-500/10" }
  const gain = asset.currentValue && asset.acquisitionCost
    ? ((asset.currentValue - asset.acquisitionCost) / asset.acquisitionCost) * 100
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${classConfig.color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: classConfig.color }} />
              </div>
              <div>
                <DialogTitle>{asset.name}</DialogTitle>
                <DialogDescription>{classConfig.label}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Value cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-sm text-zinc-400">Current Value</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {asset.currentValue != null ? formatCurrency(asset.currentValue) : "N/A"}
                </p>
                {gain != null && (
                  <p className={cn("text-sm mt-1", gain >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {gain >= 0 ? "+" : ""}{gain.toFixed(1)}% vs cost basis
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-sm text-zinc-400">Acquisition Cost</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {asset.acquisitionCost != null ? formatCurrency(asset.acquisitionCost) : "N/A"}
                </p>
                <p className="text-sm text-zinc-500 mt-1">{asset.currency}</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Status</span>
                <Badge className={cn("text-xs", status.color, status.bg)}>{status.label}</Badge>
              </div>
              {asset.acquisitionDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Acquisition Date</span>
                  <span className="text-zinc-100">{formatDate(new Date(asset.acquisitionDate))}</span>
                </div>
              )}
              {asset.valuedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Last Valued</span>
                  <span className="text-zinc-100">{formatDate(new Date(asset.valuedAt))}</span>
                </div>
              )}
            </div>

            {asset.description && (
              <div>
                <p className="text-sm text-zinc-400 mb-2">Description</p>
                <p className="text-sm text-zinc-300">{asset.description}</p>
              </div>
            )}

            {/* Valuation History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200">Valuation History</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setValuationFormOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Valuation
                </Button>
              </div>
              <ValuationChart assetId={asset.id} />
              <ValuationTable assetId={asset.id} />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { onEdit(asset); onClose(); }}>Edit Asset</Button>
              <Button
                variant="outline"
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                onClick={() => { onDelete(asset); onClose(); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ValuationFormDialog
        assetId={asset.id}
        assetName={asset.name}
        open={valuationFormOpen}
        onOpenChange={setValuationFormOpen}
        onSubmit={(data) => {
          addValuation.mutate(data, { onSuccess: refetchValuations })
        }}
        isPending={addValuation.isPending}
      />
    </>
  )
}

// ─── Delete Dialog ───────────────────────────────────────────────────────────

function DeleteAssetDialog({
  asset,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  asset: AssetRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}) {
  if (!asset) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Delete Asset</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{asset.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sort types ──────────────────────────────────────────────────────────────

type SortField = "name" | "assetClass" | "currentValue" | "status"
type SortDir = "asc" | "desc"

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-zinc-600" />
  return sortDir === "asc"
    ? <ArrowUp className="h-3.5 w-3.5 ml-1 text-tiffany-500" />
    : <ArrowDown className="h-3.5 w-3.5 ml-1 text-tiffany-500" />
}

// ─── Page ────────────────────────────────────────────────────────────────────

type TabId = "all" | "real_estate" | "equities" | "private_equity" | "fixed_income"

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [minValue, setMinValue] = React.useState("")
  const [maxValue, setMaxValue] = React.useState("")
  const [sortField, setSortField] = React.useState<SortField>("name")
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")

  const { assets, isLoading, isError, stats, refetch } = useAssets({
    search: searchQuery || undefined,
    assetClass: activeTab !== "all" ? activeTab : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  })
  const { entities } = useEntities()
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const deleteAsset = useDeleteAsset()

  const [selectedAsset, setSelectedAsset] = React.useState<AssetRecord | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create")
  const [editingAsset, setEditingAsset] = React.useState<AssetRecord | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingAsset, setDeletingAsset] = React.useState<AssetRecord | null>(null)

  // Client-side filtering for value range
  const filteredAssets = React.useMemo(() => {
    let filtered = assets as AssetRecord[]
    const min = minValue ? parseFloat(minValue) : null
    const max = maxValue ? parseFloat(maxValue) : null
    if (min !== null) filtered = filtered.filter((a) => (a.currentValue ?? 0) >= min)
    if (max !== null) filtered = filtered.filter((a) => (a.currentValue ?? 0) <= max)
    return filtered
  }, [assets, minValue, maxValue])

  // Sort
  const sortedAssets = React.useMemo(() => {
    const sorted = [...filteredAssets]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "assetClass":
          cmp = a.assetClass.localeCompare(b.assetClass)
          break
        case "currentValue":
          cmp = (a.currentValue ?? 0) - (b.currentValue ?? 0)
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [filteredAssets, sortField, sortDir])

  const totalValue = filteredAssets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const tabs = [
    { id: "all", label: "All Assets", count: stats.total },
    { id: "real_estate", label: "Real Estate" },
    { id: "equities", label: "Equities" },
    { id: "private_equity", label: "Private Equity" },
    { id: "fixed_income", label: "Fixed Income" },
  ]

  function handleAddAsset() {
    setFormMode("create")
    setEditingAsset(undefined)
    setFormOpen(true)
  }

  function handleEditAsset(asset: AssetRecord) {
    setFormMode("edit")
    setEditingAsset(asset)
    setFormOpen(true)
  }

  function handleDeleteAsset(asset: AssetRecord) {
    setDeletingAsset(asset)
    setDeleteDialogOpen(true)
  }

  function confirmDelete() {
    if (!deletingAsset) return
    deleteAsset.mutate(deletingAsset.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        setDeletingAsset(null)
        refetch()
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-2">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <p className="text-zinc-400">Failed to load assets</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description={`${sortedAssets.length} holdings totaling ${formatCurrency(totalValue)}`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={handleAddAsset}>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon={<Briefcase className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Active Holdings"
          value={stats.active}
          subtext={`${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of portfolio`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Total Assets"
          value={stats.total}
          subtext="Across all classes"
          icon={<Building2 className="h-4 w-4 text-tiffany-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AllocationChart
          data={assetAllocationData}
          title="Asset Allocation"
          description="Portfolio distribution by asset class"
        />
        <PerformanceLineChart
          data={assetPerformanceData}
          className="lg:col-span-2"
        />
      </div>

      <ROIChart data={assetROIData} />

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800/60"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-zinc-900/50 border-zinc-800/60">
            <Filter className="h-4 w-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min $"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            className="w-24 bg-zinc-900/50 border-zinc-800/60 text-sm"
          />
          <span className="text-zinc-500 text-sm">–</span>
          <Input
            type="number"
            placeholder="Max $"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            className="w-24 bg-zinc-900/50 border-zinc-800/60 text-sm"
          />
        </div>
      </div>

      <ContentCard noPadding>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800/60">
              <TableHead>
                <button
                  className="flex items-center text-xs font-medium"
                  onClick={() => toggleSort("name")}
                >
                  Asset
                  <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center text-xs font-medium"
                  onClick={() => toggleSort("assetClass")}
                >
                  Class
                  <SortIcon field="assetClass" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  className="flex items-center text-xs font-medium ml-auto"
                  onClick={() => toggleSort("currentValue")}
                >
                  Value
                  <SortIcon field="currentValue" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center text-xs font-medium"
                  onClick={() => toggleSort("status")}
                >
                  Status
                  <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-500 py-12">
                  {searchQuery || statusFilter !== "all" || activeTab !== "all" || minValue || maxValue
                    ? "No assets match your filters"
                    : "No assets found. Add your first asset to get started."}
                </TableCell>
              </TableRow>
            ) : (
              sortedAssets.map((asset) => {
                const classConfig = assetClassConfig[asset.assetClass] ?? { label: asset.assetClass, color: "#6b7280" }
                const Icon = assetIcons[asset.assetClass] ?? Puzzle
                const status = statusConfig[asset.status] ?? { label: asset.status, color: "text-zinc-400", bg: "bg-zinc-500/10" }

                return (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer border-zinc-800/60 hover:bg-zinc-800/30"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${classConfig.color}20` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: classConfig.color }} />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{asset.name}</p>
                          {asset.description && (
                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{asset.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-zinc-400">{classConfig.label}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-zinc-100">
                      {asset.currentValue != null ? formatCurrency(asset.currentValue) : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", status.color, status.bg)}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </ContentCard>

      <AssetDetailDrawer
        asset={selectedAsset}
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onEdit={handleEditAsset}
        onDelete={handleDeleteAsset}
      />

      <AssetFormDialog
        mode={formMode}
        initialData={editingAsset}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(data: CreateAssetInput) => {
          if (formMode === "create") {
            createAsset.mutate(data, { onSuccess: refetch })
          } else if (editingAsset) {
            const { entityId: _entityId, ...input } = data
            updateAsset.mutate({ id: editingAsset.id, input }, { onSuccess: refetch })
          }
        }}
        isPending={createAsset.isPending || updateAsset.isPending}
        entities={entities.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name }))}
      />

      <DeleteAssetDialog
        asset={deletingAsset}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        isPending={deleteAsset.isPending}
      />
    </div>
  )
}
