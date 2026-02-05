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

// Client's holdings
const holdings = [
  { id: "1", name: "Vanguard Total Stock Market ETF", ticker: "VTI", type: "equity", value: 425000, shares: 1680, costBasis: 380000, return: 11.8 },
  { id: "2", name: "Manhattan Investment Property", ticker: null, type: "realestate", value: 485000, costBasis: 420000, return: 15.5 },
  { id: "3", name: "Vanguard Total Bond Market ETF", ticker: "BND", type: "fixed", value: 245000, shares: 3200, costBasis: 252000, return: -2.8 },
  { id: "4", name: "Apple Inc.", ticker: "AAPL", type: "equity", value: 185000, shares: 980, costBasis: 145000, return: 27.6 },
  { id: "5", name: "Miami Condo Rental", ticker: null, type: "realestate", value: 250000, costBasis: 225000, return: 11.1 },
  { id: "6", name: "Private Equity Fund III", ticker: null, type: "private", value: 245000, costBasis: 200000, return: 22.5 },
  { id: "7", name: "Tech Growth Fund", ticker: "TGFX", type: "equity", value: 180000, shares: 450, costBasis: 160000, return: 12.5 },
  { id: "8", name: "High-Yield Bond Fund", ticker: "HYG", type: "fixed", value: 122500, shares: 1580, costBasis: 125000, return: -2.0 },
  { id: "9", name: "Treasury Bills", ticker: "T-BILL", type: "cash", value: 122500, costBasis: 120000, return: 2.1 },
  { id: "10", name: "SPDR Gold Trust", ticker: "GLD", type: "commodity", value: 75000, shares: 380, costBasis: 68000, return: 10.3 },
]

const typeIcons = {
  equity: Briefcase,
  realestate: Building2,
  fixed: Landmark,
  private: PiggyBank,
  cash: Landmark,
  commodity: Bitcoin,
}

const typeLabels = {
  equity: "Equities",
  realestate: "Real Estate",
  fixed: "Fixed Income",
  private: "Private Equity",
  cash: "Cash & Equiv.",
  commodity: "Commodities",
}

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

export default function ClientPortfolioPage() {
  const [activeTab, setActiveTab] = React.useState("all")
  const reducedMotion = useReducedMotion()

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)
  const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0)
  const totalGain = totalValue - totalCost
  const totalReturn = ((totalValue - totalCost) / totalCost) * 100

  const filteredHoldings = activeTab === "all"
    ? holdings
    : holdings.filter(h => h.type === activeTab)

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
            <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Cost Basis</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Gain/Loss</p>
            <p className={cn("text-2xl font-bold mt-1", totalGain >= 0 ? "text-emerald-400" : "text-red-400")}>
              {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Return</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={cn("text-2xl font-bold", totalReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(1)}%
              </p>
              {totalReturn >= 0 ? (
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
              <TabsTrigger value="equity">Equities</TabsTrigger>
              <TabsTrigger value="realestate">Real Estate</TabsTrigger>
              <TabsTrigger value="fixed">Fixed Income</TabsTrigger>
              <TabsTrigger value="private">Private Equity</TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              {filteredHoldings.map((holding) => {
                const Icon = typeIcons[holding.type as keyof typeof typeIcons] || Briefcase
                const gain = holding.value - holding.costBasis
                const isPositive = gain >= 0

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
                          {holding.ticker && (
                            <Badge variant="outline" className="text-xs">{holding.ticker}</Badge>
                          )}
                          <span className="text-xs text-zinc-500">
                            {typeLabels[holding.type as keyof typeof typeLabels]}
                          </span>
                          {holding.shares && (
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
                          {isPositive ? "+" : ""}{holding.return}%
                        </span>
                        <span className={cn("text-xs", isPositive ? "text-emerald-400/70" : "text-red-400/70")}>
                          ({isPositive ? "+" : ""}{formatCurrency(gain)})
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
