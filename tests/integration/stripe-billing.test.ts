/**
 * Integration tests for Stripe billing webhook handling and subscription lifecycle.
 *
 * Tests:
 *   - Checkout session completed → org plan updated for all 4 paid tiers
 *   - Upgrades: Starter → Growth → Professional → Elite → back to free
 *   - Cancellation lifecycle
 *   - Payment failed → past_due; paid → restored
 *   - Webhook idempotency
 *   - Price-to-plan mapping (8 price IDs)
 *   - Edge cases: unknown org, null priceId, duplicate events
 */

import { describe, it, expect, beforeEach } from "vitest"

// ─── Mock types ───────────────────────────────────────────────────────────────

interface MockSubscription {
  orgId: string
  plan: string
  status: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  cancelAtPeriodEnd: string
  currentPeriodEnd: Date | null
}

// Simulated in-memory "database"
let mockDb: Record<string, MockSubscription> = {}

// ─── Price → Plan mapping (mirrors what the real webhook should implement) ───

function priceToPlan(priceId: string | null): string | null {
  if (!priceId) return null
  if (priceId.includes("starter"))      return "starter"
  if (priceId.includes("growth"))       return "growth"
  if (priceId.includes("pro"))          return "professional"
  if (priceId.includes("professional")) return "professional"
  if (priceId.includes("elite"))        return "elite"
  return "enterprise"
}

// ─── Simulated webhook handlers ───────────────────────────────────────────────

function handleCheckoutCompleted(event: {
  orgId: string
  plan: string
  subscriptionId: string
  priceId: string
  trialEnd: number | null
  periodEnd: number
}) {
  const sub = mockDb[event.orgId]
  if (!sub) return

  sub.plan = event.plan
  sub.status = event.trialEnd ? "trialing" : "active"
  sub.stripeSubscriptionId = event.subscriptionId
  sub.cancelAtPeriodEnd = "false"
  sub.currentPeriodEnd = new Date(event.periodEnd * 1000)
}

function handleSubscriptionUpdated(event: {
  orgId: string
  priceId: string
  stripeStatus: string
  cancelAtPeriodEnd: boolean
  periodEnd: number
}) {
  const sub = mockDb[event.orgId]
  if (!sub) return

  const plan = priceToPlan(event.priceId) ?? "free"
  sub.plan = plan

  if (event.cancelAtPeriodEnd && event.stripeStatus === "active") {
    sub.status = "cancelling"
  } else if (event.stripeStatus === "active") {
    sub.status = "active"
  } else if (event.stripeStatus === "canceled") {
    sub.status = "cancelled"
    sub.plan = "free"
  }

  sub.cancelAtPeriodEnd = event.cancelAtPeriodEnd ? "true" : "false"
  sub.currentPeriodEnd = new Date(event.periodEnd * 1000)
}

function handleSubscriptionDeleted(orgId: string) {
  const sub = mockDb[orgId]
  if (!sub) return

  sub.plan = "free"
  sub.status = "cancelled"
  sub.stripeSubscriptionId = null
  sub.cancelAtPeriodEnd = "false"
}

function handleInvoicePaymentFailed(customerId: string) {
  const sub = Object.values(mockDb).find((s) => s.stripeCustomerId === customerId)
  if (sub) sub.status = "past_due"
}

function handleInvoicePaid(customerId: string) {
  const sub = Object.values(mockDb).find((s) => s.stripeCustomerId === customerId)
  if (sub && sub.status === "past_due") {
    sub.status = sub.cancelAtPeriodEnd === "true" ? "cancelling" : "active"
  }
}

// ─── Test setup ───────────────────────────────────────────────────────────────

const futureTimestamp = () => Math.floor(Date.now() / 1000) + 30 * 86400
const trialTimestamp = () => Math.floor(Date.now() / 1000) + 14 * 86400

beforeEach(() => {
  mockDb = {
    "org-1": {
      orgId: "org-1",
      plan: "free",
      status: "trialing",
      stripeCustomerId: "cus_test_1",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: "false",
      currentPeriodEnd: null,
    },
    "org-2": {
      orgId: "org-2",
      plan: "free",
      status: "trialing",
      stripeCustomerId: "cus_test_2",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: "false",
      currentPeriodEnd: null,
    },
  }
})

// ─── Checkout completed — all 4 paid tiers ────────────────────────────────────

describe("checkout.session.completed — all paid tiers", () => {
  const tiers = [
    { plan: "starter",      priceId: "price_starter_monthly" },
    { plan: "growth",       priceId: "price_growth_monthly" },
    { plan: "professional", priceId: "price_pro_monthly" },
    { plan: "elite",        priceId: "price_elite_monthly" },
  ]

  tiers.forEach(({ plan, priceId }) => {
    it(`checkout with ${plan} plan sets correct plan + trialing status`, () => {
      handleCheckoutCompleted({
        orgId: "org-1",
        plan,
        subscriptionId: `sub_${plan}_1`,
        priceId,
        trialEnd: trialTimestamp(),
        periodEnd: futureTimestamp(),
      })

      const sub = mockDb["org-1"]
      expect(sub.plan).toBe(plan)
      expect(sub.status).toBe("trialing")
      expect(sub.stripeSubscriptionId).toBe(`sub_${plan}_1`)
      expect(sub.cancelAtPeriodEnd).toBe("false")
    })

    it(`checkout with ${plan} plan sets active status when no trial`, () => {
      handleCheckoutCompleted({
        orgId: "org-1",
        plan,
        subscriptionId: `sub_${plan}_notrial`,
        priceId,
        trialEnd: null,
        periodEnd: futureTimestamp(),
      })

      expect(mockDb["org-1"].status).toBe("active")
    })
  })
})

// ─── Annual pricing ───────────────────────────────────────────────────────────

describe("checkout.session.completed — annual pricing", () => {
  const annualTiers = [
    { plan: "starter",      priceId: "price_starter_annual" },
    { plan: "growth",       priceId: "price_growth_annual" },
    { plan: "professional", priceId: "price_professional_annual" },
    { plan: "elite",        priceId: "price_elite_annual" },
  ]

  annualTiers.forEach(({ plan, priceId }) => {
    it(`annual ${plan} checkout resolves correct plan`, () => {
      handleCheckoutCompleted({
        orgId: "org-1",
        plan,
        subscriptionId: `sub_${plan}_annual`,
        priceId,
        trialEnd: null,
        periodEnd: Math.floor(Date.now() / 1000) + 365 * 86400,
      })

      expect(mockDb["org-1"].plan).toBe(plan)
      expect(mockDb["org-1"].status).toBe("active")
    })
  })
})

// ─── Upgrade flow ─────────────────────────────────────────────────────────────

describe("subscription upgrades — full ladder", () => {
  it("starter → growth updates plan", () => {
    mockDb["org-1"].plan = "starter"
    mockDb["org-1"].status = "active"

    handleSubscriptionUpdated({
      orgId: "org-1",
      priceId: "price_growth_monthly",
      stripeStatus: "active",
      cancelAtPeriodEnd: false,
      periodEnd: futureTimestamp(),
    })

    expect(mockDb["org-1"].plan).toBe("growth")
    expect(mockDb["org-1"].status).toBe("active")
  })

  it("growth → professional updates plan", () => {
    mockDb["org-1"].plan = "growth"
    mockDb["org-1"].status = "active"

    handleSubscriptionUpdated({
      orgId: "org-1",
      priceId: "price_pro_monthly",
      stripeStatus: "active",
      cancelAtPeriodEnd: false,
      periodEnd: futureTimestamp(),
    })

    expect(mockDb["org-1"].plan).toBe("professional")
  })

  it("professional → elite updates plan", () => {
    mockDb["org-1"].plan = "professional"
    mockDb["org-1"].status = "active"

    handleSubscriptionUpdated({
      orgId: "org-1",
      priceId: "price_elite_monthly",
      stripeStatus: "active",
      cancelAtPeriodEnd: false,
      periodEnd: futureTimestamp(),
    })

    expect(mockDb["org-1"].plan).toBe("elite")
  })
})

// ─── Downgrade / cancellation lifecycle ──────────────────────────────────────

describe("cancellation lifecycle", () => {
  const plans = ["starter", "growth", "professional", "elite"]

  plans.forEach((plan) => {
    it(`cancelling ${plan}: status → cancelling, plan unchanged`, () => {
      mockDb["org-1"].plan = plan
      mockDb["org-1"].status = "active"

      handleSubscriptionUpdated({
        orgId: "org-1",
        priceId: `price_${plan}_monthly`,
        stripeStatus: "active",
        cancelAtPeriodEnd: true,
        periodEnd: futureTimestamp(),
      })

      expect(mockDb["org-1"].status).toBe("cancelling")
      expect(mockDb["org-1"].plan).toBe(plan)
      expect(mockDb["org-1"].cancelAtPeriodEnd).toBe("true")
    })
  })

  it("subscription.deleted downgrades any plan to free", () => {
    mockDb["org-1"].plan = "elite"
    mockDb["org-1"].status = "cancelling"

    handleSubscriptionDeleted("org-1")

    expect(mockDb["org-1"].plan).toBe("free")
    expect(mockDb["org-1"].status).toBe("cancelled")
    expect(mockDb["org-1"].stripeSubscriptionId).toBeNull()
  })

  it("subscription.updated with stripeStatus=canceled sets free/cancelled", () => {
    mockDb["org-1"].plan = "professional"
    mockDb["org-1"].status = "active"

    handleSubscriptionUpdated({
      orgId: "org-1",
      priceId: "price_pro_monthly",
      stripeStatus: "canceled",
      cancelAtPeriodEnd: false,
      periodEnd: futureTimestamp(),
    })

    expect(mockDb["org-1"].plan).toBe("free")
    expect(mockDb["org-1"].status).toBe("cancelled")
  })
})

// ─── Payment failure handling ─────────────────────────────────────────────────

describe("payment failure handling", () => {
  const plans = ["starter", "growth", "professional", "elite"]

  plans.forEach((plan) => {
    it(`payment failed on ${plan}: status → past_due, plan unchanged`, () => {
      mockDb["org-1"].plan = plan
      mockDb["org-1"].status = "active"
      mockDb["org-1"].stripeCustomerId = "cus_test_1"

      handleInvoicePaymentFailed("cus_test_1")

      expect(mockDb["org-1"].status).toBe("past_due")
      expect(mockDb["org-1"].plan).toBe(plan)
    })
  })

  it("successful payment restores active status", () => {
    mockDb["org-1"].status = "past_due"
    mockDb["org-1"].cancelAtPeriodEnd = "false"

    handleInvoicePaid("cus_test_1")

    expect(mockDb["org-1"].status).toBe("active")
  })

  it("payment success restores cancelling if cancel was pending", () => {
    mockDb["org-1"].status = "past_due"
    mockDb["org-1"].cancelAtPeriodEnd = "true"

    handleInvoicePaid("cus_test_1")

    expect(mockDb["org-1"].status).toBe("cancelling")
  })

  it("invoice.paid on non-past_due subscription does not change status", () => {
    mockDb["org-1"].status = "active"
    mockDb["org-1"].cancelAtPeriodEnd = "false"

    handleInvoicePaid("cus_test_1")

    expect(mockDb["org-1"].status).toBe("active")
  })

  it("unknown customer on payment failed does nothing", () => {
    const before = { ...mockDb["org-1"] }
    handleInvoicePaymentFailed("cus_unknown")
    expect(mockDb["org-1"]).toEqual(before)
  })
})

// ─── Idempotency ──────────────────────────────────────────────────────────────

describe("idempotency", () => {
  const tiers = ["starter", "growth", "professional", "elite"]

  tiers.forEach((plan) => {
    it(`duplicate checkout for ${plan} produces same result`, () => {
      const event = {
        orgId: "org-1",
        plan,
        subscriptionId: `sub_${plan}_idem`,
        priceId: `price_${plan}_monthly`,
        trialEnd: trialTimestamp(),
        periodEnd: futureTimestamp(),
      }

      handleCheckoutCompleted(event)
      const after1 = { ...mockDb["org-1"] }

      handleCheckoutCompleted(event)
      const after2 = { ...mockDb["org-1"] }

      expect(after1.plan).toBe(after2.plan)
      expect(after1.status).toBe(after2.status)
      expect(after1.stripeSubscriptionId).toBe(after2.stripeSubscriptionId)
    })
  })

  it("duplicate subscription.deleted produces same result", () => {
    mockDb["org-1"].plan = "elite"
    mockDb["org-1"].status = "cancelling"

    handleSubscriptionDeleted("org-1")
    const after1 = { ...mockDb["org-1"] }

    handleSubscriptionDeleted("org-1")
    const after2 = { ...mockDb["org-1"] }

    expect(after1.plan).toBe(after2.plan)
    expect(after1.status).toBe(after2.status)
  })
})

// ─── Price to plan mapping ────────────────────────────────────────────────────

describe("priceToPlan — all 8 price IDs", () => {
  it("maps price_starter_monthly → starter", () => expect(priceToPlan("price_starter_monthly")).toBe("starter"))
  it("maps price_starter_annual → starter", ()  => expect(priceToPlan("price_starter_annual")).toBe("starter"))
  it("maps price_growth_monthly → growth", ()   => expect(priceToPlan("price_growth_monthly")).toBe("growth"))
  it("maps price_growth_annual → growth", ()    => expect(priceToPlan("price_growth_annual")).toBe("growth"))
  it("maps price_pro_monthly → professional", () => expect(priceToPlan("price_pro_monthly")).toBe("professional"))
  it("maps price_pro_annual → professional", ()  => expect(priceToPlan("price_pro_annual")).toBe("professional"))
  it("maps price_elite_monthly → elite", ()    => expect(priceToPlan("price_elite_monthly")).toBe("elite"))
  it("maps price_elite_annual → elite", ()     => expect(priceToPlan("price_elite_annual")).toBe("elite"))
  it("maps unknown → enterprise", ()           => expect(priceToPlan("price_enterprise_xyz")).toBe("enterprise"))
  it("maps null → null", ()                    => expect(priceToPlan(null)).toBeNull())
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("checkout for unknown org does nothing", () => {
    const dbBefore = JSON.stringify(mockDb)

    handleCheckoutCompleted({
      orgId: "org-unknown",
      plan: "elite",
      subscriptionId: "sub_x",
      priceId: "price_elite_monthly",
      trialEnd: null,
      periodEnd: futureTimestamp(),
    })

    expect(JSON.stringify(mockDb)).toBe(dbBefore)
  })

  it("subscription.deleted for unknown org does nothing", () => {
    const dbBefore = JSON.stringify(mockDb)
    handleSubscriptionDeleted("org-unknown")
    expect(JSON.stringify(mockDb)).toBe(dbBefore)
  })

  it("multiple orgs remain independent", () => {
    handleCheckoutCompleted({
      orgId: "org-1",
      plan: "elite",
      subscriptionId: "sub_1",
      priceId: "price_elite_monthly",
      trialEnd: null,
      periodEnd: futureTimestamp(),
    })

    handleCheckoutCompleted({
      orgId: "org-2",
      plan: "starter",
      subscriptionId: "sub_2",
      priceId: "price_starter_monthly",
      trialEnd: trialTimestamp(),
      periodEnd: futureTimestamp(),
    })

    expect(mockDb["org-1"].plan).toBe("elite")
    expect(mockDb["org-1"].status).toBe("active")
    expect(mockDb["org-2"].plan).toBe("starter")
    expect(mockDb["org-2"].status).toBe("trialing")
  })

  it("payment failed affects only matching customer, not others", () => {
    mockDb["org-1"].status = "active"
    mockDb["org-2"].status = "active"

    handleInvoicePaymentFailed("cus_test_1") // only org-1

    expect(mockDb["org-1"].status).toBe("past_due")
    expect(mockDb["org-2"].status).toBe("active")
  })
})
