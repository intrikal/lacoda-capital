"use client"

import * as React from "react"
import {
  Receipt,
  Plus,
  Search,
  Download,
  Home,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
  MoreHorizontal,
  Hammer,
  Star,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn, formatCurrency } from "@/lib/utils"

// ─── Mock data — replace with listExpenses() + getExpenseSummary() calls ─────

const EXPENSES = [
  {
    id: "1",
    title: "Roof Replacement — 142 Oak Ave",
    category: "renovation",
    status: "paid",
    amount: 28500,
    date: "2024-11-15",
    vendor: "Apex Roofing Co.",
    propertyImpact: "capital_improvement",
    estimatedValueIncrease: 18000,
    asset: "142 Oak Avenue",
    client: "Anderson Family Trust",
  },
  {
    id: "2",
    title: "Kitchen Remodel — 550 Palm Dr",
    category: "renovation",
    status: "pending",
    amount: 62000,
    date: "2025-01-10",
    vendor: "Elite Interiors LLC",
    propertyImpact: "capital_improvement",
    estimatedValueIncrease: 45000,
    asset: "550 Palm Drive",
    client: "Whitmore Holdings",
  },
  {
    id: "3",
    title: "HVAC Maintenance — 78 Elm St",
    category: "maintenance",
    status: "paid",
    amount: 3200,
    date: "2024-12-01",
    vendor: "CoolAir Services",
    propertyImpact: "maintenance",
    estimatedValueIncrease: null,
    asset: "78 Elm Street",
    client: "Johnson Trust",
  },
  {
    id: "4",
    title: "Refinance Closing Costs — 142 Oak Ave",
    category: "financing",
    status: "paid",
    amount: 7800,
    date: "2024-10-20",
    vendor: "First National Bank",
    propertyImpact: null,
    estimatedValueIncrease: null,
    asset: "142 Oak Avenue",
    client: "Anderson Family Trust",
    refinanceRelated: "yes",
  },
  {
    id: "5",
    title: "Property Tax Q1 2025 — 550 Palm Dr",
    category: "property_tax",
    status: "overdue",
    amount: 5400,
    date: "2025-01-31",
    vendor: "County Tax Collector",
    propertyImpact: null,
    estimatedValueIncrease: null,
    asset: "550 Palm Drive",
    client: "Whitmore Holdings",
  },
  {
    id: "6",
    title: "Property Management Fee — Portfolio",
    category: "management_fee",
    status: "pending",
    amount: 4200,
    date: "2025-02-01",
    vendor: "Prestige PM Group",
    propertyImpact: null,
    estimatedValueIncrease: null,
    asset: null,
    client: "All Clients",
  },
  {
    id: "7",
    title: "Deck & Outdoor Renovation — 78 Elm St",
    category: "renovation",
    status: "pending",
    amount: 24000,
    date: "2025-03-01",
    vendor: "Premier Outdoor Living",
    propertyImpact: "capital_improvement",
    estimatedValueIncrease: 16500,
    asset: "78 Elm Street",
    client: "Johnson Trust",
  },
  {
    id: "8",
    title: "Legal — Title Search & Escrow",
    category: "legal",
    status: "paid",
    amount: 2100,
    date: "2024-09-15",
    vendor: "Harmon & Associates",
    propertyImpact: null,
    estimatedValueIncrease: null,
    asset: "550 Palm Drive",
    client: "Whitmore Holdings",
  },
]

// Refinance opportunities — mock; wire to assets with assetClass = "real_estate"
const REFINANCE_OPPORTUNITIES = [
  {
    id: "r1",
    property: "142 Oak Avenue",
    client: "Anderson Family Trust",
    currentRate: 6.875,
    marketRate: 5.95,
    potentialSaving: 412,
    loanBalance: 680000,
    ltv: 58,
    action: "Rate-and-term refinance recommended",
    urgency: "high",
  },
  {
    id: "r2",
    property: "550 Palm Drive",
    client: "Whitmore Holdings",
    currentRate: 7.25,
    marketRate: 6.1,
    potentialSaving: 620,
    loanBalance: 1200000,
    ltv: 52,
    action: "Cash-out refi could fund planned kitchen remodel",
    urgency: "medium",
  },
  {
    id: "r3",
    property: "78 Elm Street",
    client: "Johnson Trust",
    currentRate: 6.5,
    marketRate: 6.3,
    potentialSaving: 95,
    loanBalance: 320000,
    ltv: 71,
    action: "Marginal savings — monitor for further rate movement",
    urgency: "low",
  },
]

// Remodel suggestions — high-ROI improvements by property
const REMODEL_SUGGESTIONS = [
  {
    id: "m1",
    property: "78 Elm Street",
    client: "Johnson Trust",
    improvement: "Bathroom Remodel (Primary)",
    estimatedCost: 18000,
    estimatedROI: 72,
    estimatedValueAdd: 13000,
    category: "Interior",
    priority: "high",
    notes: "Outdated fixtures; comp sales show $+13k premium for updated primary bath",
  },
  {
    id: "m2",
    property: "550 Palm Drive",
    client: "Whitmore Holdings",
    improvement: "Solar Panel Installation",
    estimatedCost: 32000,
    estimatedROI: 85,
    estimatedValueAdd: 27000,
    category: "Energy",
    priority: "high",
    notes: "State incentives reduce net cost by ~40%; adds $27k to appraised value",
  },
  {
    id: "m3",
    property: "142 Oak Avenue",
    client: "Anderson Family Trust",
    improvement: "Garage Conversion to ADU",
    estimatedCost: 85000,
    estimatedROI: 110,
    estimatedValueAdd: 93500,
    category: "Expansion",
    priority: "medium",
    notes: "Local zoning allows ADU; rental income potential of $1,800/mo",
  },
  {
    id: "m4",
    property: "78 Elm Street",
    client: "Johnson Trust",
    improvement: "Landscaping & Curb Appeal",
    estimatedCost: 8500,
    estimatedROI: 95,
    estimatedValueAdd: 8075,
    category: "Exterior",
    priority: "medium",
    notes: "Low-cost, high-impact; neighborhood comps show strong curb appeal premium",
  },
]

// ─── Helper maps ──────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  renovation: "Renovation",
  maintenance: "Maintenance",
  capital_improvement: "Capital Improvement",
  property_tax: "Property Tax",
  insurance: "Insurance",
  management_fee: "Management Fee",
  legal: "Legal",
  financing: "Financing",
  utilities: "Utilities",
  professional_services: "Professional Services",
  marketing: "Marketing",
  other: "Other",
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Clock },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertCircle },
  disputed: { label: "Disputed", className: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: AlertCircle },
  cancelled: { label: "Cancelled", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", icon: AlertCircle },
}

const URGENCY_CONFIG: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
}

const PRIORITY_CONFIG: Record<string, string> = {
  high: "bg-tiffany-500/10 text-tiffany-500 border-tiffany-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [addOpen, setAddOpen] = React.useState(false)

  // Summary figures
  const totalPaid = EXPENSES.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0)
  const totalPending = EXPENSES.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0)
  const totalOverdue = EXPENSES.filter((e) => e.status === "overdue").reduce((s, e) => s + e.amount, 0)
  const totalValueAdd = EXPENSES.filter((e) => e.estimatedValueIncrease).reduce(
    (s, e) => s + (e.estimatedValueIncrease ?? 0),
    0
  )

  const filtered = EXPENSES.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.vendor?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (e.client?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = statusFilter === "all" || e.status === statusFilter
    const matchCat = categoryFilter === "all" || e.category === categoryFilter
    return matchSearch && matchStatus && matchCat
  })

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Portfolio Expenses</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Track spending, renovation costs, and value-add opportunities across all properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-zinc-100">
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button
            size="sm"
            className="bg-tiffany-500 hover:bg-tiffany-600 text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Log Expense
          </Button>
        </div>
      </div>

      {/* ── Two-panel layout ──────────────────────────────────────────── */}
      <Tabs defaultValue="expenses">
        <div className="flex flex-col lg:grid lg:grid-cols-[220px_1fr] rounded-xl border border-zinc-800/60 overflow-hidden">

          {/* ── Left sticky panel ───────────────────────────────────── */}
          <aside className="flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-zinc-800/60 lg:sticky lg:top-14 lg:h-[calc(100vh-80px)] lg:overflow-y-auto bg-zinc-900/40">

            {/* KPI summary */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Summary</p>
              {[
                { label: "Paid", value: formatCurrency(totalPaid), color: "text-emerald-400", icon: CheckCircle2 },
                { label: "Pending", value: formatCurrency(totalPending), color: "text-yellow-400", icon: Clock },
                { label: "Overdue", value: formatCurrency(totalOverdue), color: "text-red-400", icon: AlertCircle },
                { label: "Est. Value Add", value: formatCurrency(totalValueAdd), color: "text-tiffany-500", icon: TrendingUp },
              ].map((kpi) => (
                <div key={kpi.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-2">
                    {React.createElement(kpi.icon, { className: cn("h-3.5 w-3.5", kpi.color) })}
                    <span className="text-sm text-zinc-400">{kpi.label}</span>
                  </div>
                  <span className={cn("text-sm font-bold tabular-nums", kpi.color)}>{kpi.value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Vertical tab nav */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">View</p>
              <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-0.5">
                {[
                  { value: "expenses", label: "All Expenses", icon: Receipt, count: filtered.length },
                  { value: "refinance", label: "Refinance", icon: RefreshCw, count: REFINANCE_OPPORTUNITIES.length },
                  { value: "remodel", label: "Equity Boosts", icon: Hammer, count: REMODEL_SUGGESTIONS.length },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="w-full justify-between px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-tiffany-500/10 data-[state=active]:text-tiffany-500 data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      {React.createElement(tab.icon, { className: "h-3.5 w-3.5" })}
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-600 data-[state=active]:text-tiffany-400">{tab.count}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Search + filters (for Expenses tab) */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Filters</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search expenses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-300 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-300 h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </aside>

          {/* ── Right main panel ─────────────────────────────────────── */}
          <div className="p-5 lg:p-6 min-w-0">

        {/* ── Expenses Tab ──────────────────────────────────────────── */}
        <TabsContent value="expenses" className="mt-0 space-y-4">

          <Card className="bg-zinc-900 border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500">Expense</TableHead>
                  <TableHead className="text-zinc-500">Category</TableHead>
                  <TableHead className="text-zinc-500">Asset / Client</TableHead>
                  <TableHead className="text-zinc-500">Date</TableHead>
                  <TableHead className="text-zinc-500 text-right">Amount</TableHead>
                  <TableHead className="text-zinc-500 text-right">Est. Value Add</TableHead>
                  <TableHead className="text-zinc-500">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((exp) => {
                  const sc = STATUS_CONFIG[exp.status]
                  return (
                    <TableRow key={exp.id} className="border-zinc-800 hover:bg-zinc-800/40">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{exp.title}</p>
                          {exp.vendor && (
                            <p className="text-xs text-zinc-500">{exp.vendor}</p>
                          )}
                          {exp.refinanceRelated === "yes" && (
                            <Badge className="mt-1 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
                              <RefreshCw className="h-2.5 w-2.5 mr-1" />
                              Refinance
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                          {CATEGORY_LABEL[exp.category] ?? exp.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          {exp.asset && <p className="text-xs font-medium text-zinc-300">{exp.asset}</p>}
                          <p className="text-xs text-zinc-500">{exp.client}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-400">
                          {new Date(exp.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-zinc-100">
                          {formatCurrency(exp.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {exp.estimatedValueIncrease ? (
                          <span className="text-sm font-medium text-tiffany-500">
                            +{formatCurrency(exp.estimatedValueIncrease)}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs border gap-1", sc.className)}>
                          {React.createElement(sc.icon, { className: "h-3 w-3" })}
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem className="text-zinc-300 focus:text-zinc-100 focus:bg-zinc-800">
                              View details
                            </DropdownMenuItem>
                            {exp.status === "pending" && (
                              <DropdownMenuItem className="text-emerald-400 focus:text-emerald-300 focus:bg-zinc-800">
                                Mark as paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-zinc-800">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Refinance Tab ─────────────────────────────────────────── */}
        <TabsContent value="refinance" className="mt-0 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <RefreshCw className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-400">
              Properties are flagged when current mortgage rates are at least <span className="text-zinc-200">0.5%</span> above
              today&apos;s market rate for comparable LTVs. Monthly savings shown are estimates based on current balance and rate delta.
            </p>
          </div>

          <div className="grid gap-4">
            {REFINANCE_OPPORTUNITIES.map((opp) => (
              <Card key={opp.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="h-4 w-4 text-tiffany-500" />
                        <h3 className="font-semibold text-zinc-100">{opp.property}</h3>
                        <Badge className={cn("text-xs border", URGENCY_CONFIG[opp.urgency])}>
                          {opp.urgency === "high" ? "Act Soon" : opp.urgency === "medium" ? "Monitor" : "Low Priority"}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-500 mb-3">{opp.client}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        {[
                          { label: "Current Rate", value: `${opp.currentRate}%`, color: "text-red-400" },
                          { label: "Market Rate", value: `${opp.marketRate}%`, color: "text-emerald-400" },
                          { label: "Mo. Savings", value: formatCurrency(opp.potentialSaving), color: "text-tiffany-500" },
                          { label: "LTV", value: `${opp.ltv}%`, color: "text-zinc-300" },
                        ].map((stat) => (
                          <div key={stat.label}>
                            <p className="text-xs text-zinc-500 mb-0.5">{stat.label}</p>
                            <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-zinc-500 mb-1">
                          <span>Market rate</span>
                          <span>Current rate</span>
                        </div>
                        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-tiffany-500 rounded-full"
                            style={{ width: `${(opp.marketRate / opp.currentRate) * 100}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-sm text-zinc-400 italic">{opp.action}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-zinc-500 mb-1">Loan Balance</p>
                      <p className="text-lg font-bold text-zinc-100">{formatCurrency(opp.loanBalance)}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500"
                      >
                        Log Refi Expense
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Remodel Tab ───────────────────────────────────────────── */}
        <TabsContent value="remodel" className="mt-0 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-tiffany-500/5 border border-tiffany-500/20">
            <Star className="h-4 w-4 text-tiffany-500 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-400">
              High-ROI improvements identified from comparable sales data and local market analysis.
              ROI estimates are based on appraised value increases relative to renovation cost.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {REMODEL_SUGGESTIONS.map((s) => (
              <Card key={s.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className={cn("text-xs border mb-2", PRIORITY_CONFIG[s.priority])}>
                        {s.priority === "high" ? "High ROI" : "Moderate ROI"}
                      </Badge>
                      <h3 className="font-semibold text-zinc-100">{s.improvement}</h3>
                      <p className="text-xs text-zinc-500">{s.property} · {s.client}</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400 shrink-0">
                      {s.category}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Est. Cost", value: formatCurrency(s.estimatedCost), color: "text-yellow-400" },
                      { label: "Value Add", value: `+${formatCurrency(s.estimatedValueAdd)}`, color: "text-tiffany-500" },
                      { label: "ROI", value: `${s.estimatedROI}%`, color: "text-emerald-400" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center bg-zinc-800/50 rounded-lg p-2">
                        <p className="text-[10px] text-zinc-500 mb-0.5">{stat.label}</p>
                        <p className={cn("text-sm font-bold", stat.color)}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>ROI</span>
                      <span>{s.estimatedROI}%</span>
                    </div>
                    <Progress
                      value={Math.min(s.estimatedROI, 120)}
                      className="h-1.5 bg-zinc-800"
                    />
                  </div>

                  <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{s.notes}</p>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:text-zinc-100"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Log as Planned Expense
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
          </div>{/* end right panel */}
        </div>{/* end two-panel grid */}
      </Tabs>

      {/* ── Add Expense Dialog ────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Log Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Title</Label>
              <Input placeholder="e.g. Kitchen renovation — 142 Oak Ave" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Category</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Amount (USD)</Label>
                <Input placeholder="0.00" type="number" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Date</Label>
                <Input type="date" className="bg-zinc-800 border-zinc-700 text-zinc-300" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Status</Label>
                <Select defaultValue="pending">
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Vendor</Label>
              <Input placeholder="Vendor or contractor name" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Property Impact</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="renovation">Renovation</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="capital_improvement">Capital Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Est. Value Increase</Label>
                <Input placeholder="0.00" type="number" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Notes</Label>
              <Textarea
                placeholder="Additional details..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="border-zinc-700 text-zinc-400">
              Cancel
            </Button>
            <Button className="bg-tiffany-500 hover:bg-tiffany-600 text-white" onClick={() => setAddOpen(false)}>
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
