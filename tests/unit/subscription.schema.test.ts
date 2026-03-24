/**
 * Unit tests for subscription validation schemas.
 */

import { describe, it, expect } from "vitest"
import {
  createCheckoutSchema,
  subscriptionPlanSchema,
  billingIntervalSchema,
} from "@/lib/validations/subscription.schema"

describe("subscription schema — createCheckoutSchema", () => {
  it("accepts valid starter monthly input", () => {
    const result = createCheckoutSchema.safeParse({
      plan: "starter",
      interval: "monthly",
    })
    expect(result.success).toBe(true)
  })

  it("accepts valid professional annual input", () => {
    const result = createCheckoutSchema.safeParse({
      plan: "professional",
      interval: "annual",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid plan", () => {
    const result = createCheckoutSchema.safeParse({
      plan: "enterprise",
      interval: "monthly",
    })
    expect(result.success).toBe(false)
  })

  it("rejects free plan", () => {
    const result = createCheckoutSchema.safeParse({
      plan: "free",
      interval: "monthly",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid interval", () => {
    const result = createCheckoutSchema.safeParse({
      plan: "starter",
      interval: "weekly",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing plan", () => {
    const result = createCheckoutSchema.safeParse({
      interval: "monthly",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing interval", () => {
    const result = createCheckoutSchema.safeParse({
      plan: "starter",
    })
    expect(result.success).toBe(false)
  })
})

describe("subscription schema — plan enum", () => {
  it("allows starter", () => {
    expect(subscriptionPlanSchema.safeParse("starter").success).toBe(true)
  })

  it("allows professional", () => {
    expect(subscriptionPlanSchema.safeParse("professional").success).toBe(true)
  })

  it("rejects free", () => {
    expect(subscriptionPlanSchema.safeParse("free").success).toBe(false)
  })

  it("rejects enterprise", () => {
    expect(subscriptionPlanSchema.safeParse("enterprise").success).toBe(false)
  })
})

describe("subscription schema — billing interval enum", () => {
  it("allows monthly", () => {
    expect(billingIntervalSchema.safeParse("monthly").success).toBe(true)
  })

  it("allows annual", () => {
    expect(billingIntervalSchema.safeParse("annual").success).toBe(true)
  })

  it("rejects quarterly", () => {
    expect(billingIntervalSchema.safeParse("quarterly").success).toBe(false)
  })
})
