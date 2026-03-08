import { z } from "zod"

export const createAssignmentSchema = z.object({
  assistantMemberId: z.string().uuid("Invalid assistant member ID"),
  clientId: z.string().uuid("Invalid client ID"),
  notes: z.string().max(1000).nullable().optional(),
})

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>
