import { z } from "zod"

export const createComplianceControlSchema = z.object({
  code: z.string().min(1, "Code is required").max(50).trim(),
  name: z.string().min(1, "Name is required").max(255).trim(),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  frequency: z.string().max(50).nullable().optional(),
  requiredDocumentTypes: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateComplianceControlInput = z.infer<typeof createComplianceControlSchema>

export const updateComplianceControlSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  frequency: z.string().max(50).nullable().optional(),
  requiredDocumentTypes: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateComplianceControlInput = z.infer<typeof updateComplianceControlSchema>

export const createComplianceEvidenceSchema = z.object({
  controlId: z.string().uuid("Invalid control ID"),
  documentId: z.string().uuid("Invalid document ID"),
  clientId: z.string().uuid("Invalid client ID"),
  status: z.string().max(50).default("pending"),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  reviewNotes: z.string().max(1000).nullable().optional(),
})

export type CreateComplianceEvidenceInput = z.infer<typeof createComplianceEvidenceSchema>
