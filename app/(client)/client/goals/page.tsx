"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Target,
  TrendingUp,
  Home,
  Briefcase,
  GraduationCap,
  Plane,
  Shield,
  Plus,
  ChevronRight,
  Calendar,
  DollarSign,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn, formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// Client's financial goals
const goals = [
  {
    id: "1",
    name: "Retirement Fund",
    description: "Build a comfortable retirement nest egg",
    icon: Shield,
    current: 1250000,
    target: 3000000,
    targetDate: "2040-01-01",
    monthlyContribution: 8500,
    color: "#14b8a6",
    priority: "high",
  },
  {
    id: "2",
    name: "Real Estate Portfolio",
    description: "Expand property investments",
    icon: Home,
    current: 735000,
    target: 1500000,
    targetDate: "2028-06-01",
    monthlyContribution: 5000,
    color: "#06b6d4",
    priority: "high",
  },
  {
    id: "3",
    name: "Emergency Fund",
    description: "6 months of living expenses",
    icon: Briefcase,
    current: 85000,
    target: 100000,
    targetDate: "2024-12-31",
    monthlyContribution: 2500,
    color: "#8b5cf6",
    priority: "medium",
  },
  {
    id: "4",
    name: "Children's Education",
    description: "College fund for kids",
    icon: GraduationCap,
    current: 180000,
    target: 400000,
    targetDate: "2032-09-01",
    monthlyContribution: 3000,
    color: "#f59e0b",
    priority: "high",
  },
  {
    id: "5",
    name: "Dream Vacation Home",
    description: "Beach property in Florida",
    icon: Plane,
    current: 120000,
    target: 500000,
    targetDate: "2030-01-01",
    monthlyContribution: 2000,
    color: "#ec4899",
    priority: "low",
  },
]

const priorityConfig = {
  high: { label: "High Priority", color: "text-rose-400", bg: "bg-rose-400/10" },
  medium: { label: "Medium Priority", color: "text-amber-400", bg: "bg-amber-400/10" },
  low: { label: "Low Priority", color: "text-zinc-400", bg: "bg-zinc-400/10" },
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

function getYearsRemaining(targetDate: string) {
  const now = new Date()
  const target = new Date(targetDate)
  const years = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)
  return Math.max(0, Math.round(years * 10) / 10)
}

export default function ClientGoalsPage() {
  const reducedMotion = useReducedMotion()

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  // Calculate totals
  const totalCurrent = goals.reduce((sum, g) => sum + g.current, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const totalProgress = (totalCurrent / totalTarget) * 100
  const totalMonthly = goals.reduce((sum, g) => sum + g.monthlyContribution, 0)

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Financial Goals</h1>
          <p className="text-zinc-400 mt-1">
            Track progress towards your financial objectives
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Goal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Progress</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{totalProgress.toFixed(1)}%</p>
            <Progress value={totalProgress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Current Value</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(totalCurrent)}</p>
            <p className="text-xs text-zinc-500 mt-1">across all goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Target Value</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(totalTarget)}</p>
            <p className="text-xs text-zinc-500 mt-1">combined target</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Monthly Savings</p>
            <p className="text-2xl font-bold text-tiffany-500 mt-1">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-zinc-500 mt-1">total contributions</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = Math.min((goal.current / goal.target) * 100, 100)
          const remaining = goal.target - goal.current
          const yearsLeft = getYearsRemaining(goal.targetDate)
          const priority = priorityConfig[goal.priority as keyof typeof priorityConfig]
          const Icon = goal.icon

          return (
            <Card key={goal.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Left Section - Icon and Info */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        <Icon className="h-6 w-6" style={{ color: goal.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-zinc-100">{goal.name}</h3>
                          <Badge variant="outline" className={cn("text-xs", priority.color, priority.bg)}>
                            {priority.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-400 mb-4">{goal.description}</p>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">Progress</span>
                            <span className="font-medium text-zinc-100">{progress.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: goal.color,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{formatCurrency(goal.current)}</span>
                            <span>{formatCurrency(goal.target)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Stats */}
                  <div className="border-t lg:border-t-0 lg:border-l border-zinc-800 p-6 lg:w-72 bg-zinc-900/50">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-800">
                          <DollarSign className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Remaining</p>
                          <p className="text-sm font-medium text-zinc-100">{formatCurrency(remaining)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-800">
                          <TrendingUp className="h-4 w-4 text-tiffany-500" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Monthly</p>
                          <p className="text-sm font-medium text-zinc-100">{formatCurrency(goal.monthlyContribution)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-800">
                          <Calendar className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Target Date</p>
                          <p className="text-sm font-medium text-zinc-100">{formatDate(goal.targetDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-800">
                          <Target className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Time Left</p>
                          <p className="text-sm font-medium text-zinc-100">{yearsLeft} years</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Advisor Tip */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-tiffany-500/20">
              <Target className="h-5 w-5 text-tiffany-500" />
            </div>
            <div>
              <p className="font-medium text-zinc-100">On Track for Success</p>
              <p className="text-sm text-zinc-400 mt-1">
                Based on your current contribution rate and market conditions, you're on track to meet
                4 out of 5 goals. Consider increasing your monthly contribution to the Dream Vacation Home
                goal to stay on schedule.
              </p>
              <Button variant="link" className="text-tiffany-500 p-0 h-auto mt-2">
                Schedule a review with your advisor
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
