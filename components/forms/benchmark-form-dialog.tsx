/**
 * ============================================================================
 * FILE: components/forms/benchmark-form-dialog.tsx
 * ============================================================================
 *
 * Modal dialog for creating and editing portfolio benchmarks.
 * Follows the TanStack Form + Zod validation pattern used across the app.
 *
 * FIELDS:
 *   name (required), symbol, category, ytdReturn, alpha, beta,
 *   sharpeRatio, volatility, notes.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/benchmarks/page.tsx
 */

"use client"

import { useForm } from "@tanstack/react-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createBenchmarkSchema,
  updateBenchmarkSchema,
} from "@/lib/validations/benchmark.schema"
import type {
  CreateBenchmarkInput,
  UpdateBenchmarkInput,
} from "@/lib/validations/benchmark.schema"
import type { BenchmarkRecord } from "@/lib/hooks/crud/use-benchmarks"

const BENCHMARK_CATEGORIES = [
  { value: "index", label: "Market Index" },
  { value: "etf", label: "ETF" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "custom", label: "Custom" },
] as const

interface BenchmarkFormDialogProps {
  mode: "create" | "edit"
  initialData?: Partial<BenchmarkRecord>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateBenchmarkInput | UpdateBenchmarkInput) => void
  isPending?: boolean
}

function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

export function BenchmarkFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: BenchmarkFormDialogProps) {
  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? "",
      symbol: initialData?.symbol ?? "",
      category: (initialData?.category ?? "index") as string,
      ytdReturn: initialData?.ytdReturn?.toString() ?? "0",
      alpha: initialData?.alpha?.toString() ?? "0",
      beta: initialData?.beta?.toString() ?? "1",
      sharpeRatio: initialData?.sharpeRatio?.toString() ?? "0",
      volatility: initialData?.volatility?.toString() ?? "0",
      notes: initialData?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      const raw = {
        name: value.name.trim() || undefined,
        symbol: value.symbol.trim() || null,
        category: value.category || undefined,
        ytdReturn: value.ytdReturn ? parseFloat(value.ytdReturn) : 0,
        alpha: value.alpha ? parseFloat(value.alpha) : 0,
        beta: value.beta ? parseFloat(value.beta) : 1,
        sharpeRatio: value.sharpeRatio ? parseFloat(value.sharpeRatio) : 0,
        volatility: value.volatility ? parseFloat(value.volatility) : 0,
        notes: value.notes.trim() || null,
      }

      const schema =
        mode === "create" ? createBenchmarkSchema : updateBenchmarkSchema
      const parsed = schema.safeParse(raw)
      if (!parsed.success) return
      onSubmit(parsed.data as CreateBenchmarkInput & UpdateBenchmarkInput)
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        if (!value.name.trim()) return "Name is required"
        return undefined
      },
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Benchmark" : "Edit Benchmark"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a market index or reference benchmark to track."
              : "Update benchmark details and metrics."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          {/* Name + Symbol */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() ? "Name is required" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Benchmark Name</Label>
                  <Input
                    id={field.name}
                    placeholder="e.g., S&P 500"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <FieldError
                    errors={
                      field.state.meta.errors.filter(Boolean) as string[]
                    }
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="symbol">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Symbol</Label>
                  <Input
                    id={field.name}
                    placeholder="e.g., SPX"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Category */}
          <form.Field name="category">
            {(field) => (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {BENCHMARK_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          {/* YTD Return + Alpha */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="ytdReturn">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>YTD Return (%)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="any"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="alpha">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Alpha (%)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="any"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Beta + Sharpe Ratio */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="beta">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Beta</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="any"
                    placeholder="1.0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="sharpeRatio">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Sharpe Ratio</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="any"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Volatility */}
          <form.Field name="volatility">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Volatility (%)</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          {/* Notes */}
          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Notes</Label>
                <Input
                  id={field.name}
                  placeholder="Optional notes about this benchmark..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={() => form.handleSubmit()} disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Adding..."
                : "Saving..."
              : mode === "create"
              ? "Add Benchmark"
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
