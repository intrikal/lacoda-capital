"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, differenceInMonths, addYears } from "date-fns"
import {
  Target,
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  Home,
  GraduationCap,
  Umbrella,
  Plane,
  Car,
  Heart,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  PerformanceChart,
  GoalProgress,
} from "@/components/dashboard/charts"

// Goal categories
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
}

type GoalCategory = keyof typeof goalCategoryConfig

interface FinancialGoal {
  id: string
  name: string
  category: GoalCategory
  targetAmount: number
  currentAmount: number
  targetDate: string
  monthlyContribution: number
  priority: "high" | "medium" | "low"
  status: "on_track" | "ahead" | "behind" | "completed"
  notes?: string
  milestones?: { name: string; amount: number; reached: boolean }[]
}

// Mock goals data
const mockGoals: FinancialGoal[] = [
  {
    id: "1",
    name: "Retirement Fund",
    category: "retirement",
    targetAmount: 5000000,
    currentAmount: 2850000,
    targetDate: "2040-01-01",
    monthlyContribution: 15000,
    priority: "high",
    status: "on_track",
    notes: "Target: 4% safe withdrawal rate = $200K/year",
    milestones: [
      { name: "First Million", amount: 1000000, reached: true },
      { name: "Two Million", amount: 2000000, reached: true },
      { name: "Halfway", amount: 2500000, reached: true },
      { name: "Three Million", amount: 3000000, reached: false },
      { name: "Four Million", amount: 4000000, reached: false },
    ],
  },
  {
    id: "2",
    name: "Children's Education Fund",
    category: "education",
    targetAmount: 500000,
    currentAmount: 145000,
    targetDate: "2035-09-01",
    monthlyContribution: 2500,
    priority: "high",
    status: "on_track",
    notes: "529 Plan for 2 children - college expenses",
    milestones: [
      { name: "First $50K", amount: 50000, reached: true },
      { name: "$100K", amount: 100000, reached: true },
      { name: "Quarter Way", amount: 125000, reached: true },
      { name: "$200K", amount: 200000, reached: false },
    ],
  },
  {
    id: "3",
    name: "Real Estate Portfolio Expansion",
    category: "realestate",
    targetAmount: 3000000,
    currentAmount: 1850000,
    targetDate: "2028-12-31",
    monthlyContribution: 20000,
    priority: "medium",
    status: "ahead",
    notes: "Target: 3 additional investment properties",
    milestones: [
      { name: "First Property", amount: 500000, reached: true },
      { name: "Second Property", amount: 1000000, reached: true },
      { name: "Third Property", amount: 1500000, reached: true },
      { name: "Fourth Property", amount: 2000000, reached: false },
    ],
  },
  {
    id: "4",
    name: "Emergency Fund",
    category: "emergency",
    targetAmount: 150000,
    currentAmount: 125000,
    targetDate: "2024-12-31",
    monthlyContribution: 5000,
    priority: "high",
    status: "ahead",
    notes: "12 months of expenses in liquid assets",
  },
  {
    id: "5",
    name: "European Vacation Home",
    category: "travel",
    targetAmount: 800000,
    currentAmount: 180000,
    targetDate: "2030-06-01",
    monthlyContribution: 8000,
    priority: "low",
    status: "on_track",
    notes: "Villa in Tuscany or South of France",
  },
  {
    id: "6",
    name: "Private Equity Fund",
    category: "investment",
    targetAmount: 1000000,
    currentAmount: 650000,
    targetDate: "2026-03-01",
    monthlyContribution: 12000,
    priority: "medium",
    status: "on_track",
    notes: "Diversified PE allocation across 5-7 funds",
  },
]

// Wealth projection data
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

const statusConfig = {
  on_track: { label: "On Track", color: "text-tiffany-500", bg: "bg-tiffany-500/10", icon: CheckCircle2 },
  ahead: { label: "Ahead", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: ArrowUpRight },
  behind: { label: "Behind", color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertCircle },
  completed: { label: "Completed", color: "text-blue-400", bg: "bg-blue-400/10", icon: CheckCircle2 },
}

const priorityConfig = {
  high: { label: "High", color: "text-red-400" },
  medium: { label: "Medium", color: "text-amber-400" },
  low: { label: "Low", color: "text-zinc-400" },
}

function GoalCard({ goal }: { goal: FinancialGoal }) {
  const categoryConfig = goalCategoryConfig[goal.category]
  const status = statusConfig[goal.status]
  const priority = priorityConfig[goal.priority]
  const CategoryIcon = categoryConfig.icon
  const StatusIcon = status.icon

  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
  const remaining = goal.targetAmount - goal.currentAmount
  const monthsToTarget = differenceInMonths(new Date(goal.targetDate), new Date())

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", categoryConfig.bg)}>
              <CategoryIcon className={cn("h-5 w-5", categoryConfig.color)} />
            </div>
            <div>
              <p className="font-medium text-zinc-100">{goal.name}</p>
              <p className="text-xs text-zinc-500">{categoryConfig.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(status.bg, status.color, "border-0 text-xs")}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Progress</span>
            <span className="text-zinc-100">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: categoryConfig.chartColor,
              }}
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

export default function GoalsPage() {
  const [addGoalOpen, setAddGoalOpen] = React.useState(false)
  const reducedMotion = useReducedMotion()

  const totalTargetAmount = mockGoals.reduce((sum, g) => sum + g.targetAmount, 0)
  const totalCurrentAmount = mockGoals.reduce((sum, g) => sum + g.currentAmount, 0)
  const totalMonthlyContribution = mockGoals.reduce((sum, g) => sum + g.monthlyContribution, 0)
  const overallProgress = (totalCurrentAmount / totalTargetAmount) * 100

  const goalsOnTrack = mockGoals.filter(g => g.status === "on_track" || g.status === "ahead").length
  const goalsBehind = mockGoals.filter(g => g.status === "behind").length

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Financial Goals</h1>
          <p className="text-zinc-400 mt-1">
            Track progress toward your wealth targets and milestones
          </p>
        </div>
        <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a new financial target to work towards.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input placeholder="e.g., Dream Home Down Payment" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select defaultValue="custom">
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(goalCategoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Amount</Label>
                  <Input type="number" placeholder="$0" />
                </div>
                <div className="space-y-2">
                  <Label>Current Amount</Label>
                  <Input type="number" placeholder="$0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Contribution</Label>
                  <Input type="number" placeholder="$0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddGoalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setAddGoalOpen(false)}>
                Create Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Hero */}
      <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <p className="text-sm font-medium text-zinc-400 mb-1">Total Goal Progress</p>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-4xl font-bold text-zinc-100">
                  {formatCurrency(totalCurrentAmount)}
                </span>
                <span className="text-lg text-zinc-500">
                  of {formatCurrency(totalTargetAmount)}
                </span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-tiffany-500 to-cyan-500 transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-sm text-zinc-400">
                {overallProgress.toFixed(1)}% complete across {mockGoals.length} goals
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                Monthly Contributions
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(totalMonthlyContribution)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {formatCurrency(totalMonthlyContribution * 12)}/year
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wealth Projection */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-base">Wealth Projection</CardTitle>
            <CardDescription>
              Projected portfolio growth based on current trajectory
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PerformanceChart data={wealthProjectionData} />
        </CardContent>
      </Card>

      {/* Goals Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Goals ({mockGoals.length})</TabsTrigger>
          <TabsTrigger value="high">High Priority ({mockGoals.filter(g => g.priority === "high").length})</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
          <TabsTrigger value="investment">Investment</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="high" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockGoals
              .filter((g) => g.priority === "high")
              .map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="retirement" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockGoals
              .filter((g) => g.category === "retirement")
              .map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="investment" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockGoals
              .filter((g) => g.category === "investment" || g.category === "realestate")
              .map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
          </div>
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
              <p className="font-medium text-zinc-100">Progress Summary</p>
              <p className="text-sm text-zinc-400 mt-1">
                At your current contribution rate of {formatCurrency(totalMonthlyContribution)}/month,
                you're projected to reach your retirement goal by 2038 - 2 years ahead of schedule.
                Consider increasing your education fund contributions by $500/month to stay on track
                for your children's college timeline.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
