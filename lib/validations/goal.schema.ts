import { z } from "zod"

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const goalCategoryEnum = z.enum([
  "retirement",
  "education",
  "realestate",
  "emergency",
  "travel",
  "vehicle",
  "investment",
  "custom",
])

export const goalStatusEnum = z.enum([
  "on_track",
  "ahead",
  "behind",
  "completed",
])

export const goalPriorityEnum = z.enum(["high", "medium", "low"])

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Name is required").max(255).trim(),
  category: goalCategoryEnum.default("custom"),
  priority: goalPriorityEnum.default("medium"),
  targetAmount: z.number().positive("Target amount must be positive"),
  currentAmount: z.number().min(0).optional().default(0),
  monthlyContribution: z.number().min(0).optional().default(0),
  targetDate: z.string().min(1, "Target date is required"),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateGoalInput = z.infer<typeof createGoalSchema>

export const updateGoalSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  category: goalCategoryEnum.optional(),
  status: goalStatusEnum.optional(),
  priority: goalPriorityEnum.optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
  targetDate: z.string().optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>
