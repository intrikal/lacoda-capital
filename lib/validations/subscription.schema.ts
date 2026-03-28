/**
 * Zod validation schemas for subscription/billing inputs.
 */

import { z } from "zod"

export const subscriptionPlanSchema = z.enum(["starter", "professional"])
export const billingIntervalSchema = z.enum(["monthly", "annual"])

export const createCheckoutSchema = z.object({
  plan: subscriptionPlanSchema,
  interval: billingIntervalSchema,
})

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>
