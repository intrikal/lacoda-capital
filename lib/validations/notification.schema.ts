import { z } from "zod"

export const notificationTypeEnum = z.enum([
  "task_assigned",
  "task_due",
  "document_uploaded",
  "document_expiring",
  "document_requested",
  "report_ready",
  "compliance_alert",
  "system",
])

export const createNotificationSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  type: notificationTypeEnum,
  title: z.string().min(1, "Title is required").max(255).trim(),
  message: z.string().max(1000).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
