"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Bell,
  Briefcase,
  FileText,
  Target,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  NetWorthChart,
  AllocationChart,
  PerformanceChart,
} from "@/components/dashboard/charts"

const portfolioValue = 2450000
const monthlyChange = 48500
const monthlyChangePercent = 2.0
const ytdReturn = 12.8

const netWorthData = [
  { month: "Jan", assets: 2150000, liabilities: 120000, netWorth: 2030000 },
  { month: "Feb", assets: 2180000, liabilities: 118000, netWorth: 2062000 },
  { month: "Mar", assets: 2220000, liabilities: 115000, netWorth: 2105000 },
  { month: "Apr", assets: 2280000, liabilities: 112000, netWorth: 2168000 },
  { month: "May", assets: 2350000, liabilities: 110000, netWorth: 2240000 },
  { month: "Jun", assets: 2400000, liabilities: 108000, netWorth: 2292000 },
  { month: "Jul", assets: 2380000, liabilities: 105000, netWorth: 2275000 },
  { month: "Aug", assets: 2420000, liabilities: 102000, netWorth: 2318000 },
  { month: "Sep", assets: 2480000, liabilities: 100000, netWorth: 2380000 },
  { month: "Oct", assets: 2520000, liabilities: 98000, netWorth: 2422000 },
  { month: "Nov", assets: 2550000, liabilities: 95000, netWorth: 2455000 },
  { month: "Dec", assets: 2570000, liabilities: 92000, netWorth: 2478000 },
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

const allocationData = [
  { name: "Equities", value: 980000, color: "#0FBFBF" },
  { name: "Real Estate", value: 735000, color: "#06b6d4" },
  { name: "Fixed Income", value: 367500, color: "#8b5cf6" },
  { name: "Private Equity", value: 245000, color: "#f59e0b" },
  { name: "Cash & Equiv.", value: 122500, color: "#10b981" },
]

const recentActivity = [
  { id: 1, type: "dividend", description: "Dividend received from VTI", amount: 1250, date: "2024-01-15" },
  { id: 2, type: "document", description: "Q4 Statement uploaded", date: "2024-01-12" },
  { id: 3, type: "transfer", description: "Monthly contribution", amount: 5000, date: "2024-01-10" },
  { id: 4, type: "report", description: "Annual Tax Report ready", date: "2024-01-08" },
  { id: 5, type: "valuation", description: "Property valuation updated", amount: 45000, date: "2024-01-05" },
]

const upcomingEvents = [
  { id: 1, title: "Quarterly Review Meeting", date: "2024-01-25", type: "meeting" },
  { id: 2, title: "Tax Documents Due", date: "2024-02-15", type: "deadline" },
  { id: 3, title: "Dividend Payment - AAPL", date: "2024-02-08", type: "payment" },
]

const goals = [
  { name: "Retirement Fund", current: 1250000, target: 3000000, color: "#0FBFBF" },
  { name: "Real Estate Portfolio", current: 735000, target: 1500000, color: "#06b6d4" },
  { name: "Emergency Fund", current: 85000, target: 100000, color: "#8b5cf6" },
]

export default function DemoClientDashboardPage() {
  const reducedMotion = useReducedMotion()
  const today = new Date()

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

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <animated.div style={headerSpring}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Welcome back, John</h1>
            <p className="text-zinc-400 flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {format(today, "EEEE, MMMM d, yyyy")}
              <span className="text-zinc-600">•</span>
              Last updated just now
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              2 Alerts
            </Button>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" />
              View Statements
            </Button>
          </div>
        </div>
      </animated.div>

      <animated.div style={contentSpring} className="space-y-8">
        {/* Portfolio Summary */}
        <Card className="overflow-hidden border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
          <CardContent className="p-6">
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2">
                <p className="text-sm font-medium text-zinc-400 mb-1">Total Portfolio Value</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-zinc-100">{formatCurrency(portfolioValue)}</span>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-lg font-semibold">+{monthlyChangePercent}%</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-500 mt-2">
                  <span className="text-emerald-400">+{formatCurrency(monthlyChange)}</span> this month
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">YTD Return</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-emerald-400">+{ytdReturn}%</span>
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-xs text-zinc-500 mt-1">vs Benchmark: +10.2%</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Net Worth</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-zinc-100">{formatCurrency(2478000)}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  <span className="text-emerald-400">+$56K</span> from last month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <NetWorthChart data={netWorthData} />
          <PerformanceChart data={performanceData} />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <AllocationChart
                data={allocationData}
                title="Asset Allocation"
                description="Portfolio distribution by asset class"
              />

              {/* Goals Progress */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Financial Goals</CardTitle>
                      <CardDescription>Progress towards your targets</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/demo/client/goals">
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goals.map((goal) => {
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
                            style={{ width: `${progress}%`, backgroundColor: goal.color }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{progress.toFixed(0)}% complete</p>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-800">
                          {activity.type === "dividend" && <TrendingUp className="h-4 w-4 text-emerald-400" />}
                          {activity.type === "document" && <FileText className="h-4 w-4 text-blue-400" />}
                          {activity.type === "transfer" && <ArrowUpRight className="h-4 w-4 text-tiffany-500" />}
                          {activity.type === "report" && <FileText className="h-4 w-4 text-purple-400" />}
                          {activity.type === "valuation" && <Briefcase className="h-4 w-4 text-amber-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{activity.description}</p>
                          <p className="text-xs text-zinc-500">{format(new Date(activity.date), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                      {activity.amount && (
                        <span className="text-sm font-medium text-emerald-400">
                          +{formatCurrency(activity.amount)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
                    <div className="p-2 rounded-lg bg-zinc-700">
                      <Calendar className="h-4 w-4 text-tiffany-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{event.title}</p>
                      <p className="text-xs text-zinc-500">{format(new Date(event.date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/demo/client/vault">
                    <FileText className="h-4 w-4 mr-2" />
                    View Documents
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/demo/client/reports">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Download Reports
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/demo/client/messages">
                    <Bell className="h-4 w-4 mr-2" />
                    Contact Advisor
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/demo/client/goals">
                    <Target className="h-4 w-4 mr-2" />
                    Update Goals
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Advisor Contact */}
            <Card className="border-tiffany-500/20 bg-tiffany-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-tiffany-500/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-tiffany-500">SA</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Sarah Anderson</p>
                    <p className="text-xs text-zinc-400">Your Wealth Advisor</p>
                  </div>
                </div>
                <Button size="sm" className="w-full mt-4">
                  Schedule Meeting
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </animated.div>
    </div>
  )
}
