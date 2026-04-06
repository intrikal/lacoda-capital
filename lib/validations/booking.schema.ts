import { z } from "zod"

export const bookingRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Enter a valid email address").trim(),
  company: z.string().max(100).trim().optional(),
  reason: z
    .string()
    .min(10, "Please share a bit more detail (min 10 characters)")
    .max(1000)
    .trim(),
  slotId: z.string().min(1, "Please select a time slot"),
})

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>
