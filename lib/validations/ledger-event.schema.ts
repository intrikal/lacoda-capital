import { z } from "zod"

export const ledgerActionEnum = z.enum([
  "created",
  "updated",
  "deleted",
  "archived",
  "document_uploaded",
  "document_verified",
  "document_expired",
  "document_downloaded",
  "asset_valued",
  "asset_transferred",
  "asset_sold",
  "login",
  "logout",
  "permission_changed",
  "report_generated",
  "report_shared",
  "compliance_reviewed",
  "compliance_approved",
])

export const ledgerTargetTypeEnum = z.enum([
  "org",
  "user",
  "client",
  "entity",
  "asset",
  "document",
  "task",
  "report",
])

export const createLedgerEventSchema = z.object({
  targetType: ledgerTargetTypeEnum,
  targetId: z.string().uuid("Invalid target ID"),
  action: ledgerActionEnum,
  payload: z.record(z.string(), z.unknown()).optional(),
})

export type CreateLedgerEventInput = z.infer<typeof createLedgerEventSchema>
