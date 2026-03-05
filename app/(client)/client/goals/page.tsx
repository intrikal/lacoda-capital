/**
 * @file app/(client)/client/goals/page.tsx
 *
 * Client-facing financial goals tracking page.
 *
 * Data source: `useGoals` hook (lib/hooks/crud/use-goals.ts) which calls
 * goalsService.getGoals() and exposes CRUD helpers (addGoal, updateGoal,
 * deleteGoal). Aggregate stats (totalTargetAmount, totalCurrentAmount,
 * overallProgress, totalMonthlyContribution) are pre-computed inside the hook
 * and consumed directly via `stats.*`.
 *
 * The "Add New Goal" button opens `GoalFormDialog` in create mode. On submit,
 * `addGoal(data)` is called which appends the new goal to the in-memory list.
 *
 * tRPC swap path:
 *   Replace `useGoals` internals with:
 *   `const { data: goals }     = trpc.client.goals.list.useQuery()`
 *   `const addGoal             = trpc.client.goals.create.useMutation()`
 *   `const deleteGoal          = trpc.client.goals.delete.useMutation()`
 *   The consuming component needs zero changes — the hook's return shape is
 *   identical to what tRPC will return.
 */
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
import { useGoals, useCreateGoal } from "@/lib/hooks/crud/use-goals"
import type { GoalRecord } from "@/lib/hooks/crud/use-goals"
import { GoalFormDialog } from "@/components/forms/goal-form-dialog"
import type { CreateGoalInput } from "@/lib/validations/goal.schema"

// ─────────────────────────────────────────────────────────────────────────────
// Category → visual config mapping (replaces inline icon/color on mock objects)
// ─────────────────────────────────────────────────────────────────────────────

type GoalCategory = GoalRecord["category"]

const categoryConfig: Record<GoalCategory, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  retirement: { icon: Shield, color: "#14b8a6" },
  realestate: { icon: Home, color: "#06b6d4" },
  emergency:  { icon: Briefcase, color: "#8b5cf6" },
  education:  { icon: GraduationCap, color: "#f59e0b" },
  travel:     { icon: Plane, color: "#ec4899" },
  vehicle:    { icon: Briefcase, color: "#10b981" },
  investment: { icon: TrendingUp, color: "#3b82f6" },
  custom:     { icon: Target, color: "#6366f1" },
}

const priorityConfig = {
  high:   { label: "High Priority",   color: "text-rose-400",  bg: "bg-rose-400/10" },
  medium: { label: "Medium Priority", color: "text-amber-400", bg: "bg-amber-400/10" },
  low:    { label: "Low Priority",    color: "text-zinc-400",  bg: "bg-zinc-400/10" },
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

  // Hook: replaces the inline goals array + manually computed totals
  const { goals, stats } = useGoals()
  const createMutation = useCreateGoal()

  // Form dialog state for creating a new goal
  const [formOpen, setFormOpen] = React.useState(false)

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

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
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Goal
        </Button>
      </div>

      {/* Summary Cards — driven by stats from hook */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Progress</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.overallProgress.toFixed(1)}%</p>
            <Progress value={stats.overallProgress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Current Value</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.totalCurrentAmount)}</p>
            <p className="text-xs text-zinc-500 mt-1">across all goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Target Value</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(stats.totalTargetAmount)}</p>
            <p className="text-xs text-zinc-500 mt-1">combined target</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Monthly Savings</p>
            <p className="text-2xl font-bold text-tiffany-500 mt-1">{formatCurrency(stats.totalMonthlyContribution)}</p>
            <p className="text-xs text-zinc-500 mt-1">total contributions</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
          const remaining = goal.targetAmount - goal.currentAmount
          const yearsLeft = getYearsRemaining(goal.targetDate)
          const priority = priorityConfig[goal.priority as keyof typeof priorityConfig]
          const { icon: Icon, color } = categoryConfig[goal.category as GoalCategory] ?? categoryConfig.custom

          return (
            <Card key={goal.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Left Section - Icon and Info */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="h-6 w-6" style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-zinc-100">{goal.name}</h3>
                          <Badge variant="outline" className={cn("text-xs", priority.color, priority.bg)}>
                            {priority.label}
                          </Badge>
                        </div>
                        {goal.notes && (
                          <p className="text-sm text-zinc-400 mb-4">{goal.notes}</p>
                        )}

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
                                backgroundColor: color,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{formatCurrency(goal.currentAmount)}</span>
                            <span>{formatCurrency(goal.targetAmount)}</span>
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

      {/* Create Goal Dialog */}
      <GoalFormDialog
        mode="create"
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(data) => createMutation.mutate(data as CreateGoalInput)}
        isPending={createMutation.isPending}
      />
    </animated.div>
  )
}
