"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Bell,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KPICard } from "@/components/dashboard/kpi-card"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { AlertsPanel } from "@/components/dashboard/alerts-panel"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { TasksPanel } from "@/components/dashboard/tasks-panel"
import { ComplianceWidget } from "@/components/dashboard/compliance-widget"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  NetWorthChart,
  ROIChart,
  CashFlowChart,
  InvestmentReturnsChart,
  AllocationChart as AllocationPieChart,
} from "@/components/dashboard/charts"
import type { KPIData, LedgerActionType } from "@/lib/types/mock"
import type { AllocationSlice, ActivityEvent } from "@/lib/actions/dashboard.actions"

// ─── Static chart data (will be replaced with real data in a future branch) ──

const netWorthData = [
  { month: "Jan", assets: 2850000, liabilities: 420000, netWorth: 2430000 },
  { month: "Feb", assets: 2920000, liabilities: 415000, netWorth: 2505000 },
  { month: "Mar", assets: 2890000, liabilities: 410000, netWorth: 2480000 },
  { month: "Apr", assets: 3050000, liabilities: 405000, netWorth: 2645000 },
  { month: "May", assets: 3180000, liabilities: 398000, netWorth: 2782000 },
  { month: "Jun", assets: 3250000, liabilities: 392000, netWorth: 2858000 },
  { month: "Jul", assets: 3320000, liabilities: 385000, netWorth: 2935000 },
  { month: "Aug", assets: 3280000, liabilities: 378000, netWorth: 2902000 },
  { month: "Sep", assets: 3450000, liabilities: 370000, netWorth: 3080000 },
  { month: "Oct", assets: 3520000, liabilities: 362000, netWorth: 3158000 },
  { month: "Nov", assets: 3680000, liabilities: 355000, netWorth: 3325000 },
  { month: "Dec", assets: 3750000, liabilities: 348000, netWorth: 3402000 },
]

const roiData = [
  { name: "Real Estate", roi: 24.5, invested: 1200000, currentValue: 1494000 },
  { name: "Public Equities", roi: 18.2, invested: 850000, currentValue: 1004700 },
  { name: "Private Equity", roi: 32.8, invested: 500000, currentValue: 664000 },
  { name: "Fixed Income", roi: 5.2, invested: 400000, currentValue: 420800 },
  { name: "Crypto Assets", roi: -8.4, invested: 150000, currentValue: 137400 },
  { name: "Commodities", roi: 12.1, invested: 200000, currentValue: 224200 },
]

const cashFlowData = [
  { month: "Jan", inflow: 125000, outflow: 82000, net: 43000 },
  { month: "Feb", inflow: 118000, outflow: 78000, net: 40000 },
  { month: "Mar", inflow: 135000, outflow: 95000, net: 40000 },
  { month: "Apr", inflow: 142000, outflow: 88000, net: 54000 },
  { month: "May", inflow: 128000, outflow: 75000, net: 53000 },
  { month: "Jun", inflow: 155000, outflow: 92000, net: 63000 },
  { month: "Jul", inflow: 148000, outflow: 85000, net: 63000 },
  { month: "Aug", inflow: 132000, outflow: 89000, net: 43000 },
  { month: "Sep", inflow: 165000, outflow: 98000, net: 67000 },
  { month: "Oct", inflow: 158000, outflow: 94000, net: 64000 },
  { month: "Nov", inflow: 172000, outflow: 102000, net: 70000 },
  { month: "Dec", inflow: 185000, outflow: 110000, net: 75000 },
]

const investmentReturnsData = [
  { period: "1M", return: 2.4 },
  { period: "3M", return: 5.8 },
  { period: "6M", return: 8.2 },
  { period: "YTD", return: 14.6 },
  { period: "1Y", return: 18.3 },
  { period: "3Y", return: 42.5 },
]

const financialGoals = [
  { name: "Emergency Fund", current: 85000, target: 100000, color: "#14b8a6" },
  { name: "Retirement", current: 1250000, target: 3000000, color: "#06b6d4" },
  { name: "Real Estate Portfolio", current: 1500000, target: 2500000, color: "#8b5cf6" },
  { name: "Children's Education", current: 120000, target: 400000, color: "#f59e0b" },
]

const topPerformers = [
  { name: "Series B - FinTech Startup", return: 45.2, value: 290400 },
  { name: "Manhattan Penthouse", return: 28.5, value: 1092250 },
  { name: "Tech Growth Fund", return: 22.3, value: 428050 },
]

// ─── Ledger → ActivityFeed mapping ────────────────────────────────────────────

function mapLedgerAction(action: string): LedgerActionType {
  const map: Record<string, LedgerActionType> = {
    created: "asset_created",
    updated: "asset_updated",
    deleted: "asset_updated",
    archived: "asset_updated",
    document_uploaded: "document_uploaded",
    document_verified: "document_verified",
    document_expired: "document_expired",
    document_downloaded: "document_uploaded",
    asset_valued: "valuation_updated",
    asset_transferred: "asset_sold",
    asset_sold: "asset_sold",
    login: "user_login",
    logout: "user_login",
    permission_changed: "permission_changed",
    report_generated: "report_generated",
    report_shared: "report_generated",
    compliance_reviewed: "compliance_check",
    compliance_approved: "compliance_check",
  }
  return map[action] ?? "asset_updated"
}

function describeAction(action: string, targetType: string): string {
  const verbs: Record<string, string> = {
    created: "created",
    updated: "updated",
    deleted: "deleted",
    archived: "archived",
    document_uploaded: "uploaded a document for",
    document_verified: "verified a document for",
    document_expired: "document expired for",
    document_downloaded: "downloaded a document from",
    asset_valued: "updated valuation for",
    asset_transferred: "transferred",
    asset_sold: "marked as sold",
    login: "logged in",
    logout: "logged out",
    permission_changed: "changed permissions on",
    report_generated: "generated a report for",
    report_shared: "shared a report from",
    compliance_reviewed: "reviewed compliance for",
    compliance_approved: "approved compliance for",
  }
  const verb = verbs[action] ?? action.replace(/_/g, " ")
  return `${verb} ${targetType}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardOverviewClientProps {
  userName: string
  clientCount: number
  totalAUM: number
  assetCount: number
  kpis: KPIData[]
  allocation?: AllocationSlice[]
  activity?: ActivityEvent[]
  complianceStats?: {
    score: number
    active: number
    verified: number
    overdue: number
    byFramework: Record<string, { total: number; verified: number }>
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardOverviewClient({
  userName,
  clientCount,
  totalAUM,
  kpis,
  allocation = [],
  activity = [],
  complianceStats,
}: DashboardOverviewClientProps) {
  const reducedMotion = useReducedMotion()
  const today = new Date()

  // Use real allocation data from server, fall back to static sample
  const portfolioAllocation = allocation.length > 0
    ? allocation
    : [
        { name: "Real Estate", value: 1494000, color: "#14b8a6" },
        { name: "Public Equities", value: 1004700, color: "#06b6d4" },
        { name: "Private Equity", value: 664000, color: "#8b5cf6" },
        { name: "Fixed Income", value: 420800, color: "#f59e0b" },
        { name: "Commodities", value: 224200, color: "#10b981" },
        { name: "Crypto", value: 137400, color: "#ec4899" },
      ]

  const headerSpring = useSpring({
    from: { opacity: 0, transform: "translateY(-10px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const contentSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    delay: 100,
    config: config.gentle,
    immediate: reducedMotion,
  })

  const monthlyChangePercent = 6.6
  const monthlyChange = Math.round(totalAUM * 0.066)

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <animated.div style={headerSpring}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-zinc-100">
                Welcome back, {userName}
              </h1>
              <Badge variant="outline" className="text-tiffany-500 border-tiffany-500/30">
                {clientCount} {clientCount === 1 ? "Client" : "Clients"}
              </Badge>
            </div>
            <p className="text-zinc-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(today, "EEEE, MMMM d, yyyy")}
              <span className="text-zinc-600">•</span>
              Last updated just now
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </Button>
            <Button size="sm">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Quick Transfer
            </Button>
          </div>
        </div>
      </animated.div>

      <animated.div style={contentSpring} className="space-y-8">
        {/* Portfolio Summary Hero */}
        <Card className="overflow-hidden border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
          <CardContent className="p-6">
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Total AUM */}
              <div className="lg:col-span-2">
                <p className="text-sm font-medium text-zinc-400 mb-1">Total Assets Under Management</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-zinc-100">
                    {formatCurrency(totalAUM)}
                  </span>
                  {totalAUM > 0 && (
                    <div className="flex items-center gap-1 text-emerald-400">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-lg font-semibold">+{monthlyChangePercent}%</span>
                    </div>
                  )}
                </div>
                {totalAUM > 0 ? (
                  <p className="text-sm text-zinc-500 mt-2">
                    <span className="text-emerald-400">+{formatCurrency(monthlyChange)}</span> this month
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500 mt-2">
                    Add your first asset to start tracking AUM
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">YTD Return</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-emerald-400">+14.6%</span>
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-xs text-zinc-500 mt-1">vs S&P 500: +11.2%</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Active Clients</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-zinc-100">{clientCount}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {clientCount === 0 ? "No clients yet" : `${clientCount} client${clientCount === 1 ? "" : "s"} managed`}
                </p>
              </div>
            </div>

            {/* Top Performers Row */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Top Performers</p>
              <div className="grid md:grid-cols-3 gap-4">
                {topPerformers.map((asset, i) => (
                  <div
                    key={asset.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-400/10 text-emerald-400 text-sm font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200 truncate max-w-[140px]">{asset.name}</p>
                        <p className="text-xs text-zinc-500">{formatCurrency(asset.value)}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-400/10 text-emerald-400 border-0">
                      +{asset.return}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
              <KPICard key={kpi.label} data={kpi} index={index} />
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Performance Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NetWorthChart data={netWorthData} />
            <ROIChart data={roiData} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Portfolio Performance</h2>
              <PerformanceChart />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">Cash Flow Analysis</h2>
              <CashFlowChart data={cashFlowData} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100 mb-4">Asset Allocation</h2>
                <AllocationPieChart
                  data={portfolioAllocation}
                  title="Portfolio Distribution"
                  description="Allocation by asset class"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100 mb-4">Alerts & Notifications</h2>
                <AlertsPanel />
              </div>
            </div>
          </div>

          {/* Right Column - Tabbed Sidebar */}
          <div className="space-y-6">
            {complianceStats && (
              <ComplianceWidget
                score={complianceStats.score}
                active={complianceStats.active}
                verified={complianceStats.verified}
                overdue={complianceStats.overdue}
                byFramework={complianceStats.byFramework}
              />
            )}

            <InvestmentReturnsChart data={investmentReturnsData} />

            <Card>
              <Tabs defaultValue="goals" className="w-full">
                <CardHeader className="pb-3">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="goals" className="text-xs">Goals</TabsTrigger>
                    <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
                    <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-0">
                  <TabsContent value="goals" className="mt-0">
                    <div className="space-y-4">
                      {financialGoals.map((goal) => {
                        const progress = Math.min((goal.current / goal.target) * 100, 100)
                        return (
                          <div key={goal.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-zinc-400">{goal.name}</span>
                              <span className="text-zinc-100">
                                {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                              </span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: goal.color,
                                }}
                              />
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">{progress.toFixed(0)}% complete</p>
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>
                  <TabsContent value="actions" className="mt-0">
                    <QuickActions />
                  </TabsContent>
                  <TabsContent value="tasks" className="mt-0">
                    <TasksPanel />
                  </TabsContent>
                  <TabsContent value="activity" className="mt-0">
                    <ActivityFeed activities={activity.map((e) => ({
                      id: e.id,
                      type: mapLedgerAction(e.action),
                      user: e.actorName ?? "System",
                      description: describeAction(e.action, e.targetType),
                      entityName: (e.payload as Record<string, unknown>)?.name as string ?? e.targetType,
                      timestamp: e.createdAt,
                    }))} />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </animated.div>
    </div>
  )
}
