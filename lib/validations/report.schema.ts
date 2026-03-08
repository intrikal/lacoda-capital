import { z } from "zod"

export const reportTypeEnum = z.enum([
  "portfolio_summary",
  "asset_allocation",
  "performance",
  "tax_summary",
  "compliance",
  "client_statement",
  "custom",
])

export const reportStatusEnum = z.enum(["draft", "published", "archived"])

export const createReportSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Name is required").max(255).trim(),
  description: z.string().max(1000).nullable().optional(),
  reportType: reportTypeEnum,
  parameters: z.record(z.string(), z.unknown()).optional(),
})

export type CreateReportInput = z.infer<typeof createReportSchema>

export const updateReportSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).nullable().optional(),
  status: reportStatusEnum.optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateReportInput = z.infer<typeof updateReportSchema>
