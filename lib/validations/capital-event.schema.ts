import { z } from "zod"

export const createCapitalEventSchema = z.object({
  assetId: z.string().uuid(),
  eventType: z.enum(["capital_call", "distribution", "recallable"]),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().min(3).max(3).default("USD"),
  eventDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional().nullable(),
  status: z.enum(["pending", "paid", "received"]).default("pending"),
  notes: z.string().optional().nullable(),
})

export type CreateCapitalEventInput = z.infer<typeof createCapitalEventSchema>

export const updateCapitalEventStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "paid", "received", "overdue"]),
})

export type UpdateCapitalEventStatusInput = z.infer<typeof updateCapitalEventStatusSchema>
