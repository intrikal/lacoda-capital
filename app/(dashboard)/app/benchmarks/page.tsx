"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  TrendingUp,
  BarChart3,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  useBenchmarks,
  useCreateBenchmark,
  useUpdateBenchmark,
  useDeleteBenchmark,
} from "@/lib/hooks/crud/use-benchmarks"
import type { BenchmarkRecord } from "@/lib/hooks/crud/use-benchmarks"
import { BenchmarkFormDialog } from "@/components/forms/benchmark-form-dialog"
import type {
  CreateBenchmarkInput,
  UpdateBenchmarkInput,
} from "@/lib/validations/benchmark.schema"

// ─── CATEGORY CONFIG ────────────────────────────────────────────────────────

const categoryConfig = {
  index: { label: "Market Index", color: "text-tiffany-500", bg: "bg-tiffany-500/10" },
  etf: { label: "ETF", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  mutual_fund: { label: "Mutual Fund", color: "text-purple-400", bg: "bg-purple-400/10" },
  custom: { label: "Custom", color: "text-zinc-400", bg: "bg-zinc-400/10" },
} as const

// ─── BENCHMARK CARD ─────────────────────────────────────────────────────────

interface BenchmarkCardProps {
  benchmark: BenchmarkRecord
  onEdit: (b: BenchmarkRecord) => void
  onDelete: (b: BenchmarkRecord) => void
}

function BenchmarkCard({ benchmark, onEdit, onDelete }: BenchmarkCardProps) {
  const cat = categoryConfig[benchmark.category] ?? categoryConfig.custom

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", cat.bg)}>
              <BarChart3 className={cn("h-5 w-5", cat.color)} />
            </div>
            <div>
              <p className="font-medium text-zinc-100">{benchmark.name}</p>
              <div className="flex items-center gap-2">
                {benchmark.symbol && (
                  <span className="text-xs text-zinc-500">{benchmark.symbol}</span>
                )}
                <Badge className={cn(cat.bg, cat.color, "border-0 text-xs")}>
                  {cat.label}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={() => onEdit(benchmark)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="text-rose-400 focus:text-rose-400"
                onClick={() => onDelete(benchmark)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-zinc-500">YTD Return</p>
            <p className={cn(
              "text-lg font-semibold",
              benchmark.ytdReturn >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {benchmark.ytdReturn >= 0 ? "+" : ""}{benchmark.ytdReturn.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Alpha</p>
            <p className={cn(
              "text-lg font-semibold",
              benchmark.alpha >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {benchmark.alpha >= 0 ? "+" : ""}{benchmark.alpha.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Footer metrics */}
        <div className="pt-3 border-t border-zinc-800 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-zinc-500">Beta</p>
            <p className="text-zinc-300 font-medium">{benchmark.beta.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-zinc-500">Sharpe</p>
            <p className="text-zinc-300 font-medium">{benchmark.sharpeRatio.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-zinc-500">Volatility</p>
            <p className="text-zinc-300 font-medium">{benchmark.volatility.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── EMPTY STATE ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16">
      <BarChart3 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
      <p className="text-zinc-400 font-medium mb-1">No benchmarks yet</p>
      <p className="text-zinc-500 text-sm mb-6">
        Add a market index or benchmark to compare portfolio performance.
      </p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add Benchmark
      </Button>
    </div>
  )
}

// ─── PAGE ───────────────────────────────────────────────────────────────────

export default function BenchmarksPage() {
  const { benchmarks, isLoading, stats } = useBenchmarks()
  const createMutation = useCreateBenchmark()
  const updateMutation = useUpdateBenchmark()
  const deleteMutation = useDeleteBenchmark()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<BenchmarkRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<BenchmarkRecord | null>(null)

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

  function handleEdit(benchmark: BenchmarkRecord) {
    setEditTarget(benchmark)
    setDialogOpen(true)
  }

  function handleFormSubmit(data: CreateBenchmarkInput | UpdateBenchmarkInput) {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, input: data as UpdateBenchmarkInput })
    } else {
      createMutation.mutate(data as CreateBenchmarkInput)
    }
  }

  // Find the best-performing benchmark for the insights card
  const bestAlpha = benchmarks.length > 0
    ? benchmarks.reduce((best, b) => (b.alpha > best.alpha ? b : best), benchmarks[0])
    : null

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
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Benchmark
        </Button>
      </div>

      {/* Summary Metrics */}
      {benchmarks.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Benchmarks Tracked</p>
                <BarChart3 className="h-4 w-4 text-tiffany-500" />
              </div>
              <p className="text-2xl font-bold text-zinc-100 mt-2">{stats.total}</p>
              <p className="text-xs text-zinc-500 mt-1">Active comparisons</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Avg Alpha</p>
                <Target className="h-4 w-4 text-tiffany-500" />
              </div>
              <p className={cn(
                "text-2xl font-bold mt-2",
                stats.avgAlpha >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {stats.avgAlpha >= 0 ? "+" : ""}{stats.avgAlpha.toFixed(1)}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">Excess return over benchmarks</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Avg Sharpe Ratio</p>
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-zinc-100 mt-2">
                {stats.avgSharpe.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Risk-adjusted return</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Avg Beta</p>
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-zinc-100 mt-2">
                {stats.avgBeta.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Market sensitivity</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Benchmark Comparison Table */}
      {benchmarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benchmark Comparison Table</CardTitle>
            <CardDescription>Key metrics across tracked benchmarks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Symbol</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">YTD Return</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Alpha</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Beta</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Sharpe</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Volatility</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b) => (
                    <tr key={b.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-medium text-zinc-100">{b.name}</td>
                      <td className="py-3 px-4 text-zinc-400">{b.symbol || "—"}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">
                        {b.ytdReturn >= 0 ? "+" : ""}{b.ytdReturn.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={cn(
                          "flex items-center justify-end gap-1",
                          b.alpha >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {b.alpha >= 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {b.alpha >= 0 ? "+" : ""}{b.alpha.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-300">{b.beta.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">{b.sharpeRatio.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">{b.volatility.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benchmark Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-zinc-800/50" />
          ))}
        </div>
      ) : benchmarks.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState onAdd={handleCreate} />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({benchmarks.length})</TabsTrigger>
            <TabsTrigger value="index">
              Indices ({benchmarks.filter((b) => b.category === "index").length})
            </TabsTrigger>
            <TabsTrigger value="etf">
              ETFs ({benchmarks.filter((b) => b.category === "etf").length})
            </TabsTrigger>
          </TabsList>

          {([
            { value: "all", filter: () => true },
            { value: "index", filter: (b: BenchmarkRecord) => b.category === "index" },
            { value: "etf", filter: (b: BenchmarkRecord) => b.category === "etf" },
          ] as { value: string; filter: (b: BenchmarkRecord) => boolean }[]).map(
            ({ value, filter }) => (
              <TabsContent key={value} value={value} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {benchmarks.filter(filter).map((b) => (
                    <BenchmarkCard
                      key={b.id}
                      benchmark={b}
                      onEdit={handleEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                  {benchmarks.filter(filter).length === 0 && (
                    <p className="text-zinc-500 text-sm col-span-3 py-8 text-center">
                      No benchmarks in this view.
                    </p>
                  )}
                </div>
              </TabsContent>
            )
          )}
        </Tabs>
      )}

      {/* Insights */}
      {bestAlpha && (
        <Card className="border-tiffany-500/20 bg-tiffany-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-tiffany-500/10">
                <TrendingUp className="h-5 w-5 text-tiffany-500" />
              </div>
              <div>
                <p className="font-medium text-zinc-100">Portfolio Insights</p>
                <p className="text-sm text-zinc-400 mt-1">
                  {stats.avgAlpha >= 0
                    ? `Your portfolio is generating positive alpha averaging ${stats.avgAlpha.toFixed(1)}% across ${stats.total} tracked benchmark${stats.total !== 1 ? "s" : ""}. `
                    : `Your portfolio is trailing benchmarks by an average of ${Math.abs(stats.avgAlpha).toFixed(1)}%. `}
                  {bestAlpha.alpha >= 0
                    ? `Strongest outperformance is against ${bestAlpha.name} with +${bestAlpha.alpha.toFixed(1)}% alpha.`
                    : `Consider reviewing asset allocation relative to ${bestAlpha.name}.`}
                  {stats.avgBeta < 1
                    ? ` Portfolio beta of ${stats.avgBeta.toFixed(2)} indicates lower volatility than the market.`
                    : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <BenchmarkFormDialog
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
            <AlertDialogTitle>Delete Benchmark</AlertDialogTitle>
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
