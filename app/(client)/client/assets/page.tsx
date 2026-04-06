/**
 * @file app/(client)/client/assets/page.tsx
 *
 * Client-facing asset holdings page.
 *
 * Shows all investment positions grouped and filterable by asset class.
 * Includes summary KPI cards, allocation chart, class breakdown bars,
 * and an expandable holdings table with cost basis / unrealized G/L details.
 *
 * Data source: mock data (will be wired to server actions once DB migrations run).
 */

"use client"

import * as React from "react"
import {
  TrendingUp,
  TrendingDown,
  Building2,
  LineChart,
  DollarSign,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatCurrency } from "@/lib/utils"
import { AllocationChart } from "@/components/dashboard/charts"

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetCategory = "equities" | "real_estate" | "fixed_income" | "private_equity" | "cash"

interface Asset {
  id: string
  name: string
  category: AssetCategory
  ticker?: string
  value: number
  costBasis: number
  gainLoss: number
  gainLossPct: number
  quantity?: string
  account?: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const allocationData = [
  { name: "Equities",        value: 980000, color: "#0FBFBF" },
  { name: "Real Estate",     value: 735000, color: "#06b6d4" },
  { name: "Fixed Income",    value: 367500, color: "#8b5cf6" },
  { name: "Private Equity",  value: 245000, color: "#f59e0b" },
  { name: "Cash & Equiv.",   value: 122500, color: "#10b981" },
]

const totalPortfolioValue = allocationData.reduce((s, a) => s + a.value, 0)

const ASSETS: Asset[] = [
  // Equities
  { id: "a1", name: "Vanguard S&P 500 ETF",   ticker: "VOO",  category: "equities",       value: 462800, costBasis: 390000, gainLoss:  72800, gainLossPct: 18.7, quantity: "1,800 shares", account: "Investment Account" },
  { id: "a2", name: "Apple Inc.",              ticker: "AAPL", category: "equities",       value: 189300, costBasis: 140000, gainLoss:  49300, gainLossPct: 35.2, quantity: "600 shares",   account: "Investment Account" },
  { id: "a3", name: "Microsoft Corp.",         ticker: "MSFT", category: "equities",       value: 207600, costBasis: 160000, gainLoss:  47600, gainLossPct: 29.8, quantity: "500 shares",   account: "Investment Account" },
  { id: "a4", name: "Vanguard Total Bond ETF", ticker: "BND",  category: "equities",       value: 120300, costBasis: 125000, gainLoss:  -4700, gainLossPct: -3.8, quantity: "1,640 shares", account: "Retirement Account" },
  // Real Estate
  { id: "a5", name: "Primary Residence",                       category: "real_estate",    value: 485000, costBasis: 380000, gainLoss: 105000, gainLossPct: 27.6, account: "Real Estate" },
  { id: "a6", name: "Rental Property — Austin",                category: "real_estate",    value: 250000, costBasis: 215000, gainLoss:  35000, gainLossPct: 16.3, account: "Real Estate" },
  // Fixed Income
  { id: "a7", name: "Municipal Bond Portfolio",                category: "fixed_income",   value: 200000, costBasis: 196000, gainLoss:   4000, gainLossPct:  2.0, account: "Tax-Advantaged" },
  { id: "a8", name: "US Treasury 5yr",         ticker: "GOVT", category: "fixed_income",   value: 167500, costBasis: 165000, gainLoss:   2500, gainLossPct:  1.5, account: "Investment Account" },
  // Private Equity
  { id: "a9",  name: "Series A — FinTech Co",                  category: "private_equity", value: 165000, costBasis: 100000, gainLoss:  65000, gainLossPct: 65.0, account: "Alternative Investments" },
  { id: "a10", name: "Growth Equity Fund II",                  category: "private_equity", value:  80000, costBasis:  75000, gainLoss:   5000, gainLossPct:  6.7, account: "Alternative Investments" },
  // Cash
  { id: "a11", name: "High-Yield Savings",                     category: "cash",           value:  75000, costBasis:  75000, gainLoss:      0, gainLossPct:  0.0, account: "Savings" },
  { id: "a12", name: "Money Market Fund",                      category: "cash",           value:  47500, costBasis:  47500, gainLoss:      0, gainLossPct:  0.0, account: "Investment Account" },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<AssetCategory, {
  label: string
  icon: React.ReactNode
  color: string
  badge: string
}> = {
  equities:       { label: "Equities",       icon: <LineChart  className="h-4 w-4" />, color: "text-tiffany-500", badge: "bg-tiffany-500/10 text-tiffany-500 border-tiffany-500/20" },
  real_estate:    { label: "Real Estate",    icon: <Building2  className="h-4 w-4" />, color: "text-cyan-400",    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  fixed_income:   { label: "Fixed Income",   icon: <DollarSign className="h-4 w-4" />, color: "text-purple-400",  badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  private_equity: { label: "Private Equity", icon: <Briefcase  className="h-4 w-4" />, color: "text-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  cash:           { label: "Cash & Equiv.",  icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
}

const TAB_FILTERS: { value: string; label: string }[] = [
  { value: "all",            label: "All" },
  { value: "equities",       label: "Equities" },
  { value: "real_estate",    label: "Real Estate" },
  { value: "fixed_income",   label: "Fixed Income" },
  { value: "private_equity", label: "Private Equity" },
  { value: "cash",           label: "Cash" },
]

// ─── AssetRow ─────────────────────────────────────────────────────────────────

function AssetRow({ asset }: { asset: Asset }) {
  const [expanded, setExpanded] = React.useState(false)
  const cfg = CATEGORY_CONFIG[asset.category]
  const isGain = asset.gainLoss >= 0

  return (
    <>
      <tr
        className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={cfg.color}>{cfg.icon}</span>
            <div>
              <p className="text-sm font-medium text-zinc-100">{asset.name}</p>
              {asset.ticker && (
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                  {asset.ticker}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <Badge variant="outline" className={cn("text-[10px]", cfg.badge)}>
            {cfg.label}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <p className="text-sm font-semibold text-zinc-100">{formatCurrency(asset.value)}</p>
          <p className="text-[10px] text-zinc-500">
            {((asset.value / totalPortfolioValue) * 100).toFixed(1)}% of portfolio
          </p>
        </td>
        <td className="px-4 py-3 text-right hidden sm:table-cell">
          <p className={cn("text-sm font-medium flex items-center justify-end gap-1", isGain ? "text-emerald-400" : "text-red-400")}>
            {isGain ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isGain ? "+" : ""}{formatCurrency(asset.gainLoss)}
          </p>
          <p className={cn("text-[10px]", isGain ? "text-emerald-400/70" : "text-red-400/70")}>
            {isGain ? "+" : ""}{asset.gainLossPct.toFixed(1)}%
          </p>
        </td>
        <td className="px-4 py-3 text-right text-zinc-600">
          {expanded
            ? <ChevronUp  className="h-4 w-4 ml-auto" />
            : <ChevronDown className="h-4 w-4 ml-auto" />
          }
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
          <td colSpan={5} className="px-6 py-3">
            <div className="flex flex-wrap gap-6 text-xs text-zinc-400">
              <div>
                <span className="text-zinc-600">Cost basis</span><br />
                <span className="text-zinc-200">{formatCurrency(asset.costBasis)}</span>
              </div>
              <div>
                <span className="text-zinc-600">Unrealized G/L</span><br />
                <span className={isGain ? "text-emerald-400" : "text-red-400"}>
                  {isGain ? "+" : ""}{formatCurrency(asset.gainLoss)} ({isGain ? "+" : ""}{asset.gainLossPct.toFixed(1)}%)
                </span>
              </div>
              {asset.quantity && (
                <div>
                  <span className="text-zinc-600">Quantity</span><br />
                  <span className="text-zinc-200">{asset.quantity}</span>
                </div>
              )}
              {asset.account && (
                <div>
                  <span className="text-zinc-600">Account</span><br />
                  <span className="text-zinc-200">{asset.account}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientAssetsPage() {
  const [activeTab, setActiveTab] = React.useState("all")

  const totalGain = ASSETS.reduce((s, a) => s + a.gainLoss, 0)
  const totalCost = ASSETS.reduce((s, a) => s + a.costBasis, 0)
  const totalGainPct = (totalGain / totalCost) * 100

  const filteredAssets = activeTab === "all"
    ? ASSETS
    : ASSETS.filter((a) => a.category === activeTab)

  return (
    <div>
      {/* Header */}
      <div className="pb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Asset Holdings</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          {ASSETS.length} positions across {allocationData.length} asset classes
        </p>
      </div>

      {/* Two-panel layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col lg:grid lg:grid-cols-[200px_1fr] rounded-xl border border-zinc-800/60 overflow-hidden">

          {/* Left sticky panel */}
          <aside className="flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-zinc-800/60 lg:sticky lg:top-14 lg:h-[calc(100vh-80px)] lg:overflow-y-auto bg-zinc-900/40">

            {/* KPI stats */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Summary</p>
              {[
                { label: "Total Value",  value: formatCurrency(totalPortfolioValue), color: "text-zinc-100" },
                { label: "Cost Basis",   value: formatCurrency(totalCost),            color: "text-zinc-400" },
                { label: "Unrealized G/L", value: `${totalGain >= 0 ? "+" : ""}${formatCurrency(totalGain)}`, color: totalGain >= 0 ? "text-emerald-400" : "text-red-400" },
                { label: "Return",       value: `${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(1)}%`, color: totalGainPct >= 0 ? "text-emerald-400" : "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
                  <span className="text-xs text-zinc-500">{s.label}</span>
                  <span className={cn("text-sm font-bold tabular-nums", s.color)}>{s.value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Allocation mini-chart */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Allocation</p>
              {allocationData.map((cls) => {
                const pct = (cls.value / totalPortfolioValue) * 100
                return (
                  <div key={cls.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
                        <span className="text-zinc-400 truncate max-w-[90px]">{cls.name}</span>
                      </div>
                      <span className="text-zinc-500">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cls.color }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Filter tabs */}
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Filter</p>
              <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-0.5">
                {TAB_FILTERS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="w-full justify-between px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-tiffany-500/10 data-[state=active]:text-tiffany-500 data-[state=active]:shadow-none"
                  >
                    <span>{tab.label}</span>
                    <span className="text-xs font-mono text-zinc-600">
                      {tab.value === "all" ? ASSETS.length : ASSETS.filter((a) => a.category === tab.value).length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </aside>

          {/* Right main panel */}
          <div className="p-4 lg:p-6 min-w-0 space-y-5">

            {/* Full allocation breakdown chart */}
            <AllocationChart
              data={allocationData}
              title="Portfolio Allocation"
              description="Distribution by asset class"
            />

            {/* Holdings table */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">All Holdings</CardTitle>
                <CardDescription>Click a row to expand cost basis & details</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/60">
                        <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Asset</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 hidden md:table-cell">Class</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Value</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 hidden sm:table-cell">Gain / Loss</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                            No holdings in this category
                          </td>
                        </tr>
                      ) : (
                        filteredAssets.map((asset) => (
                          <AssetRow key={asset.id} asset={asset} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>{/* end right panel */}
        </div>{/* end two-panel grid */}
      </Tabs>
    </div>
  )
}
