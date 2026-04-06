/**
 * ============================================================================
 * FILE: lib/validations/tax-deduction.schema.ts
 * ============================================================================
 *
 * Zod validation schemas for tax deduction inputs.
 * Used by the server action (server-side) and form dialog (client-side).
 *
 * CONSUMERS:
 *   - lib/actions/tax-deduction.actions.ts
 *   - components/forms/tax-deduction-form-dialog.tsx
 */

import { z } from "zod"

export const taxDeductionCategoryEnum = z.enum([
  "home_office",
  "vehicle",
  "travel",
  "equipment",
  "professional",
  "education",
  "healthcare",
  "meals",
  "utilities",
  "charitable",
  "retirement",
  "taxes",
  "other",
])

export const taxDeductionTypeEnum = z.enum(["personal", "business"])

export const taxDeductionStatusEnum = z.enum([
  "eligible",
  "pending_review",
  "claimed",
  "ineligible",
])

/** Schema for creating a new tax deduction. */
export const createTaxDeductionSchema = z.object({
  clientId: z.string().uuid("Client is required"),
  name: z.string().min(1, "Name is required").max(255).trim(),
  category: taxDeductionCategoryEnum.default("other"),
  type: taxDeductionTypeEnum.default("personal"),
  status: taxDeductionStatusEnum.default("eligible"),
  amount: z.number().min(0, "Amount must be non-negative").default(0),
  estimatedSavings: z.number().min(0).default(0),
  taxYear: z.string().regex(/^\d{4}$/, "Must be a 4-digit year"),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateTaxDeductionInput = z.infer<typeof createTaxDeductionSchema>

/** Schema for updating an existing tax deduction. All fields optional. */
export const updateTaxDeductionSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  category: taxDeductionCategoryEnum.optional(),
  type: taxDeductionTypeEnum.optional(),
  status: taxDeductionStatusEnum.optional(),
  amount: z.number().min(0).optional(),
  estimatedSavings: z.number().min(0).optional(),
  taxYear: z.string().regex(/^\d{4}$/).optional(),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateTaxDeductionInput = z.infer<typeof updateTaxDeductionSchema>
