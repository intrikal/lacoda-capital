"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadialBarChart,
  RadialBar,
  Treemap,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Theme Colors
// ─────────────────────────────────────────────────────────────────────────────

export const chartColors = {
  primary: "#14b8a6",
  secondary: "#06b6d4",
  tertiary: "#8b5cf6",
  quaternary: "#f59e0b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  muted: "#71717a",
  grid: "#27272a",
  text: "#a1a1aa",
}

export const pieColors = [
  "#14b8a6",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#3b82f6",
  "#ef4444",
]

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (value: number) => string
}

export function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-lg">
      <p className="text-sm font-medium text-zinc-100 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="font-medium text-zinc-100">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Net Worth Chart
// ─────────────────────────────────────────────────────────────────────────────

interface NetWorthChartProps {
  data: { month: string; assets: number; liabilities: number; netWorth: number }[]
  className?: string
}

export function NetWorthChart({ data, className }: NetWorthChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Net Worth Over Time</CardTitle>
        <CardDescription>12-month trend of assets, liabilities, and net worth</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="month"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="assets"
                name="Assets"
                fill={chartColors.success}
                fillOpacity={0.2}
                stroke={chartColors.success}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="liabilities"
                name="Liabilities"
                fill={chartColors.error}
                fillOpacity={0.2}
                stroke={chartColors.error}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="netWorth"
                name="Net Worth"
                stroke={chartColors.primary}
                strokeWidth={3}
                dot={{ fill: chartColors.primary, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Performance Chart
// ─────────────────────────────────────────────────────────────────────────────

interface PerformanceChartProps {
  data: { month: string; portfolio: number; benchmark: number }[]
  className?: string
}

export function PerformanceChart({ data, className }: PerformanceChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Portfolio Performance</CardTitle>
        <CardDescription>Portfolio returns vs S&P 500 benchmark</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="month"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v) => `${v.toFixed(1)}%`} />}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="portfolio"
                name="Your Portfolio"
                stroke={chartColors.primary}
                strokeWidth={2}
                dot={{ fill: chartColors.primary, strokeWidth: 2, r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                name="S&P 500"
                stroke={chartColors.muted}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset Allocation Pie Chart
// ─────────────────────────────────────────────────────────────────────────────

interface AllocationChartProps {
  data: { name: string; value: number; color?: string }[]
  title?: string
  description?: string
  className?: string
}

export function AllocationChart({
  data,
  title = "Asset Allocation",
  description = "Portfolio distribution by asset class",
  className,
}: AllocationChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload
                  const percentage = ((item.value / total) * 100).toFixed(1)
                  return (
                    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-lg">
                      <p className="text-sm font-medium text-zinc-100">{item.name}</p>
                      <p className="text-sm text-zinc-400">
                        {formatCurrency(item.value)} ({percentage}%)
                      </p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.color || pieColors[index % pieColors.length] }}
              />
              <span className="text-xs text-zinc-400">{item.name}</span>
              <span className="text-xs font-medium text-zinc-100 ml-auto">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly Spending Chart
// ─────────────────────────────────────────────────────────────────────────────

interface SpendingChartProps {
  data: { month: string; spending: number; budget: number; income?: number }[]
  className?: string
}

export function SpendingChart({ data, className }: SpendingChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Monthly Spending Trend</CardTitle>
        <CardDescription>Spending vs budget over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="month"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
              />
              <Legend />
              <Bar
                dataKey="spending"
                name="Spending"
                fill={chartColors.primary}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="budget"
                name="Budget"
                fill={chartColors.muted}
                radius={[4, 4, 0, 0]}
                fillOpacity={0.5}
              />
              {data[0]?.income && (
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke={chartColors.success}
                  strokeWidth={2}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROI Chart
// ─────────────────────────────────────────────────────────────────────────────

interface ROIChartProps {
  data: { name: string; roi: number; invested: number; currentValue: number }[]
  className?: string
}

export function ROIChart({ data, className }: ROIChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Return on Investment</CardTitle>
        <CardDescription>ROI by asset class</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                type="number"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                width={100}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload
                  return (
                    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-lg">
                      <p className="text-sm font-medium text-zinc-100">{item.name}</p>
                      <p className="text-sm text-zinc-400">
                        ROI: <span className={item.roi >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {item.roi >= 0 ? "+" : ""}{item.roi.toFixed(1)}%
                        </span>
                      </p>
                      <p className="text-sm text-zinc-400">Invested: {formatCurrency(item.invested)}</p>
                      <p className="text-sm text-zinc-400">Current: {formatCurrency(item.currentValue)}</p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="roi"
                fill={chartColors.primary}
                radius={[0, 4, 4, 0]}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.roi >= 0 ? chartColors.success : chartColors.error}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cash Flow Chart
// ─────────────────────────────────────────────────────────────────────────────

interface CashFlowChartProps {
  data: { month: string; inflow: number; outflow: number; net: number }[]
  className?: string
}

export function CashFlowChart({ data, className }: CashFlowChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Cash Flow Analysis</CardTitle>
        <CardDescription>Monthly inflows, outflows, and net cash flow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="month"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
              />
              <Legend />
              <Bar
                dataKey="inflow"
                name="Inflow"
                fill={chartColors.success}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="outflow"
                name="Outflow"
                fill={chartColors.error}
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net Cash Flow"
                stroke={chartColors.primary}
                strokeWidth={3}
                dot={{ fill: chartColors.primary, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tax Savings Chart
// ─────────────────────────────────────────────────────────────────────────────

interface TaxSavingsChartProps {
  data: { category: string; claimed: number; potential: number }[]
  className?: string
}

export function TaxSavingsChart({ data, className }: TaxSavingsChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Tax Savings by Category</CardTitle>
        <CardDescription>Claimed vs potential deductions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                type="number"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <YAxis
                type="category"
                dataKey="category"
                stroke={chartColors.text}
                fontSize={11}
                tickLine={false}
                width={100}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
              />
              <Legend />
              <Bar
                dataKey="claimed"
                name="Claimed"
                fill={chartColors.success}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="potential"
                name="Potential"
                fill={chartColors.muted}
                radius={[0, 4, 4, 0]}
                fillOpacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Debt Payoff Chart
// ─────────────────────────────────────────────────────────────────────────────

interface DebtPayoffChartProps {
  data: { month: string; balance: number; paid: number; interest: number }[]
  className?: string
}

export function DebtPayoffChart({ data, className }: DebtPayoffChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Debt Payoff Progress</CardTitle>
        <CardDescription>Projected debt reduction over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="month"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v) => formatCurrency(v)} />}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="balance"
                name="Remaining Balance"
                fill={chartColors.error}
                fillOpacity={0.3}
                stroke={chartColors.error}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="paid"
                name="Principal Paid"
                fill={chartColors.success}
                fillOpacity={0.3}
                stroke={chartColors.success}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit Score History Chart
// ─────────────────────────────────────────────────────────────────────────────

interface CreditScoreChartProps {
  data: { month: string; score: number }[]
  className?: string
}

export function CreditScoreChart({ data, className }: CreditScoreChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Credit Score History</CardTitle>
        <CardDescription>Your credit score over the past 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="creditScoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="month"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                domain={[600, 850]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const score = payload[0].value as number
                  const rating = score >= 800 ? "Excellent" : score >= 740 ? "Very Good" : score >= 670 ? "Good" : score >= 580 ? "Fair" : "Poor"
                  return (
                    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-lg">
                      <p className="text-sm font-medium text-zinc-100">{label}</p>
                      <p className="text-lg font-bold text-teal-400">{score}</p>
                      <p className="text-xs text-zinc-400">{rating}</p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={chartColors.primary}
                strokeWidth={2}
                fill="url(#creditScoreGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Spending by Category Donut
// ─────────────────────────────────────────────────────────────────────────────

interface SpendingDonutProps {
  data: { name: string; value: number; color: string }[]
  total: number
  className?: string
}

export function SpendingDonut({ data, total, className }: SpendingDonutProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Spending Breakdown</CardTitle>
        <CardDescription>This month by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload
                  return (
                    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-lg">
                      <p className="text-sm font-medium text-zinc-100">{item.name}</p>
                      <p className="text-sm text-zinc-400">{formatCurrency(item.value)}</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-100">{formatCurrency(total)}</p>
              <p className="text-xs text-zinc-500">Total</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {data.slice(0, 6).map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-zinc-400 truncate">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Investment Returns Chart
// ─────────────────────────────────────────────────────────────────────────────

interface InvestmentReturnsChartProps {
  data: { period: string; return: number }[]
  className?: string
}

export function InvestmentReturnsChart({ data, className }: InvestmentReturnsChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Investment Returns</CardTitle>
        <CardDescription>Performance by time period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="period"
                stroke={chartColors.text}
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const value = payload[0].value as number
                  return (
                    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-lg">
                      <p className="text-sm font-medium text-zinc-100">{label}</p>
                      <p className={cn("text-lg font-bold", value >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {value >= 0 ? "+" : ""}{value.toFixed(1)}%
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.return >= 0 ? chartColors.success : chartColors.error}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal Progress Radial
// ─────────────────────────────────────────────────────────────────────────────

interface GoalProgressProps {
  goals: { name: string; current: number; target: number; color: string }[]
  className?: string
}

export function GoalProgress({ goals, className }: GoalProgressProps) {
  const data = goals.map((goal) => ({
    name: goal.name,
    value: Math.min((goal.current / goal.target) * 100, 100),
    fill: goal.color,
  }))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Financial Goals</CardTitle>
        <CardDescription>Progress toward your targets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
      </CardContent>
    </Card>
  )
}
