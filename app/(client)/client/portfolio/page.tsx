/**
 * @file app/(client)/client/portfolio/page.tsx
 *
 * Client-facing portfolio overview page.
 *
 * Data source: `useClientPortfolio` hook (lib/hooks/crud/use-client-portfolio.ts)
 * which calls portfolioService.getPortfolioHoldings() and getPortfolioSummary()
 * under the hood. All summary stats (totalValue, totalCostBasis, totalGain,
 * gainPercent) come from `stats` returned by the hook; the raw `holdings` array
 * is used for tab filtering and the per-row list.
 *
 * Chart data (allocationData, performanceData, assetPerformance) remains inline
 * because it is display-only and not yet wired to a data service.
 *
 * tRPC swap path:
 *   Replace `useClientPortfolio` internals with:
 *   `const { data: holdings } = trpc.client.portfolio.holdings.useQuery()`
 *   `const { data: summary }  = trpc.client.portfolio.summary.useQuery()`
 *   The consuming component (this file) needs zero changes — the hook's return
 *   shape is identical to what tRPC will return.
 */
"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Briefcase,
  PiggyBank,
  Landmark,
  Bitcoin,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  AllocationChart,
  PerformanceChart,
  ROIChart,
} from "@/components/dashboard/charts"
import { useClientPortfolio } from "@/lib/hooks/crud/use-client-portfolio"

// ─────────────────────────────────────────────────────────────────────────────
// Mapping helpers — translate hook AssetClass strings to UI labels/icons
// ─────────────────────────────────────────────────────────────────────────────

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  equities: Briefcase,
  real_estate: Building2,
  fixed_income: Landmark,
  private_equity: PiggyBank,
  cash: Landmark,
  commodity: Bitcoin,
  crypto: Bitcoin,
  alternatives: PiggyBank,
  intellectual_property: Briefcase,
}

const typeLabels: Record<string, string> = {
  equities: "Equities",
  real_estate: "Real Estate",
  fixed_income: "Fixed Income",
  private_equity: "Private Equity",
  cash: "Cash & Equiv.",
  commodity: "Commodities",
  crypto: "Crypto",
  alternatives: "Alternatives",
  intellectual_property: "Intellectual Property",
}

// ─────────────────────────────────────────────────────────────────────────────
// Display-only chart data (not yet driven by a service)
// ─────────────────────────────────────────────────────────────────────────────

const allocationData = [
  { name: "Equities", value: 790000, color: "#14b8a6" },
  { name: "Real Estate", value: 735000, color: "#06b6d4" },
  { name: "Fixed Income", value: 367500, color: "#8b5cf6" },
  { name: "Private Equity", value: 245000, color: "#f59e0b" },
  { name: "Cash & Equiv.", value: 122500, color: "#10b981" },
  { name: "Commodities", value: 75000, color: "#ec4899" },
]

const performanceData = [
  { month: "Jan", portfolio: 0, benchmark: 0 },
  { month: "Feb", portfolio: 1.5, benchmark: 1.2 },
  { month: "Mar", portfolio: 3.2, benchmark: 2.4 },
  { month: "Apr", portfolio: 5.1, benchmark: 3.8 },
  { month: "May", portfolio: 7.2, benchmark: 5.2 },
  { month: "Jun", portfolio: 8.8, benchmark: 6.4 },
  { month: "Jul", portfolio: 8.2, benchmark: 6.1 },
  { month: "Aug", portfolio: 9.5, benchmark: 7.0 },
  { month: "Sep", portfolio: 11.2, benchmark: 8.2 },
  { month: "Oct", portfolio: 11.8, benchmark: 8.8 },
  { month: "Nov", portfolio: 12.4, benchmark: 9.5 },
  { month: "Dec", portfolio: 12.8, benchmark: 10.2 },
]

const assetPerformance = [
  { name: "Apple Inc.", roi: 27.6, invested: 145000, currentValue: 185000 },
  { name: "Private Equity Fund III", roi: 22.5, invested: 200000, currentValue: 245000 },
  { name: "Manhattan Property", roi: 15.5, invested: 420000, currentValue: 485000 },
  { name: "Tech Growth Fund", roi: 12.5, invested: 160000, currentValue: 180000 },
  { name: "VTI ETF", roi: 11.8, invested: 380000, currentValue: 425000 },
  { name: "Miami Condo", roi: 11.1, invested: 225000, currentValue: 250000 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Tab values map to AssetClass strings from the hook
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientPortfolioPage() {
  const [activeTab, setActiveTab] = React.useState("all")
  const reducedMotion = useReducedMotion()

  // Replace inline holdings array + computed totals with hook data
  const { holdings, stats, isLoading } = useClientPortfolio()

  const filteredHoldings = activeTab === "all"
    ? holdings
    : holdings.filter(h => h.assetClass === activeTab)

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">My Portfolio</h1>
        <p className="text-zinc-400 mt-1">
          Track your investments and asset allocation
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Value</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(stats.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Cost Basis</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(stats.totalCostBasis)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Gain/Loss</p>
            <p className={cn("text-2xl font-bold mt-1", stats.totalGain >= 0 ? "text-emerald-400" : "text-red-400")}>
              {stats.totalGain >= 0 ? "+" : ""}{formatCurrency(stats.totalGain)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Return</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={cn("text-2xl font-bold", stats.gainPercent >= 0 ? "text-emerald-400" : "text-red-400")}>
                {stats.gainPercent >= 0 ? "+" : ""}{stats.gainPercent.toFixed(1)}%
              </p>
              {stats.gainPercent >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PerformanceChart data={performanceData} />
        <AllocationChart
          data={allocationData}
          title="Asset Allocation"
          description="Portfolio distribution by asset class"
        />
      </div>

      {/* Top Performers */}
      <ROIChart data={assetPerformance} />

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Holdings</CardTitle>
          <CardDescription>Your investment positions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="equities">Equities</TabsTrigger>
              <TabsTrigger value="real_estate">Real Estate</TabsTrigger>
              <TabsTrigger value="fixed_income">Fixed Income</TabsTrigger>
              <TabsTrigger value="private_equity">Private Equity</TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              {filteredHoldings.map((holding) => {
                const Icon = typeIcons[holding.assetClass] ?? Briefcase
                const isPositive = holding.gain >= 0

                return (
                  <div
                    key={holding.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <Icon className="h-5 w-5 text-tiffany-500" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-100">{holding.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {holding.symbol && (
                            <Badge variant="outline" className="text-xs">{holding.symbol}</Badge>
                          )}
                          <span className="text-xs text-zinc-500">
                            {typeLabels[holding.assetClass] ?? holding.assetClass}
                          </span>
                          {holding.shares != null && (
                            <span className="text-xs text-zinc-500">• {holding.shares.toLocaleString()} shares</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-medium text-zinc-100">{formatCurrency(holding.value)}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-400" />
                        )}
                        <span className={cn("text-sm", isPositive ? "text-emerald-400" : "text-red-400")}>
                          {isPositive ? "+" : ""}{holding.gainPercent.toFixed(1)}%
                        </span>
                        <span className={cn("text-xs", isPositive ? "text-emerald-400/70" : "text-red-400/70")}>
                          ({isPositive ? "+" : ""}{formatCurrency(holding.gain)})
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </animated.div>
  )
}
