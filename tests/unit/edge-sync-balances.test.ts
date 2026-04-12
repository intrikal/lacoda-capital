/**
 * ============================================================================
 * TEST FILE: edge-sync-balances.test.ts
 * ============================================================================
 *
 * Tests the sync-balances Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Connected Plaid accounts → fetches balances, updates assets + valuations
 *   • No connected accounts → returns { synced: 0 }
 *   • Vault read failure → marks integration as error, doesn't throw
 *   • No vault_secret_id → skips integration
 *   • ITEM_LOGIN_REQUIRED → marks integration as disconnected
 *   • Rate limiting (429) → records retry-after, doesn't throw
 *   • Plaid API generic error → logs failure, dispatches critical alert
 *   • OPTIONS preflight → CORS headers
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

const mockSupabaseFrom = vi.fn()
const mockSupabaseRpc = vi.fn()

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}))

// ─── Mock global fetch ───────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// ─── Import Edge Function ─────────────────────────────────────────────────────

await import("../../supabase/functions/sync-balances/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body?: Record<string, unknown>): Request {
  return new Request("http://localhost/functions/v1/sync-balances", {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const PLAID_BALANCE_RESPONSE = {
  accounts: [
    {
      account_id: "acct-plaid-1",
      name: "Total Checking",
      type: "depository",
      subtype: "checking",
      balances: {
        current: 25000.00,
        available: 24500.00,
        iso_currency_code: "USD",
      },
    },
  ],
}

const CONNECTED_INTEGRATION = {
  id: "integration-1",
  org_id: "org-1",
  name: "Chase Bank",
  provider: "plaid",
  status: "connected",
  vault_secret_id: "vault-secret-1",
  sync_history: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["SUPABASE_URL"] = "https://test.supabase.co"
  mockDenoEnv["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"
  mockDenoEnv["PLAID_CLIENT_ID"] = "plaid-client"
  mockDenoEnv["PLAID_SECRET"] = "plaid-secret"
  mockDenoEnv["PLAID_ENV"] = "sandbox"

  // Default: Plaid balance success
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(PLAID_BALANCE_RESPONSE), { status: 200 })
  )
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach((k) => delete mockDenoEnv[k])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("sync-balances edge function", () => {
  // ── CORS preflight ────────────────────────────────────────────────────────

  it("returns 200 with CORS headers for OPTIONS preflight", async () => {
    const req = new Request("http://localhost/functions/v1/sync-balances", {
      method: "OPTIONS",
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })

  // ── No connected accounts ─────────────────────────────────────────────────

  it("returns { synced: 0 } when no connected Plaid integrations exist", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(_resolve, _reject),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.synced).toBe(0)
    expect(json.message).toContain("No connected Plaid integrations")
  })

  // ── No vault_secret_id ────────────────────────────────────────────────────

  it("skips integration when vault_secret_id is missing", async () => {
    const integrationNoVault = { ...CONNECTED_INTEGRATION, vault_secret_id: null }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [integrationNoVault], error: null }).then(_resolve, _reject),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results[0].status).toBe("skipped")
    expect(json.results[0].error).toContain("No vault secret")
  })

  // ── Vault read failure ────────────────────────────────────────────────────

  it("marks integration as error when Vault read fails and doesn't throw", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [CONNECTED_INTEGRATION], error: null }).then(_resolve, _reject),
          update: mockUpdate,
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    // Vault read fails
    mockSupabaseRpc.mockResolvedValue({ data: null, error: new Error("Vault unavailable") })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200) // no throw
    expect(json.results[0].status).toBe("failed")
    expect(json.results[0].error).toContain("Vault read failed")

    // Integration should have been updated to error status
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", last_sync_status: "failed" })
    )
  })

  // ── ITEM_LOGIN_REQUIRED ───────────────────────────────────────────────────

  it("marks integration as disconnected on ITEM_LOGIN_REQUIRED", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [CONNECTED_INTEGRATION], error: null }).then(_resolve, _reject),
          update: mockUpdate,
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: "access-token-123" }),
      error: null,
    })

    // Plaid returns ITEM_LOGIN_REQUIRED
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error_code: "ITEM_LOGIN_REQUIRED", error_message: "Item login required" }),
        { status: 400 }
      )
    )

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results[0].status).toBe("disconnected")
    expect(json.results[0].error).toBe("ITEM_LOGIN_REQUIRED")

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "disconnected" })
    )
  })

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("records rate limiting status without throwing", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [CONNECTED_INTEGRATION], error: null }).then(_resolve, _reject),
          update: mockUpdate,
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: "access-token-123" }),
      error: null,
    })

    // Plaid returns 429
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error_code: "RATE_LIMIT" }), {
        status: 429,
        headers: { "Retry-After": "30" },
      })
    )

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results[0].status).toBe("rate_limited")
    expect(json.results[0].error).toContain("30")
  })

  // ── Successful sync ───────────────────────────────────────────────────────

  it("updates asset current_value and creates valuation for each account", async () => {
    const mockAssetUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const mockValuationInsert = vi.fn().mockResolvedValue({ error: null })
    const mockIntegrationUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [CONNECTED_INTEGRATION], error: null }).then(_resolve, _reject),
          update: mockIntegrationUpdate,
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "asset-existing-1" },
            error: null,
          }),
          update: mockAssetUpdate,
        }
      }
      if (table === "valuations") {
        return { insert: mockValuationInsert }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: "access-token-123" }),
      error: null,
    })

    // Plaid balance success
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(PLAID_BALANCE_RESPONSE), { status: 200 })
    )

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.synced).toBe(1)
    expect(json.results[0].status).toBe("success")
    expect(json.results[0].accountsSynced).toBe(1)

    // Asset current_value updated
    expect(mockAssetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ current_value: "25000" })
    )

    // Valuation created
    expect(mockValuationInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_id: "asset-existing-1",
        value: "25000",
        source: "api_feed",
      })
    )
  })

  // ── Critical alert on sync error ──────────────────────────────────────────

  it("dispatches critical alert when sync throws an unexpected error", async () => {
    mockDenoEnv["DISCORD_WEBHOOK_URL"] = "https://discord.com/api/webhooks/test"
    mockDenoEnv["ALERT_EMAIL_RECIPIENTS"] = "ops@lacoda.capital"

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [CONNECTED_INTEGRATION], error: null }).then(_resolve, _reject),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    })

    // Vault read throws
    mockSupabaseRpc.mockRejectedValue(new Error("Unexpected vault error"))

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200) // doesn't throw
    expect(json.results[0].status).toBe("failed")

    // Discord alert should have been dispatched
    const discordCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("discord.com")
    )
    expect(discordCalls.length).toBeGreaterThanOrEqual(1)
  })

  // ── Targeted sync (single integration) ───────────────────────────────────

  it("syncs a specific integration when integrationId is provided", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [CONNECTED_INTEGRATION], error: null }).then(_resolve, _reject),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // no existing asset
        }
      }
      if (table === "valuations") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: "access-token-specific" }),
      error: null,
    })

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(PLAID_BALANCE_RESPONSE), { status: 200 })
    )

    const res = await capturedHandler!(
      makeRequest({ integrationId: "integration-1", mode: "manual" })
    )
    expect(res.status).toBe(200)

    // Verify the Plaid call used the correct access token
    const plaidCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("plaid.com")
    )
    const plaidBody = JSON.parse(plaidCalls[0][1].body)
    expect(plaidBody.access_token).toBe("access-token-specific")
  })
})
