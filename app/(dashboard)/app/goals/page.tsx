"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, differenceInMonths } from "date-fns"
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  Home,
  GraduationCap,
  Umbrella,
  Plane,
  Car,
  Heart,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/lib/hooks/crud/use-goals"
import type { GoalRecord } from "@/lib/hooks/crud/use-goals"
import { GoalFormDialog } from "@/components/forms/goal-form-dialog"
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validations/goal.schema"
import { PerformanceChart } from "@/components/dashboard/charts"

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────

const goalCategoryConfig = {
  retirement: {
    label: "Retirement",
    icon: Umbrella,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
    chartColor: "#14b8a6",
  },
  education: {
    label: "Education",
    icon: GraduationCap,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    chartColor: "#8b5cf6",
  },
  realestate: {
    label: "Real Estate",
    icon: Home,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    chartColor: "#3b82f6",
  },
  emergency: {
    label: "Emergency Fund",
    icon: Heart,
    color: "text-red-400",
    bg: "bg-red-400/10",
    chartColor: "#ef4444",
  },
  travel: {
    label: "Travel",
    icon: Plane,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    chartColor: "#f59e0b",
  },
  vehicle: {
    label: "Vehicle",
    icon: Car,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    chartColor: "#06b6d4",
  },
  investment: {
    label: "Investment",
    icon: Briefcase,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    chartColor: "#10b981",
  },
  custom: {
    label: "Custom",
    icon: Target,
    color: "text-zinc-400",
    bg: "bg-zinc-400/10",
    chartColor: "#71717a",
  },
} as const

const statusConfig = {
  on_track: { label: "On Track",  color: "text-tiffany-500", bg: "bg-tiffany-500/10",  icon: CheckCircle2 },
  ahead:    { label: "Ahead",     color: "text-emerald-400", bg: "bg-emerald-400/10",  icon: ArrowUpRight },
  behind:   { label: "Behind",    color: "text-amber-400",   bg: "bg-amber-400/10",    icon: AlertCircle },
  completed:{ label: "Completed", color: "text-blue-400",    bg: "bg-blue-400/10",     icon: CheckCircle2 },
}

const priorityConfig = {
  high:   { label: "High",   color: "text-red-400" },
  medium: { label: "Medium", color: "text-amber-400" },
  low:    { label: "Low",    color: "text-zinc-400" },
}

// Wealth projection data (display-only chart)
const wealthProjectionData = [
  { month: "2024", portfolio: 3850000, benchmark: 3500000 },
  { month: "2026", portfolio: 4850000, benchmark: 4200000 },
  { month: "2028", portfolio: 6100000, benchmark: 5100000 },
  { month: "2030", portfolio: 7650000, benchmark: 6200000 },
  { month: "2032", portfolio: 9500000, benchmark: 7500000 },
  { month: "2034", portfolio: 11800000, benchmark: 9100000 },
  { month: "2036", portfolio: 14500000, benchmark: 11000000 },
  { month: "2038", portfolio: 17800000, benchmark: 13200000 },
  { month: "2040", portfolio: 21500000, benchmark: 15800000 },
]

// ─── GOAL CARD ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: GoalRecord
  onEdit: (goal: GoalRecord) => void
  onDelete: (goal: GoalRecord) => void
  onStatusChange: (id: string, status: GoalRecord["status"]) => void
}

function GoalCard({ goal, onEdit, onDelete, onStatusChange }: GoalCardProps) {
  const catConfig = goalCategoryConfig[goal.category] ?? goalCategoryConfig.custom
  const status = statusConfig[goal.status] ?? statusConfig.on_track
  const priority = priorityConfig[goal.priority] ?? priorityConfig.medium
  const CategoryIcon = catConfig.icon
  const StatusIcon = status.icon

  const progress = Math.min(
    goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
    100
  )

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", catConfig.bg)}>
              <CategoryIcon className={cn("h-5 w-5", catConfig.color)} />
            </div>
            <div>
              <p className="font-medium text-zinc-100">{goal.name}</p>
              <p className="text-xs text-zinc-500">{catConfig.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(status.bg, status.color, "border-0 text-xs")}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {goal.status !== "on_track" && (
                  <DropdownMenuItem onClick={() => onStatusChange(goal.id, "on_track")}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-tiffany-500" />
                    Mark On Track
                  </DropdownMenuItem>
                )}
                {goal.status !== "ahead" && (
                  <DropdownMenuItem onClick={() => onStatusChange(goal.id, "ahead")}>
                    <ArrowUpRight className="h-4 w-4 mr-2 text-emerald-400" />
                    Mark Ahead
                  </DropdownMenuItem>
                )}
                {goal.status !== "behind" && (
                  <DropdownMenuItem onClick={() => onStatusChange(goal.id, "behind")}>
                    <AlertCircle className="h-4 w-4 mr-2 text-amber-400" />
                    Mark Behind
                  </DropdownMenuItem>
                )}
                {goal.status !== "completed" && (
                  <DropdownMenuItem onClick={() => onStatusChange(goal.id, "completed")}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-blue-400" />
                    Mark Completed
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  className="text-rose-400 focus:text-rose-400"
                  onClick={() => onDelete(goal)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Progress</span>
            <span className="text-zinc-100">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: catConfig.chartColor }}
            />
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-zinc-500">Current</p>
            <p className="text-lg font-semibold text-zinc-100">
              {formatCurrency(goal.currentAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Target</p>
            <p className="text-lg font-semibold text-tiffany-500">
              {formatCurrency(goal.targetAmount)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(goal.targetDate), "MMM yyyy")}
          </span>
          <span className="text-zinc-500">
            {formatCurrency(goal.monthlyContribution)}/mo
          </span>
          <span className={priority.color}>{priority.label} Priority</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16">
      <Target className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
      <p className="text-zinc-400 font-medium mb-1">No goals yet</p>
      <p className="text-zinc-500 text-sm mb-6">
        Create your first financial goal to start tracking progress.
      </p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add Goal
      </Button>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { goals, isLoading, stats } = useGoals()
  const createMutation = useCreateGoal()
  const updateMutation = useUpdateGoal()
  const deleteMutation = useDeleteGoal()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<GoalRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<GoalRecord | null>(null)

  const reducedMotion = useReducedMotion()

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  function handleCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function handleEdit(goal: GoalRecord) {
    setEditTarget(goal)
    setDialogOpen(true)
  }

  function handleFormSubmit(data: CreateGoalInput | UpdateGoalInput) {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, input: data as UpdateGoalInput })
    } else {
      createMutation.mutate(data as CreateGoalInput)
    }
  }

  function handleStatusChange(id: string, status: GoalRecord["status"]) {
    updateMutation.mutate({ id, input: { status } })
  }

  const goalsOnTrack = goals.filter(
    (g) => g.status === "on_track" || g.status === "ahead"
  ).length
  const goalsBehind = goals.filter((g) => g.status === "behind").length

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Financial Goals</h1>
          <p className="text-zinc-400 mt-1">
            Track progress toward wealth targets and milestones
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Summary Hero */}
      <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <p className="text-sm font-medium text-zinc-400 mb-1">Total Goal Progress</p>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-4xl font-bold text-zinc-100">
                  {formatCurrency(stats.totalCurrentAmount)}
                </span>
                <span className="text-lg text-zinc-500">
                  of {formatCurrency(stats.totalTargetAmount)}
                </span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-tiffany-500 to-cyan-500 transition-all"
                  style={{ width: `${stats.overallProgress}%` }}
                />
              </div>
              <p className="text-sm text-zinc-400">
                {stats.overallProgress.toFixed(1)}% complete across {stats.total} goal
                {stats.total !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                Monthly Contributions
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(stats.totalMonthlyContribution)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {formatCurrency(stats.totalMonthlyContribution * 12)}/year
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                Goal Status
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">{goalsOnTrack}</span>
                <span className="text-zinc-400">on track</span>
              </div>
              {goalsBehind > 0 && (
                <p className="text-xs text-amber-400 mt-1">
                  {goalsBehind} need{goalsBehind === 1 ? "s" : ""} attention
                </p>
              )}
              {stats.completed > 0 && (
                <p className="text-xs text-blue-400 mt-1">
                  {stats.completed} completed
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wealth Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wealth Projection</CardTitle>
          <CardDescription>
            Projected portfolio growth based on current trajectory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceChart data={wealthProjectionData} />
        </CardContent>
      </Card>

      {/* Goals Tabs */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-zinc-800/50" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState onAdd={handleCreate} />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({goals.length})</TabsTrigger>
            <TabsTrigger value="high">
              High Priority ({goals.filter((g) => g.priority === "high").length})
            </TabsTrigger>
            <TabsTrigger value="retirement">Retirement</TabsTrigger>
            <TabsTrigger value="investment">Investment</TabsTrigger>
          </TabsList>

          {(
            [
              { value: "all", filter: () => true },
              { value: "high", filter: (g: GoalRecord) => g.priority === "high" },
              { value: "retirement", filter: (g: GoalRecord) => g.category === "retirement" },
              {
                value: "investment",
                filter: (g: GoalRecord) =>
                  g.category === "investment" || g.category === "realestate",
              },
            ] as { value: string; filter: (g: GoalRecord) => boolean }[]
          ).map(({ value, filter }) => (
            <TabsContent key={value} value={value} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.filter(filter).map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEdit}
                    onDelete={setDeleteTarget}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {goals.filter(filter).length === 0 && (
                  <p className="text-zinc-500 text-sm col-span-3 py-8 text-center">
                    No goals in this view.
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Insights */}
      {goals.length > 0 && (
        <Card className="border-tiffany-500/20 bg-tiffany-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-tiffany-500/10">
                <TrendingUp className="h-5 w-5 text-tiffany-500" />
              </div>
              <div>
                <p className="font-medium text-zinc-100">Progress Summary</p>
                <p className="text-sm text-zinc-400 mt-1">
                  At your current contribution rate of{" "}
                  {formatCurrency(stats.totalMonthlyContribution)}/month, you have{" "}
                  {goalsOnTrack} of {stats.total} goals on track or ahead of schedule.
                  {stats.behind > 0 &&
                    ` ${stats.behind} goal${stats.behind !== 1 ? "s" : ""} need attention — consider increasing contributions.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <GoalFormDialog
        mode={editTarget ? "edit" : "create"}
        initialData={editTarget ?? undefined}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditTarget(null)
        }}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  })
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </animated.div>
  )
}
