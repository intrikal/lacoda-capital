"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  PerformanceChart,
  ROIChart,
  AllocationChart,
} from "@/components/dashboard/charts"

// Portfolio vs Major Indices
const portfolioVsIndicesData = [
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

const portfolioVsNasdaqData = [
  { month: "Jan", portfolio: 0, benchmark: 0 },
  { month: "Feb", portfolio: 2.4, benchmark: 3.2 },
  { month: "Mar", portfolio: 4.1, benchmark: 5.8 },
  { month: "Apr", portfolio: 5.8, benchmark: 7.2 },
  { month: "May", portfolio: 8.2, benchmark: 9.5 },
  { month: "Jun", portfolio: 10.1, benchmark: 11.8 },
  { month: "Jul", portfolio: 12.5, benchmark: 14.2 },
  { month: "Aug", portfolio: 11.8, benchmark: 12.5 },
  { month: "Sep", portfolio: 14.2, benchmark: 15.8 },
  { month: "Oct", portfolio: 16.1, benchmark: 18.2 },
  { month: "Nov", portfolio: 18.4, benchmark: 21.5 },
  { month: "Dec", portfolio: 19.6, benchmark: 24.2 },
]

// Asset class performance comparison
const assetClassPerformance = [
  { name: "Real Estate", roi: 24.5, invested: 1200000, currentValue: 1494000 },
  { name: "S&P 500 ETF", roi: 13.2, invested: 500000, currentValue: 566000 },
  { name: "Private Equity", roi: 32.8, invested: 500000, currentValue: 664000 },
  { name: "NASDAQ ETF", roi: 24.2, invested: 350000, currentValue: 434700 },
  { name: "Int'l Developed", roi: 8.5, invested: 250000, currentValue: 271250 },
  { name: "Emerging Markets", roi: -2.4, invested: 150000, currentValue: 146400 },
]

// Sector allocation comparison
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

// Benchmark comparison metrics
const benchmarkMetrics = [
  {
    name: "S&P 500",
    ytdReturn: 13.2,
    portfolioYtd: 19.6,
    alpha: 6.4,
    beta: 0.85,
    sharpe: 1.42,
    volatility: 12.8,
  },
  {
    name: "NASDAQ",
    ytdReturn: 24.2,
    portfolioYtd: 19.6,
    alpha: -4.6,
    beta: 0.72,
    sharpe: 1.38,
    volatility: 18.5,
  },
  {
    name: "Russell 2000",
    ytdReturn: 8.5,
    portfolioYtd: 19.6,
    alpha: 11.1,
    beta: 0.65,
    sharpe: 1.52,
    volatility: 15.2,
  },
  {
    name: "MSCI EAFE",
    ytdReturn: 6.2,
    portfolioYtd: 19.6,
    alpha: 13.4,
    beta: 0.58,
    sharpe: 1.65,
    volatility: 11.4,
  },
]

// Risk metrics over time
const riskMetricsData = [
  { month: "Jan", portfolio: 0.92, benchmark: 1.0 },
  { month: "Feb", portfolio: 0.88, benchmark: 1.0 },
  { month: "Mar", portfolio: 0.85, benchmark: 1.0 },
  { month: "Apr", portfolio: 0.87, benchmark: 1.0 },
  { month: "May", portfolio: 0.84, benchmark: 1.0 },
  { month: "Jun", portfolio: 0.82, benchmark: 1.0 },
  { month: "Jul", portfolio: 0.85, benchmark: 1.0 },
  { month: "Aug", portfolio: 0.88, benchmark: 1.0 },
  { month: "Sep", portfolio: 0.86, benchmark: 1.0 },
  { month: "Oct", portfolio: 0.84, benchmark: 1.0 },
  { month: "Nov", portfolio: 0.82, benchmark: 1.0 },
  { month: "Dec", portfolio: 0.85, benchmark: 1.0 },
]

export default function BenchmarksPage() {
  const [selectedBenchmark, setSelectedBenchmark] = React.useState("sp500")
  const [timeframe, setTimeframe] = React.useState("1y")
  const reducedMotion = useReducedMotion()

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const getChartData = () => {
    switch (selectedBenchmark) {
      case "nasdaq":
        return portfolioVsNasdaqData
      default:
        return portfolioVsIndicesData
    }
  }

  const getBenchmarkLabel = () => {
    switch (selectedBenchmark) {
      case "nasdaq":
        return "NASDAQ"
      case "russell":
        return "Russell 2000"
      case "msci":
        return "MSCI EAFE"
      default:
        return "S&P 500"
    }
  }

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Benchmarks</h1>
          <p className="text-zinc-400 mt-1">
            Compare portfolio performance against market indices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="3y">3 Years</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Benchmark" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sp500">S&P 500</SelectItem>
              <SelectItem value="nasdaq">NASDAQ</SelectItem>
              <SelectItem value="russell">Russell 2000</SelectItem>
              <SelectItem value="msci">MSCI EAFE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Portfolio YTD</p>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-2">+19.6%</p>
            <p className="text-xs text-zinc-500 mt-1">vs {getBenchmarkLabel()}: +{selectedBenchmark === "nasdaq" ? "24.2" : "13.2"}%</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Alpha</p>
              <Target className="h-4 w-4 text-tiffany-500" />
            </div>
            <p className={cn(
              "text-2xl font-bold mt-2",
              selectedBenchmark === "nasdaq" ? "text-red-400" : "text-emerald-400"
            )}>
              {selectedBenchmark === "nasdaq" ? "-4.6%" : "+6.4%"}
            </p>
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

      {/* Main Performance Chart */}
      <PerformanceChart
        data={getChartData()}
        className="h-[400px]"
      />

      {/* Tabbed Analysis */}
      <Tabs defaultValue="returns" className="w-full">
        <TabsList>
          <TabsTrigger value="returns">Asset Returns</TabsTrigger>
          <TabsTrigger value="allocation">Sector Allocation</TabsTrigger>
          <TabsTrigger value="metrics">Risk Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="mt-6">
          <ROIChart data={assetClassPerformance} />
        </TabsContent>

        <TabsContent value="allocation" className="mt-6">
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
        </TabsContent>

        <TabsContent value="metrics" className="mt-6 space-y-6">
          <PerformanceChart data={riskMetricsData} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benchmark Comparison Table</CardTitle>
              <CardDescription>Key metrics across major indices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Index</th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">Index YTD</th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">Portfolio YTD</th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">Alpha</th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">Beta</th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">Sharpe</th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">Volatility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkMetrics.map((metric) => (
                      <tr key={metric.name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 px-4 font-medium text-zinc-100">{metric.name}</td>
                        <td className="py-3 px-4 text-right text-zinc-300">
                          +{metric.ytdReturn}%
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400">
                          +{metric.portfolioYtd}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "flex items-center justify-end gap-1",
                            metric.alpha >= 0 ? "text-emerald-400" : "text-red-400"
                          )}>
                            {metric.alpha >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {metric.alpha >= 0 ? "+" : ""}{metric.alpha}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">{metric.beta}</td>
                        <td className="py-3 px-4 text-right text-zinc-300">{metric.sharpe}</td>
                        <td className="py-3 px-4 text-right text-zinc-300">{metric.volatility}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-tiffany-500/10">
              <TrendingUp className="h-5 w-5 text-tiffany-500" />
            </div>
            <div>
              <p className="font-medium text-zinc-100">Portfolio Insights</p>
              <p className="text-sm text-zinc-400 mt-1">
                Your portfolio is outperforming the S&P 500 by 6.4% YTD with 15% lower volatility.
                The strong alpha generation is driven by real estate and private equity allocations,
                which have provided excellent risk-adjusted returns. Consider maintaining current
                sector weights while monitoring tech exposure relative to NASDAQ.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
