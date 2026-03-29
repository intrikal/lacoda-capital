import { z } from "zod"

export const integrationProviderEnum = z.enum([
  "stripe",
  "plaid",
  "docusign",
  "quickbooks",
  "google_drive",
  "google_calendar",
  "dropbox",
  "salesforce",
  "other",
])

export const integrationStatusEnum = z.enum(["connected", "disconnected", "error", "pending"])

export const createIntegrationSchema = z.object({
  provider: integrationProviderEnum,
  name: z.string().trim().min(1, "Name is required").max(255),
  status: integrationStatusEnum.default("disconnected"),
  externalAccountId: z.string().max(255).nullable().optional(),
  externalItemId: z.string().max(255).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>

export const updateIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  status: integrationStatusEnum.optional(),
  statusMessage: z.string().max(500).nullable().optional(),
  externalAccountId: z.string().max(255).nullable().optional(),
  externalItemId: z.string().max(255).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>
