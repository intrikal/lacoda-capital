import { z } from "zod"

export const documentStatusEnum = z.enum(["pending", "verified", "expired", "rejected"])

export type DocumentStatusType = z.infer<typeof documentStatusEnum>

export const createDocumentSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Name is required").max(255).trim(),
  description: z.string().max(1000).nullable().optional(),
  mimeType: z.string().max(100).nullable().optional(),
  fileSize: z.string().max(50).nullable().optional(),
  storagePath: z.string().min(1, "Storage path is required"),
  status: documentStatusEnum.default("pending"),
  expiresAt: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>

export const updateDocumentSchema = createDocumentSchema
  .omit({ storagePath: true, clientId: true, entityId: true, assetId: true })
  .partial()

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
