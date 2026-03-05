/**
 * ============================================================================
 * FILE: lib/validations/billing-record.schema.ts
 * ============================================================================
 *
 * Zod validation schemas for billing record (advisory fee invoice) inputs.
 * Used by both the GraphQL resolver (server-side) and the form dialog (client-side)
 * to validate billing record creation and updates.
 *
 * CONSUMERS:
 *   - lib/graphql/resolvers/billing-record.ts  (server validation)
 *   - components/forms/billing-record-form-dialog.tsx  (client validation)
 */

import { z } from "zod"

/** Billing status enum — mirrors billingStatusEnum in 00_enums.ts */
export const billingStatusEnum = z.enum(["paid", "upcoming", "due"])

/** Schema for creating a new billing record. clientId, period, amount, dueDate, effectiveRate required. */
export const createBillingRecordSchema = z.object({
  clientId: z.string().uuid("Client is required"),
  period: z.string().min(1, "Period is required").max(50).trim(),
  amount: z.number().min(0, "Amount must be non-negative"),
  aum: z.number().min(0).optional().default(0),
  status: billingStatusEnum.default("upcoming"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  effectiveRate: z.number().min(0, "Rate must be non-negative"),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateBillingRecordInput = z.infer<typeof createBillingRecordSchema>

/** Schema for updating an existing billing record. All fields optional for partial updates. */
export const updateBillingRecordSchema = z.object({
  clientId: z.string().uuid().optional(),
  period: z.string().min(1).max(50).trim().optional(),
  amount: z.number().min(0).optional(),
  aum: z.number().min(0).optional(),
  status: billingStatusEnum.optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  effectiveRate: z.number().min(0).optional(),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateBillingRecordInput = z.infer<typeof updateBillingRecordSchema>
