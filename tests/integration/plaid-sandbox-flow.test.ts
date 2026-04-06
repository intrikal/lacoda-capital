/**
 * ============================================================================
 * TEST FILE: plaid-sandbox-flow.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the complete Plaid Link flow from start to finish.
 * It's an INTEGRATION test, which means it tests multiple pieces of our
 * code working together — not just one function in isolation.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS AN INTEGRATION TEST?                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Unit tests test ONE function with fake inputs.                          │
 * │ Integration tests test a WHOLE FLOW with realistic (but mocked)        │
 * │ external dependencies.                                                  │
 * │                                                                         │
 * │ Here we mock:                                                           │
 * │   - The DB (so we don't need a real Postgres database)                 │
 * │   - The Plaid API (so we don't make real HTTP calls)                   │
 * │                                                                         │
 * │ But we let the REAL code run:                                           │
 * │   - lib/integrations/plaid.ts (exchangePublicToken, createLinkToken)   │
 * │   - lib/actions/integration.actions.ts                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THE FLOW WE'RE TESTING                                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  Step 1: createLinkToken()                                              │
 * │    → Server calls POST /link/token/create on Plaid                     │
 * │    → Returns link_token to the browser                                 │
 * │    → Browser uses it to open Plaid Link                                │
 * │                                                                         │
 * │  Step 2: Plaid Link (browser-side, not tested here)                    │
 * │    → User logs into their bank                                         │
 * │    → Plaid gives the browser a public_token                            │
 * │                                                                         │
 * │  Step 3: exchangePublicToken(public_token)                              │
 * │    → Server calls POST /item/public_token/exchange                     │
 * │    → Gets back access_token + item_id                                  │
 * │    → Calls /item/get to get institution_id                             │
 * │    → Calls /institutions/get_by_id to get display name                 │
 * │    → Creates integration record in DB                                  │
 * │    → Returns { integrationId, itemId }                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/plaid.ts            — functions under test
 *   lib/actions/integration.actions.ts  — server actions (thin wrappers)
 *   app/api/webhooks/plaid/route.ts      — webhook handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mock: Plaid API (fetch) ──────────────────────────────────────────────
//
// We intercept global fetch so our code thinks it's talking to Plaid,
// but it's actually talking to our controlled test responses.

// ─── Mock: Database ──────────────────────────────────────────────────────

vi.mock("@/app/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      integrations: {
        findFirst: vi.fn(),
      },
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}))

// ─── Test Fixtures ────────────────────────────────────────────────────────

const SANDBOX_LINK_TOKEN = "link-sandbox-abc123def456-7890abcdef12"
const SANDBOX_PUBLIC_TOKEN = "public-sandbox-abc123def456-7890abcdef12"
const SANDBOX_ACCESS_TOKEN = "access-sandbox-abc123def456-7890abcdef12"
const PLAID_ITEM_ID = "item_abc123def456"
const INSTITUTION_ID = "ins_3"
const INSTITUTION_NAME = "Chase"

const ORG_ID = "org_test_001"
const USER_ID = "user_test_001"
const INTEGRATION_ID = "intg_test_001"

// ─── Plaid API mock responses ─────────────────────────────────────────────

function makePlaidFetchMock(responses: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const endpoint = new URL(url).pathname

    if (endpoint in responses) {
      return new Response(JSON.stringify(responses[endpoint]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({ error_code: "NOT_FOUND", error_message: `No mock for ${endpoint}` }),
      { status: 404 },
    )
  })
}

// ============================================================================
// 1. createLinkToken — Step 1 of the Plaid Link flow
// ============================================================================

describe("createLinkToken()", () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    process.env.PLAID_CLIENT_ID = "test_client_id"
    process.env.PLAID_SECRET = "test_secret"
    process.env.PLAID_ENV = "sandbox"
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.lacoda.com"
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("calls Plaid /link/token/create with correct payload", async () => {
    const mockFetch = makePlaidFetchMock({
      "/link/token/create": {
        link_token: SANDBOX_LINK_TOKEN,
        expiration: "2024-01-15T12:00:00Z",
        request_id: "req_123",
      },
    })
    global.fetch = mockFetch

    const { createLinkToken } = await import("@/lib/integrations/plaid")
    const token = await createLinkToken(USER_ID, ORG_ID)

    expect(token).toBe(SANDBOX_LINK_TOKEN)

    // Verify the request body
    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1]?.body as string)
    expect(body.user.client_user_id).toBe(USER_ID)
    expect(body.client_name).toBe("Lacoda Capital")
    expect(body.products).toContain("auth")
    expect(body.products).toContain("transactions")
    expect(body.products).toContain("investments")
    expect(body.country_codes).toContain("US")
    expect(body.webhook).toContain("/api/webhooks/plaid")
  })

  it("returns the link_token string (not the full response object)", async () => {
    global.fetch = makePlaidFetchMock({
      "/link/token/create": {
        link_token: SANDBOX_LINK_TOKEN,
        expiration: "2024-01-15T12:00:00Z",
        request_id: "req_456",
      },
    })

    const { createLinkToken } = await import("@/lib/integrations/plaid")
    const token = await createLinkToken(USER_ID, ORG_ID)

    expect(typeof token).toBe("string")
    expect(token).toBe(SANDBOX_LINK_TOKEN)
  })

  it("throws when Plaid returns an error", async () => {
    global.fetch = vi.fn(() => Promise.resolve(
      new Response(
        JSON.stringify({
          error_type: "INVALID_REQUEST",
          error_code: "MISSING_FIELDS",
          error_message: "client_id is required",
        }),
        { status: 400 },
      ),
    )) as unknown as typeof globalThis.fetch

    const { createLinkToken } = await import("@/lib/integrations/plaid")
    await expect(createLinkToken(USER_ID, ORG_ID)).rejects.toThrow()
  })

  it("includes webhook URL pointing to our /api/webhooks/plaid route", async () => {
    const mockFetch = makePlaidFetchMock({
      "/link/token/create": {
        link_token: SANDBOX_LINK_TOKEN,
        expiration: "2024-01-15T12:00:00Z",
        request_id: "req_789",
      },
    })
    global.fetch = mockFetch

    const { createLinkToken } = await import("@/lib/integrations/plaid")
    await createLinkToken(USER_ID, ORG_ID)

    const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
    expect(callBody.webhook).toMatch(/\/api\/webhooks\/plaid$/)
  })
})

// ============================================================================
// 2. exchangePublicToken — Step 3 of the Plaid Link flow
// ============================================================================

describe("exchangePublicToken()", () => {
  let originalFetch: typeof global.fetch

  beforeEach(async () => {
    originalFetch = global.fetch
    process.env.PLAID_CLIENT_ID = "test_client_id"
    process.env.PLAID_SECRET = "test_secret"
    process.env.PLAID_ENV = "sandbox"

    // Set up DB mock to simulate successful insert
    const { db } = await import("@/app/db")
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: INTEGRATION_ID,
            orgId: ORG_ID,
            provider: "plaid",
            name: INSTITUTION_NAME,
            status: "connected",
            connectedBy: USER_ID,
            settings: {
              environment: "sandbox",
              _access_token: SANDBOX_ACCESS_TOKEN,
            },
          },
        ]),
      }),
    } as never)
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("exchanges public token for access token and creates integration record", async () => {
    global.fetch = makePlaidFetchMock({
      "/item/public_token/exchange": {
        access_token: SANDBOX_ACCESS_TOKEN,
        item_id: PLAID_ITEM_ID,
        request_id: "req_exchange_001",
      },
      "/item/get": {
        item: { institution_id: INSTITUTION_ID },
        request_id: "req_item_001",
      },
      "/institutions/get_by_id": {
        institution: { name: INSTITUTION_NAME },
        request_id: "req_inst_001",
      },
    })

    const { exchangePublicToken } = await import("@/lib/integrations/plaid")
    const result = await exchangePublicToken(SANDBOX_PUBLIC_TOKEN, ORG_ID, USER_ID)

    expect(result.integrationId).toBe(INTEGRATION_ID)
    expect(result.itemId).toBe(PLAID_ITEM_ID)
  })

  it("stores the access token in settings._access_token", async () => {
    global.fetch = makePlaidFetchMock({
      "/item/public_token/exchange": {
        access_token: SANDBOX_ACCESS_TOKEN,
        item_id: PLAID_ITEM_ID,
        request_id: "req_001",
      },
      "/item/get": {
        item: { institution_id: INSTITUTION_ID },
        request_id: "req_002",
      },
      "/institutions/get_by_id": {
        institution: { name: INSTITUTION_NAME },
        request_id: "req_003",
      },
    })

    const { exchangePublicToken } = await import("@/lib/integrations/plaid")
    await exchangePublicToken(SANDBOX_PUBLIC_TOKEN, ORG_ID, USER_ID)

    const { db } = await import("@/app/db")
    const insertMock = vi.mocked(db.insert)
    const valuesMock = insertMock.mock.results[0].value.values

    const insertedRecord = valuesMock.mock.calls[0][0]
    expect(insertedRecord.settings._access_token).toBe(SANDBOX_ACCESS_TOKEN)
  })

  it("creates integration record with status 'connected'", async () => {
    global.fetch = makePlaidFetchMock({
      "/item/public_token/exchange": {
        access_token: SANDBOX_ACCESS_TOKEN,
        item_id: PLAID_ITEM_ID,
        request_id: "req_001",
      },
      "/item/get": {
        item: { institution_id: INSTITUTION_ID },
        request_id: "req_002",
      },
      "/institutions/get_by_id": {
        institution: { name: INSTITUTION_NAME },
        request_id: "req_003",
      },
    })

    const { exchangePublicToken } = await import("@/lib/integrations/plaid")
    await exchangePublicToken(SANDBOX_PUBLIC_TOKEN, ORG_ID, USER_ID)

    const { db } = await import("@/app/db")
    const valuesMock = vi.mocked(db.insert).mock.results[0].value.values
    const insertedRecord = valuesMock.mock.calls[0][0]

    expect(insertedRecord.status).toBe("connected")
    expect(insertedRecord.provider).toBe("plaid")
    expect(insertedRecord.orgId).toBe(ORG_ID)
    expect(insertedRecord.connectedBy).toBe(USER_ID)
  })

  it("sets the institution name from Plaid on the record", async () => {
    global.fetch = makePlaidFetchMock({
      "/item/public_token/exchange": {
        access_token: SANDBOX_ACCESS_TOKEN,
        item_id: PLAID_ITEM_ID,
        request_id: "req_001",
      },
      "/item/get": {
        item: { institution_id: INSTITUTION_ID },
        request_id: "req_002",
      },
      "/institutions/get_by_id": {
        institution: { name: "JPMorgan Chase" },
        request_id: "req_003",
      },
    })

    const { exchangePublicToken } = await import("@/lib/integrations/plaid")
    await exchangePublicToken(SANDBOX_PUBLIC_TOKEN, ORG_ID, USER_ID)

    const { db } = await import("@/app/db")
    const valuesMock = vi.mocked(db.insert).mock.results[0].value.values
    expect(valuesMock.mock.calls[0][0].name).toBe("JPMorgan Chase")
  })

  it("falls back to 'Bank Account' name when institution lookup fails", async () => {
    global.fetch = makePlaidFetchMock({
      "/item/public_token/exchange": {
        access_token: SANDBOX_ACCESS_TOKEN,
        item_id: PLAID_ITEM_ID,
        request_id: "req_001",
      },
      "/item/get": {
        item: { institution_id: INSTITUTION_ID },
        request_id: "req_002",
      },
      // No /institutions/get_by_id mock → will 404 → should catch and use default
    })

    const { exchangePublicToken } = await import("@/lib/integrations/plaid")
    await exchangePublicToken(SANDBOX_PUBLIC_TOKEN, ORG_ID, USER_ID)

    const { db } = await import("@/app/db")
    const valuesMock = vi.mocked(db.insert).mock.results[0].value.values
    expect(valuesMock.mock.calls[0][0].name).toBe("Bank Account")
  })

  it("throws when the public token exchange fails", async () => {
    global.fetch = vi.fn(() => Promise.resolve(
      new Response(
        JSON.stringify({
          error_code: "INVALID_PUBLIC_TOKEN",
          error_message: "the provided public token is expired or invalid",
        }),
        { status: 400 },
      ),
    )) as unknown as typeof globalThis.fetch

    const { exchangePublicToken } = await import("@/lib/integrations/plaid")
    await expect(
      exchangePublicToken("invalid-token", ORG_ID, USER_ID),
    ).rejects.toThrow()
  })

  it("sets externalAccountId to the Plaid item_id", async () => {
    global.fetch = makePlaidFetchMock({
      "/item/public_token/exchange": {
        access_token: SANDBOX_ACCESS_TOKEN,
        item_id: PLAID_ITEM_ID,
        request_id: "req_001",
      },
      "/item/get": {
        item: { institution_id: INSTITUTION_ID },
        request_id: "req_002",
      },
      "/institutions/get_by_id": {
        institution: { name: INSTITUTION_NAME },
        request_id: "req_003",
      },
    })

    const { exchangePublicToken } = await import("@/lib/integrations/plaid")
    await exchangePublicToken(SANDBOX_PUBLIC_TOKEN, ORG_ID, USER_ID)

    const { db } = await import("@/app/db")
    const valuesMock = vi.mocked(db.insert).mock.results[0].value.values
    expect(valuesMock.mock.calls[0][0].externalAccountId).toBe(PLAID_ITEM_ID)
  })
})

// ============================================================================
// 3. isPlaidConfigured() — feature flag check
// ============================================================================

describe("isPlaidConfigured()", () => {
  afterEach(() => {
    delete process.env.PLAID_CLIENT_ID
    delete process.env.PLAID_SECRET
    vi.resetModules()
  })

  it("returns true when both env vars are set", async () => {
    process.env.PLAID_CLIENT_ID = "client_id_123"
    process.env.PLAID_SECRET = "secret_abc"
    const { isPlaidConfigured } = await import("@/lib/integrations/plaid")
    expect(isPlaidConfigured()).toBe(true)
  })

  it("returns false when PLAID_CLIENT_ID is missing", async () => {
    delete process.env.PLAID_CLIENT_ID
    process.env.PLAID_SECRET = "secret_abc"
    vi.resetModules()
    const { isPlaidConfigured } = await import("@/lib/integrations/plaid")
    expect(isPlaidConfigured()).toBe(false)
  })

  it("returns false when PLAID_SECRET is missing", async () => {
    process.env.PLAID_CLIENT_ID = "client_id_123"
    delete process.env.PLAID_SECRET
    vi.resetModules()
    const { isPlaidConfigured } = await import("@/lib/integrations/plaid")
    expect(isPlaidConfigured()).toBe(false)
  })

  it("returns false when both are missing", async () => {
    delete process.env.PLAID_CLIENT_ID
    delete process.env.PLAID_SECRET
    vi.resetModules()
    const { isPlaidConfigured } = await import("@/lib/integrations/plaid")
    expect(isPlaidConfigured()).toBe(false)
  })
})

// ============================================================================
// 4. Unique constraint — org can only have ONE Plaid integration
// ============================================================================

describe("org uniqueness — one Plaid integration per org", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("DB insert fails with unique constraint when org already has Plaid", async () => {
    // Simulate a DB unique constraint violation
    const { db } = await import("@/app/db")
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(
          Object.assign(new Error("duplicate key value violates unique constraint"), {
            code: "23505",
            constraint: "integrations_org_id_provider_unique",
          }),
        ),
      }),
    } as never)

    global.fetch = makePlaidFetchMock({
      "/item/public_token/exchange": {
        access_token: SANDBOX_ACCESS_TOKEN,
        item_id: PLAID_ITEM_ID,
        request_id: "req_001",
      },
      "/item/get": {
        item: { institution_id: INSTITUTION_ID },
        request_id: "req_002",
      },
      "/institutions/get_by_id": {
        institution: { name: INSTITUTION_NAME },
        request_id: "req_003",
      },
    })

    const { exchangePublicToken } = await import("@/lib/integrations/plaid")
    await expect(
      exchangePublicToken(SANDBOX_PUBLIC_TOKEN, ORG_ID, USER_ID),
    ).rejects.toThrow(/duplicate key|unique constraint/i)
  })
})

// ============================================================================
// 5. Plaid environment URLs
// ============================================================================

describe("Plaid environment URL routing", () => {
  it("uses sandbox.plaid.com URL in sandbox env", async () => {
    process.env.PLAID_ENV = "sandbox"
    vi.resetModules()

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          link_token: SANDBOX_LINK_TOKEN,
          expiration: "2024-01-15T12:00:00Z",
          request_id: "req_001",
        }),
        { status: 200 },
      ),
    )
    global.fetch = mockFetch

    const { createLinkToken } = await import("@/lib/integrations/plaid")
    await createLinkToken(USER_ID, ORG_ID)

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain("sandbox.plaid.com")
  })

  it("uses production.plaid.com URL in production env", async () => {
    process.env.PLAID_ENV = "production"
    process.env.PLAID_CLIENT_ID = "prod_client_id"
    process.env.PLAID_SECRET = "prod_secret"
    vi.resetModules()

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          link_token: "link-production-abc",
          expiration: "2024-01-15T12:00:00Z",
          request_id: "req_001",
        }),
        { status: 200 },
      ),
    )
    global.fetch = mockFetch

    const { createLinkToken } = await import("@/lib/integrations/plaid")
    await createLinkToken(USER_ID, ORG_ID)

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain("production.plaid.com")

    // Clean up
    process.env.PLAID_ENV = "sandbox"
  })
})
