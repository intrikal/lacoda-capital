/**
 * ============================================================================
 * FILE: lib/validations/deal.schema.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Zod validation schemas for deal/pipeline mutations.
 *
 * CONSUMERS:
 *   - lib/graphql/resolvers/deal.ts — validates mutation inputs server-side
 */

import { z } from "zod"

export const dealStageEnum = z.enum([
  "prospecting",
  "due_diligence",
  "negotiation",
  "closed",
  "active",
  "exit_planning",
])

export const dealTypeEnum = z.enum([
  "real_estate",
  "private_equity",
  "venture_capital",
  "fixed_income",
])

export const createDealSchema = z.object({
  clientId: z.string().uuid("Invalid client ID").nullable().optional(),
  name: z.string().min(1, "Name is required").max(255).trim(),
  stage: dealStageEnum.optional(),
  type: dealTypeEnum,
  potentialValue: z.number().min(0, "Value must be positive"),
  probability: z.number().int().min(0).max(100).optional(),
  assigneeName: z.string().max(255).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export type CreateDealInput = z.infer<typeof createDealSchema>

export const updateDealSchema = z.object({
  clientId: z.string().uuid("Invalid client ID").nullable().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  stage: dealStageEnum.optional(),
  type: dealTypeEnum.optional(),
  potentialValue: z.number().min(0).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  assigneeName: z.string().max(255).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  lastActivity: z.string().max(255).nullable().optional(),
})

export type UpdateDealInput = z.infer<typeof updateDealSchema>
