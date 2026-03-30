/**
 * ============================================================================
 * TEST FILE: webhook-stripe.test.ts
 * ============================================================================
 *
 * Kevin, this tests the Stripe webhook route handler at
 * /api/webhooks/stripe/route.ts.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW STRIPE WEBHOOKS WORK                                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. Something happens in Stripe (invoice paid, subscription changed)    │
 * │ 2. Stripe POSTs a JSON "event" to our /api/webhooks/stripe endpoint   │
 * │ 3. The POST includes a "Stripe-Signature" header for verification     │
 * │ 4. Our handler calls stripe.webhooks.constructEvent() to verify +     │
 * │    parse the event, then acts on it based on event type               │
 * │                                                                        │
 * │ We test:                                                               │
 * │   • Missing signature → 400                                           │
 * │   • Missing webhook secret env var → 500                              │
 * │   • Valid signature → 200 (constructEvent succeeds)                   │
 * │   • Invalid signature → 400 (constructEvent throws)                   │
 * │   • Tampered body → 400 (constructEvent throws)                       │
 * │   • Each event type (invoice.paid, invoice.payment_failed, etc.)      │
 * │   • Unhandled event type → 200 (acknowledge receipt, no crash)        │
 * │   • Missing metadata → silent skip (no crash)                         │
 * │   • invoice.paid → billing record updated to "paid"                   │
 * │   • invoice.payment_failed → billing record updated + alert           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   app/api/webhooks/stripe/route.ts — route handler under test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mock DB before importing route ─────────────────────────────────────────

const mockBillingFindFirst = vi.fn()
const mockOrgMembersFindFirst = vi.fn()
const mockUpdateSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) })
const mockInsertValues = vi.fn().mockResolvedValue([])

vi.mock("@/app/db", () => ({
  db: {
    query: {
      billingRecords: { findFirst: (...args: unknown[]) => mockBillingFindFirst(...args) },
      orgMembers: { findFirst: (...args: unknown[]) => mockOrgMembersFindFirst(...args) },
    },
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: (...args: unknown[]) => { mockUpdateSet(...args); return { where: vi.fn().mockResolvedValue([]) } } }),
    insert: vi.fn().mockReturnValue({ values: (...args: unknown[]) => { mockInsertValues(...args); return Promise.resolve([]) } }),
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
}))

vi.mock("@/app/db/schema", () => ({
  billingRecords: { id: "id" },
  ledgerEvents: {},
  orgMembers: { orgId: "orgId", role: "role" },
}))

// ─── Mock Stripe client ────────────────────────────────────────────────────

const mockConstructEvent = vi.fn()

vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  }),
}))

// ─── Import the handler ─────────────────────────────────────────────────────

import { POST } from "@/app/api/webhooks/stripe/route"

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal NextRequest-like object for the route handler. */
function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  })
}

/** Build a Stripe event JSON string. */
function makeStripeEvent(
  type: string,
  data: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    type,
    data: {
      object: {
        id: `evt_${Date.now()}`,
        metadata: {},
        ...data,
      },
    },
  })
}

// ─── Env setup ──────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_123"
  // Default: constructEvent parses body and returns the event (simulates valid signature)
  mockConstructEvent.mockImplementation((body: string) => JSON.parse(body))
  // Default: no billing record found
  mockBillingFindFirst.mockResolvedValue(null)
  // Default: no org admin found
  mockOrgMembersFindFirst.mockResolvedValue(null)
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ============================================================================
// 1. Missing Stripe-Signature header → 400
// ============================================================================

describe("Stripe webhook — missing signature", () => {
  it("returns 400 when Stripe-Signature header is absent", async () => {
    const body = makeStripeEvent("invoice.paid")
    const req = makeRequest(body) // no headers

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Missing")
  })
})

// ============================================================================
// 2. Missing STRIPE_WEBHOOK_SECRET env var → 500
// ============================================================================

describe("Stripe webhook — missing webhook secret", () => {
  it("returns 500 when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET

    const body = makeStripeEvent("invoice.paid")
    const req = makeRequest(body, { "stripe-signature": "sig_fake" })

    const res = await POST(req as never)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toContain("not configured")
  })
})

// ============================================================================
// 3. Signature verification — valid, invalid, and tampered
// ============================================================================

describe("Stripe webhook — signature verification", () => {
  it("returns 200 when constructEvent succeeds (valid signature)", async () => {
    const body = makeStripeEvent("invoice.paid")
    const req = makeRequest(body, { "stripe-signature": "t=123,v1=abc" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(mockConstructEvent).toHaveBeenCalledWith(
      body,
      "t=123,v1=abc",
      "whsec_test_secret_123",
    )
  })

  it("returns 400 when constructEvent throws (invalid signature)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload")
    })

    const body = makeStripeEvent("invoice.paid")
    const req = makeRequest(body, { "stripe-signature": "sig_invalid" })

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid signature")
  })

  it("returns 400 when body has been tampered with (constructEvent throws)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Webhook payload must be provided as a string")
    })

    const body = "tampered body that is not the original"
    const req = makeRequest(body, { "stripe-signature": "t=123,v1=abc" })

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid signature")
  })

  it("returns 400 for malformed JSON body (constructEvent throws)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid payload")
    })

    const req = makeRequest("this is not json {{{", {
      "stripe-signature": "sig_test",
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid signature")
  })
})

// ============================================================================
// 4. invoice.paid — processes successfully
// ============================================================================

describe("Stripe webhook — invoice.paid", () => {
  it("returns 200 with { received: true } for valid invoice.paid event", async () => {
    const body = makeStripeEvent("invoice.paid", {
      metadata: { lacoda_billing_record_id: "billing-001" },
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.received).toBe(true)
  })

  it("updates billing record to paid when record exists", async () => {
    mockBillingFindFirst.mockResolvedValue({
      id: "billing-001",
      orgId: "org-123",
      clientId: "client-456",
      status: "due",
      metadata: {},
    })
    mockOrgMembersFindFirst.mockResolvedValue({ userId: "admin-user-1" })

    const body = makeStripeEvent("invoice.paid", {
      metadata: { lacoda_billing_record_id: "billing-001" },
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" }),
    )
  })

  it("returns 200 even when metadata has no billing record id (silent skip)", async () => {
    const body = makeStripeEvent("invoice.paid", {
      metadata: {},
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("returns 200 when metadata is missing entirely", async () => {
    const body = JSON.stringify({
      type: "invoice.paid",
      data: { object: { id: "inv_123" } },
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 5. invoice.payment_failed — processes successfully
// ============================================================================

describe("Stripe webhook — invoice.payment_failed", () => {
  it("returns 200 for payment_failed with billing record id", async () => {
    const body = makeStripeEvent("invoice.payment_failed", {
      metadata: { lacoda_billing_record_id: "billing-002" },
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("updates billing record to due when payment fails", async () => {
    mockBillingFindFirst.mockResolvedValue({
      id: "billing-002",
      orgId: "org-123",
      clientId: "client-456",
      status: "upcoming",
      metadata: {},
    })

    const body = makeStripeEvent("invoice.payment_failed", {
      metadata: { lacoda_billing_record_id: "billing-002" },
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "due" }),
    )
  })

  it("returns 200 for payment_failed without billing record id (silent skip)", async () => {
    const body = makeStripeEvent("invoice.payment_failed", {
      metadata: {},
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 6. checkout.session.completed — processes successfully
// ============================================================================

describe("Stripe webhook — checkout.session.completed", () => {
  it("returns 200 for checkout session completed", async () => {
    const body = makeStripeEvent("checkout.session.completed", {
      id: "cs_test_123",
      payment_status: "paid",
      amount_total: 9900,
      currency: "usd",
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })
})

// ============================================================================
// 7. Unhandled event type → 200 (acknowledge, don't crash)
// ============================================================================

describe("Stripe webhook — unhandled event types", () => {
  it("returns 200 for customer.subscription.created (unhandled)", async () => {
    const body = makeStripeEvent("customer.subscription.created")
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("returns 200 for payment_intent.succeeded (unhandled)", async () => {
    const body = makeStripeEvent("payment_intent.succeeded")
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })

  it("returns 200 for a completely unknown event type", async () => {
    const body = makeStripeEvent("some.future.event.type")
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 8. Realistic multi-event scenarios
// ============================================================================

describe("Stripe webhook — realistic payloads", () => {
  it("handles a full invoice.paid payload with nested objects", async () => {
    const body = JSON.stringify({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1NxTestInvoice",
          object: "invoice",
          amount_paid: 4999,
          currency: "usd",
          customer: "cus_OrgCustomer123",
          subscription: "sub_OrgSub456",
          status: "paid",
          metadata: {
            lacoda_billing_record_id: "billing-rec-abc",
            orgId: "org-123",
          },
          lines: {
            data: [
              {
                description: "Lacoda Capital Pro Plan",
                amount: 4999,
                currency: "usd",
              },
            ],
          },
        },
      },
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })

  it("handles a checkout.session.completed with subscription mode", async () => {
    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_session789",
          mode: "subscription",
          subscription: "sub_new_456",
          customer: "cus_new_123",
          metadata: { orgId: "org-456" },
          payment_status: "paid",
        },
      },
    })
    const req = makeRequest(body, { "stripe-signature": "sig_test" })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })
})
