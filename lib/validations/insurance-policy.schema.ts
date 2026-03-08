import { z } from "zod"

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const policyTypeEnum = z.enum([
  "home",
  "auto",
  "life",
  "umbrella",
  "liability",
  "health",
  "business",
  "property",
])

export const policyStatusEnum = z.enum([
  "active",
  "expiring",
  "expired",
  "pending",
])

export const premiumFrequencyEnum = z.enum(["monthly", "quarterly", "annual"])

// ─── AGENT SCHEMA ─────────────────────────────────────────────────────────────

export const agentSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(50),
  email: z.string().email().max(255),
})

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

export const createInsurancePolicySchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Name is required").max(255).trim(),
  policyType: policyTypeEnum,
  provider: z.string().min(1, "Provider is required").max(255).trim(),
  policyNumber: z.string().min(1, "Policy number is required").max(100).trim(),
  coverageAmount: z.number().min(0, "Coverage amount must be non-negative"),
  deductible: z.number().min(0).optional().default(0),
  premium: z.number().min(0, "Premium must be non-negative"),
  premiumFrequency: premiumFrequencyEnum.default("annual"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  expirationDate: z.string().min(1, "Expiration date is required"),
  coveredAssets: z.array(z.string()).optional().default([]),
  beneficiaries: z.array(z.string()).optional().default([]),
  agent: agentSchema.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateInsurancePolicyInput = z.infer<typeof createInsurancePolicySchema>

export const updateInsurancePolicySchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  policyType: policyTypeEnum.optional(),
  status: policyStatusEnum.optional(),
  provider: z.string().min(1).max(255).trim().optional(),
  policyNumber: z.string().min(1).max(100).trim().optional(),
  coverageAmount: z.number().min(0).optional(),
  deductible: z.number().min(0).optional(),
  premium: z.number().min(0).optional(),
  premiumFrequency: premiumFrequencyEnum.optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  coveredAssets: z.array(z.string()).optional(),
  beneficiaries: z.array(z.string()).optional(),
  agent: agentSchema.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateInsurancePolicyInput = z.infer<typeof updateInsurancePolicySchema>
