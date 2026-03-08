import { z } from "zod"

export const assetClassEnum = z.enum([
  "real_estate",
  "equities",
  "fixed_income",
  "private_equity",
  "venture_capital",
  "hedge_funds",
  "commodities",
  "cash",
  "crypto",
  "collectibles",
  "intellectual_property",
  "insurance",
  "other",
])

export const assetStatusEnum = z.enum(["active", "pending", "sold", "transferred"])

export type AssetClass = z.infer<typeof assetClassEnum>
export type AssetStatus = z.infer<typeof assetStatusEnum>

export const createAssetSchema = z.object({
  entityId: z.string().uuid("Invalid entity ID"),
  name: z.string().min(1, "Name is required").max(200).trim(),
  description: z.string().max(1000).nullable().optional(),
  assetClass: assetClassEnum,
  status: assetStatusEnum.default("active"),
  acquisitionDate: z.string().nullable().optional(),
  acquisitionCost: z.number().nonnegative().nullable().optional(),
  currency: z.string().max(10).default("USD"),
  currentValue: z.number().nonnegative().nullable().optional(),
  externalId: z.string().max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateAssetInput = z.infer<typeof createAssetSchema>

export const updateAssetSchema = createAssetSchema
  .omit({ entityId: true })
  .partial()

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>
