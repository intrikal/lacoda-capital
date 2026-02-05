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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/utils"
import { mockAssets, assetClassConfig } from "@/lib/mock/data"
import type { Asset, AssetClass } from "@/lib/mock/types"
import { ContentCard, StatCard, PageHeader, Tabs } from "@/components/dashboard/content-card"
import {
  AllocationChart,
  ROIChart,
  PerformanceChart as PerformanceLineChart,
} from "@/components/dashboard/charts"

const assetIcons = {
  real_estate: Building2,
  equities: TrendingUp,
  private_equity: Briefcase,
  cash: Banknote,
  fixed_income: PiggyBank,
  crypto: Banknote,
  intellectual_property: Lightbulb,
  alternatives: Puzzle,
}

const statusConfig = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10" },
  sold: { label: "Sold", color: "text-zinc-400", bg: "bg-zinc-500/10" },
  under_review: { label: "Under Review", color: "text-blue-400", bg: "bg-blue-500/10" },
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

function AssetDetailDrawer({
  asset,
  open,
  onClose,
}: {
  asset: Asset | null
  open: boolean
  onClose: () => void
}) {
  if (!asset) return null

  const classConfig = assetClassConfig[asset.class]
  const Icon = assetIcons[asset.class]
  const status = statusConfig[asset.status]
  const change = ((asset.value - asset.previousValue) / asset.previousValue) * 100

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Current Value</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">
                {formatCurrency(asset.value)}
              </p>
              <p className={cn("text-sm mt-1", change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {change >= 0 ? "+" : ""}{change.toFixed(1)}% vs previous
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Risk Score</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{asset.riskScore}</p>
              <p className="text-sm text-zinc-500 mt-1">
                {asset.riskScore < 30 ? "Low" : asset.riskScore < 60 ? "Medium" : "High"} risk
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Status</span>
              <Badge className={cn(status.color, status.bg)}>{status.label}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Acquisition Date</span>
              <span className="text-zinc-100">{formatDate(new Date(asset.acquisitionDate))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Last Valuation</span>
              <span className="text-zinc-100">{formatDate(new Date(asset.lastValuationDate))}</span>
            </div>
            {asset.location && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Location</span>
                <span className="text-zinc-100">{asset.location}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-zinc-400 mb-2">Description</p>
            <p className="text-sm text-zinc-300">{asset.description}</p>
          </div>

          {asset.notes && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">Notes</p>
              <p className="text-sm text-zinc-300">{asset.notes}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1">Edit Asset</Button>
            <Button variant="outline" className="flex-1">View Documents</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type TabId = "all" | "real_estate" | "equities" | "private_equity" | "fixed_income"

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null)

  const filteredAssets = mockAssets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === "all" || asset.class === activeTab
    const matchesStatus = statusFilter === "all" || asset.status === statusFilter
    return matchesSearch && matchesTab && matchesStatus
  })

  const totalValue = filteredAssets.reduce((sum, a) => sum + a.value, 0)
  const activeAssets = mockAssets.filter(a => a.status === "active")
  const avgChange = mockAssets.reduce((sum, a) => {
    return sum + ((a.value - a.previousValue) / a.previousValue) * 100
  }, 0) / mockAssets.length

  const tabs = [
    { id: "all", label: "All Assets", count: mockAssets.length },
    { id: "real_estate", label: "Real Estate", count: mockAssets.filter(a => a.class === "real_estate").length },
    { id: "equities", label: "Equities", count: mockAssets.filter(a => a.class === "equities").length },
    { id: "private_equity", label: "Private Equity", count: mockAssets.filter(a => a.class === "private_equity").length },
    { id: "fixed_income", label: "Fixed Income", count: mockAssets.filter(a => a.class === "fixed_income").length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description={`${filteredAssets.length} holdings totaling ${formatCurrency(totalValue)}`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Value"
          value={formatCurrency(totalValue)}
          icon={<Briefcase className="h-4 w-4 text-tiffany-500" />}
          trend={{ value: `${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(1)}% overall`, positive: avgChange >= 0 }}
        />
        <StatCard
          label="Active Holdings"
          value={activeAssets.length}
          subtext={`${Math.round((activeAssets.length / mockAssets.length) * 100)}% of portfolio`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Real Estate"
          value={formatCurrency(mockAssets.filter(a => a.class === "real_estate").reduce((s, a) => s + a.value, 0))}
          subtext={`${mockAssets.filter(a => a.class === "real_estate").length} properties`}
          icon={<Building2 className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Avg Risk Score"
          value={(mockAssets.reduce((s, a) => s + a.riskScore, 0) / mockAssets.length).toFixed(0)}
          subtext="Moderate risk"
          icon={<PiggyBank className="h-4 w-4 text-amber-400" />}
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
      </div>

      <ContentCard noPadding>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800/60">
              <TableHead>Asset</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Risk</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.map((asset) => {
              const classConfig = assetClassConfig[asset.class]
              const Icon = assetIcons[asset.class]
              const status = statusConfig[asset.status]
              const change = ((asset.value - asset.previousValue) / asset.previousValue) * 100

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
                        {asset.location && (
                          <p className="text-xs text-zinc-500">{asset.location}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-400">{classConfig.label}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-zinc-100">
                    {formatCurrency(asset.value)}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium", change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs", status.color, status.bg)}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "text-sm font-medium",
                      asset.riskScore < 30 ? "text-emerald-400" : asset.riskScore < 60 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {asset.riskScore}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </ContentCard>

      <AssetDetailDrawer
        asset={selectedAsset}
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
    </div>
  )
}
