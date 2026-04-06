"use client"

import * as React from "react"
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Home,
  RefreshCw,
  Hammer,
  ChevronRight,
  Star,
  Info,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { cn, formatCurrency } from "@/lib/utils"

// ─── Mock data scoped to this client ─────────────────────────────────────────
// In production, fetch filtered by the authenticated client's memberId

const MY_EXPENSES = [
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
  },
  {
    id: "2",
    title: "HVAC Maintenance — 142 Oak Ave",
    category: "maintenance",
    status: "paid",
    amount: 3200,
    date: "2024-12-01",
    vendor: "CoolAir Services",
    propertyImpact: "maintenance",
    estimatedValueIncrease: null,
    asset: "142 Oak Avenue",
  },
  {
    id: "3",
    title: "Refinance Closing Costs — 142 Oak Ave",
    category: "financing",
    status: "paid",
    amount: 7800,
    date: "2024-10-20",
    vendor: "First National Bank",
    propertyImpact: null,
    estimatedValueIncrease: null,
    asset: "142 Oak Avenue",
  },
  {
    id: "4",
    title: "Property Tax Q1 2025",
    category: "property_tax",
    status: "pending",
    amount: 5400,
    date: "2025-01-31",
    vendor: "County Tax Collector",
    propertyImpact: null,
    estimatedValueIncrease: null,
    asset: "142 Oak Avenue",
  },
  {
    id: "5",
    title: "Property Management Fee — Feb",
    category: "management_fee",
    status: "pending",
    amount: 1400,
    date: "2025-02-01",
    vendor: "Prestige PM Group",
    propertyImpact: null,
    estimatedValueIncrease: null,
    asset: "142 Oak Avenue",
  },
]

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
  other: "Other",
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Clock },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertCircle },
}

const REFINANCE = {
  property: "142 Oak Avenue",
  currentRate: 6.875,
  marketRate: 5.95,
  potentialSaving: 412,
  loanBalance: 680000,
  ltv: 58,
  action: "Rate-and-term refinance could save you ~$412/month. Ask your advisor for details.",
}

const REMODEL_SUGGESTIONS = [
  {
    improvement: "Primary Bathroom Remodel",
    estimatedCost: 18000,
    estimatedROI: 72,
    estimatedValueAdd: 13000,
    notes: "Updated primary bath showing $13k premium in recent comp sales.",
  },
  {
    improvement: "Solar Panel Installation",
    estimatedCost: 32000,
    estimatedROI: 85,
    estimatedValueAdd: 27000,
    notes: "State incentives reduce net cost ~40%. Adds $27k appraised value.",
  },
  {
    improvement: "Landscaping & Curb Appeal",
    estimatedCost: 8500,
    estimatedROI: 95,
    estimatedValueAdd: 8075,
    notes: "Strong curb appeal premium in comparable sales.",
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientExpensesPage() {
  const totalPaid = MY_EXPENSES.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0)
  const totalPending = MY_EXPENSES.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0)
  const totalValueAdd = MY_EXPENSES.filter((e) => e.estimatedValueIncrease).reduce(
    (s, e) => s + (e.estimatedValueIncrease ?? 0),
    0
  )
  const totalSpend = totalPaid + totalPending

  // Category breakdown for visual summary
  const byCategory: Record<string, number> = {}
  for (const e of MY_EXPENSES) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="pb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Portfolio Expenses</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Spending, improvements, and equity-building opportunities for your properties
        </p>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────────────────── */}
      <Tabs defaultValue="expenses">
        <div className="flex flex-col lg:grid lg:grid-cols-[200px_1fr] rounded-xl border border-zinc-800/60 overflow-hidden">

          {/* Left sticky panel */}
          <aside className="flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-zinc-800/60 lg:sticky lg:top-14 lg:h-[calc(100vh-80px)] lg:overflow-y-auto bg-zinc-900/40">

            {/* KPI stats */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Summary</p>
              {[
                { label: "Total Spend",  value: formatCurrency(totalSpend),    color: "text-zinc-300", icon: Receipt },
                { label: "Paid",         value: formatCurrency(totalPaid),     color: "text-emerald-400", icon: CheckCircle2 },
                { label: "Pending",      value: formatCurrency(totalPending),  color: "text-yellow-400", icon: Clock },
                { label: "Value Added",  value: formatCurrency(totalValueAdd), color: "text-tiffany-500", icon: TrendingUp },
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

            {/* Spend by category mini-chart */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">By Category</p>
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-500 truncate max-w-[100px]">{CATEGORY_LABEL[cat] ?? cat}</span>
                      <span className="text-zinc-400 font-medium">{formatCurrency(amt)}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-tiffany-500/60 rounded-full" style={{ width: `${(amt / totalSpend) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Tab navigation */}
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">View</p>
              <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-0.5">
                {[
                  { value: "expenses",  label: "Expenses",     icon: Receipt },
                  { value: "refinance", label: "Refinance",    icon: RefreshCw },
                  { value: "remodel",   label: "Equity Boosts", icon: Hammer },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="w-full justify-start px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-tiffany-500/10 data-[state=active]:text-tiffany-500 data-[state=active]:shadow-none"
                  >
                    {React.createElement(tab.icon, { className: "h-3.5 w-3.5 mr-2 shrink-0" })}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </aside>

          {/* Right main panel */}
          <div className="p-5 lg:p-6 min-w-0">

        {/* Expenses */}
        <TabsContent value="expenses" className="mt-0 space-y-4">
          {/* Spend by category breakdown */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-300">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">{CATEGORY_LABEL[cat] ?? cat}</span>
                      <span className="text-zinc-300 font-medium">{formatCurrency(amt)}</span>
                    </div>
                    <Progress
                      value={(amt / totalSpend) * 100}
                      className="h-1.5 bg-zinc-800"
                    />
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Expense table */}
          <Card className="bg-zinc-900 border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500">Description</TableHead>
                  <TableHead className="text-zinc-500">Property</TableHead>
                  <TableHead className="text-zinc-500">Date</TableHead>
                  <TableHead className="text-zinc-500 text-right">Amount</TableHead>
                  <TableHead className="text-zinc-500 text-right">Value Add</TableHead>
                  <TableHead className="text-zinc-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MY_EXPENSES.map((exp) => {
                  const sc = STATUS_CONFIG[exp.status]
                  return (
                    <TableRow key={exp.id} className="border-zinc-800 hover:bg-zinc-800/40">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{exp.title}</p>
                          {exp.vendor && <p className="text-xs text-zinc-500">{exp.vendor}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-400">{exp.asset}</span>
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
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Refinance */}
        <TabsContent value="refinance" className="mt-0">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 mb-4">
            <Info className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-400">
              Your advisor monitors mortgage rates and will notify you when a refinance makes financial sense.
              Below is your current opportunity based on today&apos;s market rates.
            </p>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-5 w-5 text-tiffany-500" />
                <h3 className="font-semibold text-zinc-100">{REFINANCE.property}</h3>
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Act Soon</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
                {[
                  { label: "Your Current Rate", value: `${REFINANCE.currentRate}%`, color: "text-red-400" },
                  { label: "Today's Market Rate", value: `${REFINANCE.marketRate}%`, color: "text-emerald-400" },
                  { label: "Monthly Savings", value: formatCurrency(REFINANCE.potentialSaving), color: "text-tiffany-500" },
                  { label: "Loan-to-Value", value: `${REFINANCE.ltv}%`, color: "text-zinc-300" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                    <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Market ({REFINANCE.marketRate}%)</span>
                  <span>Your rate ({REFINANCE.currentRate}%)</span>
                </div>
                <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-tiffany-500 rounded-full"
                    style={{ width: `${(REFINANCE.marketRate / REFINANCE.currentRate) * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-zinc-400 italic mb-4">{REFINANCE.action}</p>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">Outstanding loan balance</p>
                  <p className="text-lg font-bold text-zinc-100 mt-0.5">{formatCurrency(REFINANCE.loanBalance)}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-tiffany-500 hover:bg-tiffany-600 text-white"
                >
                  Talk to Your Advisor
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equity Boosts */}
        <TabsContent value="remodel" className="mt-0 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-tiffany-500/5 border border-tiffany-500/20">
            <Star className="h-4 w-4 text-tiffany-500 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-400">
              High-ROI improvements your advisor has identified for your property based on comparable sales data.
              These could meaningfully increase your home equity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REMODEL_SUGGESTIONS.map((s) => (
              <Card key={s.improvement} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-zinc-100 text-sm">{s.improvement}</h3>
                    <Badge className="bg-tiffany-500/10 text-tiffany-500 border-0 text-xs shrink-0 ml-2">
                      {s.estimatedROI}% ROI
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Estimated Cost", value: formatCurrency(s.estimatedCost), color: "text-yellow-400" },
                      { label: "Value Added", value: `+${formatCurrency(s.estimatedValueAdd)}`, color: "text-tiffany-500" },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-zinc-800/50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-zinc-500 mb-0.5">{stat.label}</p>
                        <p className={cn("text-sm font-bold", stat.color)}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-3">
                    <Progress value={Math.min(s.estimatedROI, 100)} className="h-1.5 bg-zinc-800" />
                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed">{s.notes}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

          </div>{/* end right panel */}
        </div>{/* end two-panel grid */}
      </Tabs>
    </div>
  )
}
