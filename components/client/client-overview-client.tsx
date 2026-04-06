"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  TrendingUp,
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
import { AllocationChart } from "@/components/dashboard/charts"

interface AllocationSlice {
  name: string
  value: number
  color: string
}

interface GoalData {
  name: string
  current: number
  target: number
  color: string
}

interface Props {
  userName: string
  portfolioValue: number
  allocationData: AllocationSlice[]
  goals: GoalData[]
}

export function ClientOverviewClient({ userName, portfolioValue, allocationData, goals }: Props) {
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
            <h1 className="text-2xl font-bold text-zinc-100">
              Welcome back, {userName}
            </h1>
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
              Alerts
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
              {/* Total Value */}
              <div className="lg:col-span-2">
                <p className="text-sm font-medium text-zinc-400 mb-1">Total Portfolio Value</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-zinc-100">
                    {formatCurrency(portfolioValue)}
                  </span>
                  {portfolioValue > 0 && (
                    <div className="flex items-center gap-1 text-emerald-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-zinc-500 mt-2">
                  As of {format(today, "MMMM d, yyyy")}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Active Holdings</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-zinc-100">{formatCurrency(portfolioValue)}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Across all entities</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Asset Classes</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-zinc-100">{allocationData.length}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Diversified holdings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Allocation & Goals */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {allocationData.length > 0 ? (
                <AllocationChart
                  data={allocationData}
                  title="Asset Allocation"
                  description="Portfolio distribution by asset class"
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Asset Allocation</CardTitle>
                    <CardDescription>Portfolio distribution by asset class</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center h-40 text-zinc-500 text-sm">
                    No assets on file
                  </CardContent>
                </Card>
              )}

              {/* Goals Progress */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Financial Goals</CardTitle>
                      <CardDescription>Progress towards your targets</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/client/goals">
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goals.length > 0 ? (
                    goals.map((goal) => {
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
                    })
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-4">No goals set yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Quick Actions & Advisor */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/client/documents">
                    <FileText className="h-4 w-4 mr-2" />
                    View Documents
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/client/reports">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Download Reports
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/client/messages">
                    <Bell className="h-4 w-4 mr-2" />
                    Contact Advisor
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/client/goals">
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
                    <span className="text-sm font-medium text-tiffany-500">WA</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Your Wealth Advisor</p>
                    <p className="text-xs text-zinc-400">Available to assist you</p>
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
