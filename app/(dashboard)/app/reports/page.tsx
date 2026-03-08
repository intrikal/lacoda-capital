/**
 * ============================================================================
 * FILE: /app/(dashboard)/app/reports/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   The advisor-facing Reports dashboard. Displays a list of generated reports
 *   with CRUD operations (create, edit, delete) backed by the GraphQL API,
 *   plus a static Benchmarks tab for portfolio comparison analytics.
 *
 * ARCHITECTURE:
 *   This page follows the same pattern as the Document Vault page:
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ ReportsPage (this file)                                         │
 *   │   ├── useReports()       → fetch report list from DB            │
 *   │   ├── useCreateReport()  → insert new report                    │
 *   │   ├── useUpdateReport()  → edit report metadata/status          │
 *   │   ├── useDeleteReport()  → remove report (admin only)           │
 *   │   ├── ReportFormDialog   → create/edit modal form               │
 *   │   └── AlertDialog        → delete confirmation                  │
 *   │         ↓                                                       │
 *   │ Apollo Client → POST /api/graphql → resolvers → PostgreSQL      │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * TWO TABS:
 *   1. Reports — CRUD list of reports from the database
 *   2. Benchmarks — Static portfolio comparison charts (mock data, not yet wired)
 *
 * DB ENUMS (app/db/schema/00_enums.ts):
 *   reportType: portfolio_summary | asset_allocation | performance |
 *               tax_summary | compliance | client_statement | custom
 *   status:     draft | published | archived
 *
 * CONSUMERS: Rendered at /app/reports for admin/assistant users.
 *
 * RELATED FILES:
 *   - lib/hooks/crud/use-reports.ts              — data hooks
 *   - components/forms/report-form-dialog.tsx     — form dialog
 *   - lib/graphql/operations/report.ts            — GraphQL operations
 *   - lib/graphql/resolvers/report.ts             — server-side resolvers
 *   - app/(dashboard)/app/vault/page.tsx          — same pattern for documents
 */

"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  Archive,
  MoreHorizontal,
  Calendar,
  BarChart3,
  Shield,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Target,
  Zap,
  PieChart,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  useReports,
  useCreateReport,
  useUpdateReport,
  useDeleteReport,
} from "@/lib/hooks/crud/use-reports"
import type { ReportRecord } from "@/lib/hooks/crud/use-reports"
import { ReportFormDialog } from "@/components/forms/report-form-dialog"
import {
  AllocationChart,
  PerformanceChart,
  InvestmentReturnsChart,
  ROIChart,
} from "@/components/dashboard/charts"

// ─── REPORT TYPE CONFIGURATION ──────────────────────────────────────────────
//
// Maps DB enum values to display labels, icons, and colors.
// Used for the "Quick Generate" cards and the report list.

const reportTypeConfig = {
  portfolio_summary: {
    label: "Portfolio Summary",
    icon: BarChart3,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
  },
  asset_allocation: {
    label: "Asset Allocation",
    icon: PieChart,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  performance: {
    label: "Performance",
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  tax_summary: {
    label: "Tax Summary",
    icon: Receipt,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  compliance: {
    label: "Compliance",
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  client_statement: {
    label: "Client Statement",
    icon: Users,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  custom: {
    label: "Custom",
    icon: FileSpreadsheet,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
}

// ─── STATUS CONFIGURATION ───────────────────────────────────────────────────
//
// Maps DB status enum to display labels and icons.

const statusConfig = {
  draft: {
    label: "Draft",
    icon: Clock,
    color: "text-amber-400",
  },
  published: {
    label: "Published",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    color: "text-zinc-500",
  },
}

// ─── BENCHMARK DATA (STATIC) ───────────────────────────────────────────────
//
// The Benchmarks tab uses static/mock data for portfolio comparison charts.
// This is intentionally not wired to the DB — benchmark data would come
// from an external market data provider in a production implementation.

const reportsByTypeData = [
  { name: "Portfolio", value: 24, color: "#14b8a6" },
  { name: "Performance", value: 18, color: "#10b981" },
  { name: "Compliance", value: 12, color: "#3b82f6" },
  { name: "Tax", value: 8, color: "#f59e0b" },
  { name: "Custom", value: 6, color: "#8b5cf6" },
]

const reportActivityData = [
  { month: "Jul", portfolio: 4, benchmark: 3 },
  { month: "Aug", portfolio: 6, benchmark: 4 },
  { month: "Sep", portfolio: 5, benchmark: 4 },
  { month: "Oct", portfolio: 8, benchmark: 5 },
  { month: "Nov", portfolio: 12, benchmark: 7 },
  { month: "Dec", portfolio: 15, benchmark: 8 },
]

const quarterlyReportData = [
  { period: "Q1 2023", return: 12 },
  { period: "Q2 2023", return: 15 },
  { period: "Q3 2023", return: 18 },
  { period: "Q4 2023", return: 14 },
  { period: "Q1 2024", return: 22 },
]

const portfolioVsBenchmarkData = [
  { month: "Jan", portfolio: 0, benchmark: 0 },
  { month: "Feb", portfolio: 2.4, benchmark: 1.8 },
  { month: "Mar", portfolio: 4.1, benchmark: 2.9 },
  { month: "Apr", portfolio: 5.8, benchmark: 4.2 },
  { month: "May", portfolio: 8.2, benchmark: 5.6 },
  { month: "Jun", portfolio: 10.1, benchmark: 7.1 },
  { month: "Jul", portfolio: 12.5, benchmark: 8.8 },
  { month: "Aug", portfolio: 11.8, benchmark: 8.2 },
  { month: "Sep", portfolio: 14.2, benchmark: 9.5 },
  { month: "Oct", portfolio: 16.1, benchmark: 10.8 },
  { month: "Nov", portfolio: 18.4, benchmark: 12.1 },
  { month: "Dec", portfolio: 19.6, benchmark: 13.2 },
]

const assetClassPerformance = [
  { name: "Real Estate", roi: 24.5, invested: 1200000, currentValue: 1494000 },
  { name: "S&P 500 ETF", roi: 13.2, invested: 500000, currentValue: 566000 },
  { name: "Private Equity", roi: 32.8, invested: 500000, currentValue: 664000 },
  { name: "NASDAQ ETF", roi: 24.2, invested: 350000, currentValue: 434700 },
  { name: "Int'l Developed", roi: 8.5, invested: 250000, currentValue: 271250 },
  { name: "Emerging Markets", roi: -2.4, invested: 150000, currentValue: 146400 },
]

const portfolioSectorAllocation = [
  { name: "Technology", value: 28, color: "#14b8a6" },
  { name: "Real Estate", value: 24, color: "#06b6d4" },
  { name: "Healthcare", value: 15, color: "#8b5cf6" },
  { name: "Financial", value: 12, color: "#f59e0b" },
  { name: "Consumer", value: 10, color: "#10b981" },
  { name: "Other", value: 11, color: "#ec4899" },
]

const sp500SectorAllocation = [
  { name: "Technology", value: 32, color: "#14b8a6" },
  { name: "Healthcare", value: 13, color: "#8b5cf6" },
  { name: "Financial", value: 12, color: "#f59e0b" },
  { name: "Consumer Disc.", value: 11, color: "#10b981" },
  { name: "Communication", value: 9, color: "#06b6d4" },
  { name: "Other", value: 23, color: "#ec4899" },
]

const benchmarkMetrics = [
  { name: "S&P 500", ytdReturn: 13.2, portfolioYtd: 19.6, alpha: 6.4, beta: 0.85, sharpe: 1.42 },
  { name: "NASDAQ", ytdReturn: 24.2, portfolioYtd: 19.6, alpha: -4.6, beta: 0.72, sharpe: 1.38 },
  { name: "Russell 2000", ytdReturn: 8.5, portfolioYtd: 19.6, alpha: 11.1, beta: 0.65, sharpe: 1.52 },
  { name: "MSCI EAFE", ytdReturn: 6.2, portfolioYtd: 19.6, alpha: 13.4, beta: 0.58, sharpe: 1.65 },
]

// ─── PAGE COMPONENT ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  // ── Data hooks ──────────────────────────────────────────────────────────
  // These hooks connect to the GraphQL API via Apollo Client.
  // See lib/hooks/crud/use-reports.ts for implementation details.
  const { reports, isLoading, stats } = useReports()
  const createMutation = useCreateReport()
  const updateMutation = useUpdateReport()
  const deleteMutation = useDeleteReport()

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState("reports")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ReportRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const reducedMotion = useReducedMotion()

  // ── Animation ───────────────────────────────────────────────────────────
  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  // ── Handlers ────────────────────────────────────────────────────────────

  /**
   * Quick Generate — creates a report with just the type pre-selected.
   * Opens the create dialog with the reportType pre-filled.
   */
  function handleQuickGenerate(reportType: ReportRecord["reportType"]) {
    setEditTarget({ reportType } as ReportRecord)
    setCreateOpen(true)
  }

  /** Confirm delete — calls the deleteReport mutation. */
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
          <h1 className="text-2xl font-bold text-zinc-100">Reports</h1>
          <p className="text-zinc-400 mt-1">
            Generate reports and analyze portfolio benchmarks
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* ── Create / Edit Dialog ───────────────────────────────────────── */}
      <ReportFormDialog
        mode={createOpen ? "create" : "edit"}
        open={createOpen || !!editTarget}
        initialData={
          createOpen
            ? (editTarget ? { reportType: editTarget.reportType } : undefined)
            : (editTarget ?? undefined)
        }
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setEditTarget(null)
          }
        }}
        onSubmit={(data) => {
          if (createOpen) {
            // Create mode: call createReport mutation
            createMutation.mutate({
              name: data.name!,
              reportType: (data as { reportType?: string }).reportType as ReportRecord["reportType"] ?? "custom",
              description: data.description,
              parameters: data.parameters,
            })
          } else if (editTarget) {
            // Edit mode: call updateReport mutation
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
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this report and all its versions.
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
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* REPORTS TAB — Live data from the database                     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="reports" className="mt-6 space-y-6">
          {/* Quick Generate Cards */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Quick Generate
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(reportTypeConfig)
                .slice(0, 4)
                .map(([key, cfg]) => {
                  const Icon = cfg.icon
                  return (
                <Card
                  key={key}
                  className="cursor-pointer hover:border-zinc-700 transition-colors group"
                  onClick={() => handleQuickGenerate(key as ReportRecord["reportType"])}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", cfg.bg)}>
                      <Icon className={cn("h-5 w-5", cfg.color)} />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">{cfg.label}</p>
                      <p className="text-xs text-zinc-500">Generate now</p>
                    </div>
                  </CardContent>
                </Card>
                  )
              })}
            </div>
          </div>

          {/* Report Analytics Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <AllocationChart
              data={reportsByTypeData}
              title="Reports by Type"
              description="Distribution of generated reports"
            />
            <PerformanceChart
              data={reportActivityData}
              className="lg:col-span-2"
            />
          </div>

          {/* Quarterly Performance + Stats */}
          <div className="grid lg:grid-cols-2 gap-6">
            <InvestmentReturnsChart data={quarterlyReportData} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <p className="text-sm text-zinc-400">Total Reports</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">
                      {stats.total}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <p className="text-sm text-zinc-400">Published</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {stats.published}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <p className="text-sm text-zinc-400">Drafts</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">
                      {stats.draft}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50">
                    <p className="text-sm text-zinc-400">Archived</p>
                    <p className="text-2xl font-bold text-zinc-500 mt-1">
                      {stats.archived}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reports List */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Recent Reports
            </h2>

            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center text-zinc-500">
                  Loading reports…
                </CardContent>
              </Card>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-zinc-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No reports yet. Click &quot;Generate Report&quot; to create one.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => {
                  const typeConfig = reportTypeConfig[report.reportType]
                  const status = statusConfig[report.status]

                  return (
                    <Card key={report.id} className="hover:border-zinc-700 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                              <typeConfig.icon
                                className={cn("h-5 w-5", typeConfig.color)}
                              />
                            </div>
                            <div>
                              <p className="font-medium text-zinc-100">
                                {report.name}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {typeConfig.label}
                                </span>
                                <span>
                                  Created{" "}
                                  {format(new Date(report.createdAt), "MMM d, yyyy")}
                                </span>
                                {report.description && (
                                  <span className="truncate max-w-[200px]">
                                    {report.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Status badge */}
                            <div className="flex items-center gap-1.5">
                              <status.icon
                                className={cn("h-4 w-4", status.color)}
                              />
                              <span className={cn("text-sm", status.color)}>
                                {status.label}
                              </span>
                            </div>

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
                                    setEditTarget(report)
                                    setCreateOpen(false)
                                  }}
                                >
                                  Edit
                                </DropdownMenuItem>
                                {report.status === "draft" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateMutation.mutate({
                                        id: report.id,
                                        input: { status: "published" },
                                      })
                                    }
                                  >
                                    Publish
                                  </DropdownMenuItem>
                                )}
                                {report.status === "published" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateMutation.mutate({
                                        id: report.id,
                                        input: { status: "archived" },
                                      })
                                    }
                                  >
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-red-400"
                                  onClick={() => setDeleteTarget(report.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* BENCHMARKS TAB — Static portfolio comparison data             */}
        {/* This tab uses hardcoded data for portfolio vs. index charts.  */}
        {/* In production, this would pull from a market data API.        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="benchmarks" className="mt-6 space-y-6">
          {/* Benchmark Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Portfolio YTD</p>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400 mt-2">+19.6%</p>
                <p className="text-xs text-zinc-500 mt-1">vs S&P 500: +13.2%</p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Alpha</p>
                  <Target className="h-4 w-4 text-tiffany-500" />
                </div>
                <p className="text-2xl font-bold text-emerald-400 mt-2">+6.4%</p>
                <p className="text-xs text-zinc-500 mt-1">Excess return over benchmark</p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Sharpe Ratio</p>
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-zinc-100 mt-2">1.42</p>
                <p className="text-xs text-emerald-400 mt-1">Above market average</p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Beta</p>
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="text-2xl font-bold text-zinc-100 mt-2">0.85</p>
                <p className="text-xs text-zinc-500 mt-1">Lower volatility than market</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance vs Benchmark Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio vs S&P 500</CardTitle>
              <CardDescription>Year-to-date cumulative returns comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceChart data={portfolioVsBenchmarkData} />
            </CardContent>
          </Card>

          {/* Asset Class Performance */}
          <ROIChart data={assetClassPerformance} />

          {/* Sector Allocation Comparison */}
          <div className="grid lg:grid-cols-2 gap-6">
            <AllocationChart
              data={portfolioSectorAllocation}
              title="Your Portfolio"
              description="Sector allocation by weight"
            />
            <AllocationChart
              data={sp500SectorAllocation}
              title="S&P 500"
              description="Index sector weights"
            />
          </div>

          {/* Benchmark Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benchmark Comparison</CardTitle>
              <CardDescription>Portfolio performance vs major indices</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Index</TableHead>
                    <TableHead className="text-right">Index YTD</TableHead>
                    <TableHead className="text-right">Portfolio YTD</TableHead>
                    <TableHead className="text-right">Alpha</TableHead>
                    <TableHead className="text-right">Beta</TableHead>
                    <TableHead className="text-right">Sharpe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarkMetrics.map((metric) => (
                    <TableRow key={metric.name}>
                      <TableCell className="font-medium">{metric.name}</TableCell>
                      <TableCell className="text-right text-zinc-400">
                        +{metric.ytdReturn}%
                      </TableCell>
                      <TableCell className="text-right text-emerald-400">
                        +{metric.portfolioYtd}%
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        metric.alpha >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {metric.alpha >= 0 ? "+" : ""}{metric.alpha}%
                      </TableCell>
                      <TableCell className="text-right text-zinc-400">
                        {metric.beta}
                      </TableCell>
                      <TableCell className="text-right text-zinc-400">
                        {metric.sharpe}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </animated.div>
  )
}
