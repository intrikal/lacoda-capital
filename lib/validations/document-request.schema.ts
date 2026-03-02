import { z } from "zod"

export const documentRequestStatusEnum = z.enum(["open", "fulfilled", "cancelled", "overdue"])
export const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"])

export const createDocumentRequestSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Title is required").max(255).trim(),
  description: z.string().max(1000).nullable().optional(),
  documentType: z.string().max(100).nullable().optional(),
  priority: taskPriorityEnum.default("medium"),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
})

export type CreateDocumentRequestInput = z.infer<typeof createDocumentRequestSchema>

export const updateDocumentRequestSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).nullable().optional(),
  documentType: z.string().max(100).nullable().optional(),
  status: documentRequestStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
})

export type UpdateDocumentRequestInput = z.infer<typeof updateDocumentRequestSchema>
