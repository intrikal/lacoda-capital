/**
 * ============================================================================
 * FILE: /lib/validations/document.schema.ts
 * ============================================================================
 *
 * Zod validation schemas for document create and update operations.
 * Used on both server (resolvers call .parse()) and client (forms call .safeParse()).
 *
 * Pattern mirrors client.schema.ts:
 *   1. Enum for the status field
 *   2. createSchema with all fields
 *   3. updateSchema = createSchema.omit(immutable fields).partial()
 *   4. Inferred TypeScript types exported for hooks + components
 *
 * Related files:
 *   lib/graphql/resolvers/document.ts         — .parse() on mutation input
 *   components/forms/document-form-dialog.tsx  — .safeParse() for validation
 *   app/db/schema/documents.ts                — DB columns these mirror
 */

import { z } from "zod"

/** The four valid document lifecycle statuses. Matches the DB enum in 00_enums.ts. */
export const documentStatusEnum = z.enum(["pending", "verified", "expired", "rejected"])

export type DocumentStatusType = z.infer<typeof documentStatusEnum>

/**
 * createDocumentSchema — Validates input for creating a new document record.
 *
 * Required: name, storagePath
 * Optional: clientId, entityId, assetId, description, mimeType, fileSize,
 *           folder, status (defaults to "pending"), expiresAt, tags, metadata
 */
export const createDocumentSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Name is required").max(255).trim(),
  description: z.string().max(1000).nullable().optional(),
  mimeType: z.string().max(100).nullable().optional(),
  fileSize: z.string().max(50).nullable().optional(),
  storagePath: z.string().min(1, "Storage path is required"),
  folder: z.string().max(255).nullable().optional(),
  status: documentStatusEnum.default("pending"),
  expiresAt: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>

/**
 * updateDocumentSchema — Validates input for editing an existing document.
 *
 * Derived from createSchema by:
 *   1. Omitting immutable fields (storagePath, clientId, entityId, assetId)
 *   2. Making everything .partial() — only provided fields are updated
 *
 * This means you can pass { name: "New Name" } without providing every field.
 */
export const updateDocumentSchema = createDocumentSchema
  .omit({ storagePath: true, clientId: true, entityId: true, assetId: true })
  .partial()

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
