"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Plus,
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Calendar,
  BarChart3,
  Shield,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useReports } from "@/lib/hooks/crud/use-reports"
import type { Report } from "@/lib/mock/types"
import {
  AllocationChart,
  PerformanceChart,
  InvestmentReturnsChart,
  ROIChart,
  pieColors,
} from "@/components/dashboard/charts"

const reportTypeConfig = {
  portfolio: {
    label: "Portfolio",
    icon: BarChart3,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
  },
  compliance: {
    label: "Compliance",
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  tax: {
    label: "Tax",
    icon: Receipt,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  performance: {
    label: "Performance",
    icon: BarChart3,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  custom: {
    label: "Custom",
    icon: FileSpreadsheet,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
}

const statusConfig = {
  ready: {
    label: "Ready",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
  generating: {
    label: "Generating",
    icon: Clock,
    color: "text-amber-400",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    color: "text-red-400",
  },
}

// Report analytics data
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

// Benchmark Data
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

export default function ReportsPage() {
  const { reports, addReport, deleteReport } = useReports()
  const [generateOpen, setGenerateOpen] = React.useState(false)
  const [reportType, setReportType] = React.useState<Report["type"]>("portfolio")
  const [reportName, setReportName] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("reports")
  const [selectedBenchmark, setSelectedBenchmark] = React.useState("sp500")
  const reducedMotion = useReducedMotion()

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
          <h1 className="text-2xl font-bold text-zinc-100">Reports</h1>
          <p className="text-zinc-400 mt-1">
            Generate reports and analyze portfolio benchmarks
          </p>
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>
                Create a new report from your portfolio data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as Report["type"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portfolio">Portfolio Summary</SelectItem>
                    <SelectItem value="performance">Performance Report</SelectItem>
                    <SelectItem value="compliance">Compliance Report</SelectItem>
                    <SelectItem value="tax">Tax Preparation</SelectItem>
                    <SelectItem value="custom">Custom Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Report Name</Label>
                <Input
                  placeholder="e.g., Q1 2024 Portfolio Summary"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Include Sections</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Asset Summary",
                    "Performance Charts",
                    "Risk Analysis",
                    "Document Status",
                  ].map((section) => (
                    <label
                      key={section}
                      className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-zinc-700"
                      />
                      {section}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (reportName.trim()) {
                  addReport({
                    name: reportName.trim(),
                    type: reportType,
                    period: "Custom",
                    generatedBy: "Current User",
                  })
                }
                setGenerateOpen(false)
                setReportName("")
                setReportType("portfolio")
              }}>
                Generate Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-6 space-y-6">
          {/* Report Templates */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Quick Generate
            </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(reportTypeConfig).map(([key, config]) => (
            <Card
              key={key}
              className="cursor-pointer hover:border-zinc-700 transition-colors group"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", config.bg)}>
                  <config.icon className={cn("h-5 w-5", config.color)} />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">{config.label}</p>
                  <p className="text-xs text-zinc-500">Generate now</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Report Analytics */}
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

      {/* Quarterly Performance Summary */}
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
                <p className="text-2xl font-bold text-zinc-100 mt-1">68</p>
                <p className="text-xs text-emerald-400 mt-1">+12 this month</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-sm text-zinc-400">Avg Generation Time</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">2.4s</p>
                <p className="text-xs text-tiffany-500 mt-1">-0.3s from last month</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-sm text-zinc-400">Report Downloads</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">142</p>
                <p className="text-xs text-zinc-500 mt-1">Last 30 days</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-sm text-zinc-400">Scheduled Reports</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">5</p>
                <p className="text-xs text-zinc-500 mt-1">Active schedules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Recent Reports
        </h2>
        <div className="space-y-4">
          {reports.map((report) => {
            const typeConfig =
              reportTypeConfig[report.type as keyof typeof reportTypeConfig]
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
                        <p className="font-medium text-zinc-100">{report.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {report.period}
                          </span>
                          <span>
                            Generated{" "}
                            {format(new Date(report.generatedAt), "MMM d, yyyy")}
                          </span>
                          <span>by {report.generatedBy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <status.icon
                          className={cn("h-4 w-4", status.color)}
                        />
                        <span className={cn("text-sm", status.color)}>
                          {status.label}
                        </span>
                      </div>

                      {report.status === "ready" && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Regenerate</DropdownMenuItem>
                          <DropdownMenuItem>Share</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400"
                            onClick={() => deleteReport(report.id)}
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
      </div>
        </TabsContent>

        {/* Benchmarks Tab */}
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
