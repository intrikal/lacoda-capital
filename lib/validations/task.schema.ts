import { z } from "zod"

export const taskStatusEnum = z.enum(["pending", "in_progress", "completed", "cancelled"])
export const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"])

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255).trim(),
  description: z.string().max(2000).nullable().optional(),
  status: taskStatusEnum.default("pending"),
  priority: taskPriorityEnum.default("medium"),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  documentId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  documentId: z.string().uuid().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
