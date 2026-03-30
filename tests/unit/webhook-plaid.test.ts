/**
 * ============================================================================
 * TEST FILE: webhook-plaid.test.ts
 * ============================================================================
 *
 * Kevin, this tests the Plaid webhook route handler at
 * /api/webhooks/plaid/route.ts.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW PLAID WEBHOOKS WORK                                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. A bank account linked via Plaid has new data (transactions, etc.)  │
 * │ 2. Plaid POSTs a JSON event to our /api/webhooks/plaid endpoint       │
 * │ 3. The POST includes a Plaid-Verification header (HMAC-SHA256 hex)    │
 * │ 4. We verify the signature, then find the matching integration by     │
 * │    item_id and update it                                               │
 * │                                                                        │
 * │ We test:                                                               │
 * │   • Missing Plaid-Verification header → 400                           │
 * │   • Missing PLAID_WEBHOOK_SECRET env var → 500                        │
 * │   • Invalid signature → 400                                           │
 * │   • Tampered body → 400                                               │
 * │   • Invalid JSON → 400                                                │
 * │   • Unknown item_id → 200 (silent skip, no crash)                    │
 * │   • TRANSACTIONS events (SYNC_UPDATES_AVAILABLE, INITIAL, HISTORICAL)│
 * │   • HOLDINGS DEFAULT_UPDATE → updates lastSyncAt                     │
 * │   • ITEM ERROR → sets integration status to "error"                  │
 * │   • ITEM PENDING_EXPIRATION → warns user to reconnect               │
 * │   • ITEM USER_PERMISSION_REVOKED → disconnects integration          │
 * │   • Unhandled webhook_type → 200                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   app/api/webhooks/plaid/route.ts — route handler under test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createHmac } from "crypto"

// ─── Mock DB before importing route ─────────────────────────────────────────

const mockFindFirst = vi.fn()
const mockUpdateSet = vi.fn().mockReturnThis()
const mockUpdateWhere = vi.fn().mockResolvedValue([])
const mockInsertValues = vi.fn().mockResolvedValue([])
const mockSelectWhere = vi.fn().mockResolvedValue([])

vi.mock("@/app/db", () => ({
  db: {
    query: {
      integrations: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    update: vi.fn().mockReturnValue({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args)
        return { where: mockUpdateWhere }
      },
    }),
    insert: vi.fn().mockReturnValue({
      values: (...args: unknown[]) => { mockInsertValues(...args); return Promise.resolve([]) },
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: (...args: unknown[]) => { mockSelectWhere(...args); return Promise.resolve([]) },
      }),
    }),
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => val),
}))

vi.mock("@/app/db/schema", () => ({
  integrations: { externalAccountId: "externalAccountId", id: "id" },
  assets: { externalId: "externalId", id: "id" },
  valuations: {},
  ledgerEvents: {},
}))

// ─── Mock Plaid integration helpers ─────────────────────────────────────────

vi.mock("@/lib/integrations/plaid", () => ({
  getAccountBalances: vi.fn().mockResolvedValue([]),
  getInvestmentHoldings: vi.fn().mockResolvedValue({ holdings: [], securities: [] }),
}))

// ─── Import the handler ─────────────────────────────────────────────────────

import { POST } from "@/app/api/webhooks/plaid/route"

// ─── Constants ─────────────────────────────────────────────────────────────

const TEST_WEBHOOK_SECRET = "test-plaid-webhook-secret"

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeHmac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex")
}

/** Build a request WITHOUT auto-signing (for testing missing/invalid headers). */
function makeUnsignedRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/webhooks/plaid", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  })
}

/** Build a request with a valid HMAC signature. */
function makeRequest(body: string): Request {
  return makeUnsignedRequest(body, {
    "plaid-verification": computeHmac(body, TEST_WEBHOOK_SECRET),
  })
}

function makePlaidEvent(
  webhookType: string,
  webhookCode: string,
  itemId = "item_test_123",
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    webhook_type: webhookType,
    webhook_code: webhookCode,
    item_id: itemId,
    ...extra,
  })
}

const MOCK_INTEGRATION = {
  id: "integ-001",
  name: "Chase Checking",
  orgId: "org-001",
  externalAccountId: "item_test_123",
  status: "connected",
  statusMessage: null,
  connectedBy: "user-001",
}

// ─── Setup ──────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PLAID_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
  // Default: integration found
  mockFindFirst.mockResolvedValue({ ...MOCK_INTEGRATION })
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ============================================================================
// 1. Signature verification — missing header, missing env, invalid, tampered
// ============================================================================

describe("Plaid webhook — missing Plaid-Verification header", () => {
  it("returns 400 when Plaid-Verification header is absent", async () => {
    const body = makePlaidEvent("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE")
    const req = makeUnsignedRequest(body) // no signature header

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Missing")
  })
})

describe("Plaid webhook — missing PLAID_WEBHOOK_SECRET", () => {
  it("returns 500 when PLAID_WEBHOOK_SECRET is not set", async () => {
    delete process.env.PLAID_WEBHOOK_SECRET

    const body = makePlaidEvent("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE")
    const req = makeUnsignedRequest(body, {
      "plaid-verification": "some-sig",
    })

    const res = await POST(req as never)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toContain("not configured")
  })
})

describe("Plaid webhook — invalid signature", () => {
  it("returns 400 when signature does not match", async () => {
    const body = makePlaidEvent("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE")
    const req = makeUnsignedRequest(body, {
      "plaid-verification": "deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid signature")
  })

  it("returns 400 when body has been tampered with after signing", async () => {
    const originalBody = makePlaidEvent("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE")
    const validSig = computeHmac(originalBody, TEST_WEBHOOK_SECRET)
    const tamperedBody = makePlaidEvent("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE", "item_evil_999")

    const req = makeUnsignedRequest(tamperedBody, {
      "plaid-verification": validSig,
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid signature")
  })
})

// ============================================================================
// 2. Invalid JSON → 400
// ============================================================================

describe("Plaid webhook — invalid JSON", () => {
  it("returns 400 for malformed JSON", async () => {
    const body = "not json {{{"
    const req = makeUnsignedRequest(body, {
      "plaid-verification": computeHmac(body, TEST_WEBHOOK_SECRET),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid JSON")
  })

  it("returns 400 for empty body", async () => {
    const body = ""
    const req = makeUnsignedRequest(body, {
      "plaid-verification": computeHmac(body, TEST_WEBHOOK_SECRET),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })
})

// ============================================================================
// 3. Unknown item_id — no matching integration → 200 (silent skip)
// ============================================================================

describe("Plaid webhook — unknown item_id", () => {
  it("returns 200 when no integration matches the item_id", async () => {
    mockFindFirst.mockResolvedValue(null)

    const body = makePlaidEvent("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE", "item_unknown_999")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("does NOT attempt to update the DB when integration is missing", async () => {
    mockFindFirst.mockResolvedValue(null)

    const body = makePlaidEvent("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE", "item_unknown_999")
    const req = makeRequest(body)

    await POST(req as never)
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 4. TRANSACTIONS — SYNC_UPDATES_AVAILABLE
// ============================================================================

describe("Plaid webhook — TRANSACTIONS / SYNC_UPDATES_AVAILABLE", () => {
  it("returns 200 and updates integration statusMessage", async () => {
    const body = makePlaidEvent("TRANSACTIONS", "SYNC_UPDATES_AVAILABLE")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ statusMessage: "New transactions available" }),
    )
  })
})

// ============================================================================
// 5. TRANSACTIONS — INITIAL_UPDATE and HISTORICAL_UPDATE (log only)
// ============================================================================

describe("Plaid webhook — TRANSACTIONS / INITIAL_UPDATE & HISTORICAL_UPDATE", () => {
  it("returns 200 for INITIAL_UPDATE without DB update", async () => {
    const body = makePlaidEvent("TRANSACTIONS", "INITIAL_UPDATE")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })

  it("returns 200 for HISTORICAL_UPDATE without DB update", async () => {
    const body = makePlaidEvent("TRANSACTIONS", "HISTORICAL_UPDATE")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 6. HOLDINGS — DEFAULT_UPDATE → updates lastSyncAt
// ============================================================================

describe("Plaid webhook — HOLDINGS / DEFAULT_UPDATE", () => {
  it("returns 200 and updates statusMessage + lastSyncAt", async () => {
    const body = makePlaidEvent("HOLDINGS", "DEFAULT_UPDATE")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        statusMessage: "Holdings update available",
        lastSyncAt: expect.any(Date),
      }),
    )
  })
})

// ============================================================================
// 7. ITEM — ERROR → marks integration as "error"
// ============================================================================

describe("Plaid webhook — ITEM / ERROR", () => {
  it("sets integration status to 'error' with error message", async () => {
    const body = makePlaidEvent("ITEM", "ERROR", "item_test_123", {
      error: {
        error_code: "ITEM_LOGIN_REQUIRED",
        error_message: "the login details of this item have changed",
      },
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        statusMessage: "the login details of this item have changed",
      }),
    )
  })

  it("uses fallback message when error object has no message", async () => {
    const body = makePlaidEvent("ITEM", "ERROR", "item_test_123", {
      error: { error_code: "UNKNOWN" },
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        statusMessage: "Connection error",
      }),
    )
  })
})

// ============================================================================
// 8. ITEM — PENDING_EXPIRATION → warns user to reconnect
// ============================================================================

describe("Plaid webhook — ITEM / PENDING_EXPIRATION", () => {
  it("updates statusMessage with reconnect warning", async () => {
    const body = makePlaidEvent("ITEM", "PENDING_EXPIRATION")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        statusMessage: expect.stringContaining("re-verified"),
      }),
    )
  })
})

// ============================================================================
// 9. ITEM — USER_PERMISSION_REVOKED → disconnects integration
// ============================================================================

describe("Plaid webhook — ITEM / USER_PERMISSION_REVOKED", () => {
  it("sets integration status to 'disconnected'", async () => {
    const body = makePlaidEvent("ITEM", "USER_PERMISSION_REVOKED")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "disconnected" }),
    )
  })
})

// ============================================================================
// 10. Unhandled webhook_type → 200 (acknowledge, don't crash)
// ============================================================================

describe("Plaid webhook — unhandled event types", () => {
  it("returns 200 for ASSETS webhook_type (not yet implemented)", async () => {
    const body = makePlaidEvent("ASSETS", "PRODUCT_READY")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("returns 200 for a completely unknown webhook_type", async () => {
    const body = makePlaidEvent("FUTURE_PRODUCT", "SOME_CODE")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })

  it("does NOT update DB for unhandled webhook types", async () => {
    const body = makePlaidEvent("ASSETS", "PRODUCT_READY")
    const req = makeRequest(body)

    await POST(req as never)
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 11. HOLDINGS — non-DEFAULT_UPDATE code → no DB update
// ============================================================================

describe("Plaid webhook — HOLDINGS / non-DEFAULT_UPDATE", () => {
  it("returns 200 but does not update DB for unknown holdings code", async () => {
    const body = makePlaidEvent("HOLDINGS", "SOME_OTHER_CODE")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })
})
