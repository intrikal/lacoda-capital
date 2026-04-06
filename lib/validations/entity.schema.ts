import { z } from "zod"

export const entityTypeEnum = z.enum([
  "personal",
  "llc",
  "trust",
  "corporation",
  "partnership",
  "foundation",
])

export type EntityType = z.infer<typeof entityTypeEnum>

export const createEntitySchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  parentId: z.string().uuid("Invalid parent entity ID").nullable().optional(),
  name: z.string().min(1, "Name is required").max(200).trim(),
  entityType: entityTypeEnum,
  jurisdiction: z.string().max(100).nullable().optional(),
  formationDate: z.string().nullable().optional(),
  taxId: z.string().max(50).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateEntityInput = z.infer<typeof createEntitySchema>

export const updateEntitySchema = createEntitySchema
  .omit({ clientId: true })
  .partial()
  .refine(
    () => {
      // parentId validation is done at the action level (circular check needs DB)
      return true
    },
  )

export type UpdateEntityInput = z.infer<typeof updateEntitySchema>
