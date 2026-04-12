/**
 * ============================================================================
 * TEST FILE: edge-plaid-exchange-token.test.ts
 * ============================================================================
 *
 * Tests the plaid-exchange-token Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Valid public_token → exchanges for access_token, stores in Vault, creates assets
 *   • Plaid token exchange fails → returns 502
 *   • Missing required fields → returns 400
 *   • No Authorization header → returns 401
 *   • Creates asset + valuation for each Plaid account
 *   • Creates integration record on first connect
 *   • Updates integration record on reconnect
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Deno shim ────────────────────────────────────────────────────────────────

let capturedHandler: ((req: Request) => Promise<Response>) | null = null

const mockDenoEnv: Record<string, string> = {}

;(globalThis as Record<string, unknown>).Deno = {
  env: {
    get: (key: string) => mockDenoEnv[key],
  },
  serve: (handler: (req: Request) => Promise<Response>) => {
    capturedHandler = handler
  },
}

// ─── Mock @supabase/supabase-js ──────────────────────────────────────────────

const mockAuthGetUser = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockSupabaseRpc = vi.fn()

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockAuthGetUser },
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}))

// ─── Mock global fetch ───────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// ─── Import Edge Function ─────────────────────────────────────────────────────

await import("../../supabase/functions/plaid-exchange-token/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(
  body?: Record<string, unknown>,
  authHeader = "Bearer valid-token"
): Request {
  return new Request("http://localhost/functions/v1/plaid-exchange-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const VALID_BODY = {
  publicToken: "public-sandbox-abc-123",
  orgId: "org-1",
  entityId: "entity-1",
  institutionName: "Chase Bank",
  institutionId: "ins_3",
  accounts: [{ id: "acct-1" }],
}

const PLAID_EXCHANGE_RESPONSE = {
  access_token: "access-sandbox-xyz",
  item_id: "item-abc-123",
}

const PLAID_BALANCE_RESPONSE = {
  accounts: [
    {
      account_id: "acct-1",
      name: "Checking Account",
      official_name: "Chase Total Checking",
      mask: "1234",
      type: "depository",
      subtype: "checking",
      balances: {
        current: 12500.00,
        available: 12000.00,
        iso_currency_code: "USD",
      },
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["SUPABASE_URL"] = "https://test.supabase.co"
  mockDenoEnv["SUPABASE_ANON_KEY"] = "anon-key"
  mockDenoEnv["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"
  mockDenoEnv["PLAID_CLIENT_ID"] = "plaid-client-id"
  mockDenoEnv["PLAID_SECRET"] = "plaid-secret"
  mockDenoEnv["PLAID_ENV"] = "sandbox"

  // Default auth: authenticated
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "user@example.com" } },
    error: null,
  })
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach((k) => delete mockDenoEnv[k])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("plaid-exchange-token edge function", () => {
  // ── CORS / method ─────────────────────────────────────────────────────────

  it("returns 200 CORS headers for OPTIONS preflight", async () => {
    const req = new Request("http://localhost/functions/v1/plaid-exchange-token", {
      method: "OPTIONS",
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })

  it("returns 405 for GET requests", async () => {
    const req = new Request("http://localhost/functions/v1/plaid-exchange-token", {
      method: "GET",
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(405)
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 when Authorization header is missing", async () => {
    const req = new Request("http://localhost/functions/v1/plaid-exchange-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(401)
  })

  it("returns 401 when getUser returns null user", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Expired") })

    const res = await capturedHandler!(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
  })

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when publicToken is missing", async () => {
    const res = await capturedHandler!(makeRequest({ orgId: "org-1", entityId: "entity-1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("publicToken")
  })

  it("returns 400 when orgId is missing", async () => {
    const res = await capturedHandler!(
      makeRequest({ publicToken: "public-token", entityId: "entity-1" })
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when entityId is missing", async () => {
    const res = await capturedHandler!(
      makeRequest({ publicToken: "public-token", orgId: "org-1" })
    )
    expect(res.status).toBe(400)
  })

  // ── Plaid API error ───────────────────────────────────────────────────────

  it("returns 502 when Plaid token exchange fails", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error_message: "Invalid public token", error_code: "INVALID_PUBLIC_TOKEN" }),
        { status: 400 }
      )
    )

    const res = await capturedHandler!(makeRequest(VALID_BODY))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toContain("Token exchange failed")
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it("exchanges public token, stores in Vault, creates assets and valuations", async () => {
    // Plaid token exchange → success
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify(PLAID_EXCHANGE_RESPONSE), { status: 200 })
      )
      // Plaid balance/get → success
      .mockResolvedValueOnce(
        new Response(JSON.stringify(PLAID_BALANCE_RESPONSE), { status: 200 })
      )

    // Vault create secret
    mockSupabaseRpc.mockResolvedValue({ data: "vault-secret-id-1", error: null })

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "asset-new-1" }, error: null }),
    })
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "integration-1" }, error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // no existing integration
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: "integration-1" }, error: null }),
          }),
          update: mockUpdate,
        }
      }
      if (table === "assets") {
        return { insert: mockInsert }
      }
      if (table === "valuations") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      if (table === "ledger_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: mockUpdate,
      }
    })

    const res = await capturedHandler!(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.assetsCreated).toBe(1)
    expect(json.itemId).toBe("item-abc-123")

    // Vault should have been called with the access_token
    expect(mockSupabaseRpc).toHaveBeenCalledWith(
      "vault_create_secret",
      expect.objectContaining({
        secret: expect.stringContaining("access-sandbox-xyz"),
      })
    )
  })

  it("creates a new integration record when no existing integration found", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify(PLAID_EXCHANGE_RESPONSE), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accounts: [] }), { status: 200 }) // no accounts to sync
      )

    mockSupabaseRpc.mockResolvedValue({ data: "vault-id", error: null })

    const mockIntegrationInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-integration-id" }, error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: mockIntegrationInsert,
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === "ledger_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)

    expect(mockIntegrationInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-1",
        provider: "plaid",
        status: "connected",
        external_item_id: "item-abc-123",
      })
    )
  })

  it("updates existing integration record on reconnect", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify(PLAID_EXCHANGE_RESPONSE), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accounts: [] }), { status: 200 })
      )

    mockSupabaseRpc.mockResolvedValue({ data: "vault-id", error: null })

    const mockIntegrationUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "existing-integration-id" }, error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "existing-integration-id" },
            error: null,
          }),
          update: mockIntegrationUpdate,
        }
      }
      if (table === "ledger_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }
    })

    const res = await capturedHandler!(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)

    expect(mockIntegrationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "connected",
        external_item_id: "item-abc-123",
      })
    )
  })
})
