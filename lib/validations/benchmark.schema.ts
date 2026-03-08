import { z } from "zod"

export const benchmarkCategoryEnum = z.enum([
  "index",
  "etf",
  "mutual_fund",
  "custom",
])

export const createBenchmarkSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Name is required").max(255).trim(),
  symbol: z.string().max(20).trim().nullable().optional(),
  category: benchmarkCategoryEnum.default("index"),
  ytdReturn: z.number().optional().default(0),
  alpha: z.number().optional().default(0),
  beta: z.number().optional().default(1),
  sharpeRatio: z.number().optional().default(0),
  volatility: z.number().min(0).optional().default(0),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateBenchmarkInput = z.infer<typeof createBenchmarkSchema>

export const updateBenchmarkSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  symbol: z.string().max(20).trim().nullable().optional(),
  category: benchmarkCategoryEnum.optional(),
  ytdReturn: z.number().optional(),
  alpha: z.number().optional(),
  beta: z.number().optional(),
  sharpeRatio: z.number().optional(),
  volatility: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateBenchmarkInput = z.infer<typeof updateBenchmarkSchema>
