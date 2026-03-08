import { z } from "zod"

export const createValuationSchema = z.object({
  assetId: z.string().uuid("Invalid asset ID"),
  asOfDate: z.string().min(1, "Date is required"),
  value: z.number().nonnegative("Value must be non-negative"),
  currency: z.string().max(10).default("USD"),
  source: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export type CreateValuationInput = z.infer<typeof createValuationSchema>
