/**
 * ============================================================================
 * TEST FILE: edge-plaid-link-token.test.ts
 * ============================================================================
 *
 * Tests the plaid-link-token Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Valid authenticated request → creates Plaid link token, returns it
 *   • Missing Authorization header → returns 401
 *   • Unauthenticated user → returns 401
 *   • Plaid API failure → returns 502
 *   • OPTIONS preflight → returns CORS headers
 *   • Non-POST method → returns 405
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

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockAuthGetUser },
  })),
}))

// ─── Mock global fetch ───────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// ─── Import Edge Function ─────────────────────────────────────────────────────

await import("../../supabase/functions/plaid-link-token/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (authHeader) headers["Authorization"] = authHeader
  return new Request("http://localhost/functions/v1/plaid-link-token", {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["SUPABASE_URL"] = "https://test.supabase.co"
  mockDenoEnv["SUPABASE_ANON_KEY"] = "anon-key"
  mockDenoEnv["PLAID_CLIENT_ID"] = "plaid-client-id"
  mockDenoEnv["PLAID_SECRET"] = "plaid-secret"
  mockDenoEnv["PLAID_ENV"] = "sandbox"

  // Default: authenticated
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "user@example.com" } },
    error: null,
  })
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach((k) => delete mockDenoEnv[k])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("plaid-link-token edge function", () => {
  // ── CORS preflight ────────────────────────────────────────────────────────

  it("returns 200 with CORS headers for OPTIONS preflight", async () => {
    const req = new Request("http://localhost/functions/v1/plaid-link-token", {
      method: "OPTIONS",
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST")
  })

  it("returns 405 for non-POST, non-OPTIONS requests", async () => {
    const req = new Request("http://localhost/functions/v1/plaid-link-token", {
      method: "GET",
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(405)
    const json = await res.json()
    expect(json.error).toContain("Method not allowed")
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 when Authorization header is missing", async () => {
    const res = await capturedHandler!(makeRequest()) // no auth header
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 401 when user is not authenticated", async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Token expired"),
    })

    const res = await capturedHandler!(makeRequest("Bearer expired-token"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  // ── Plaid API failure ─────────────────────────────────────────────────────

  it("returns 502 when Plaid link/token/create fails", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error_message: "Client ID is invalid",
          error_code: "INVALID_CREDENTIALS",
          display_message: "Invalid credentials provided.",
        }),
        { status: 400 }
      )
    )

    const res = await capturedHandler!(makeRequest("Bearer valid"))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toContain("Failed to create link token")
    expect(json.details).toBe("Invalid credentials provided.")
  })

  it("returns 502 and uses error_message when display_message is absent", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error_message: "Something went wrong", error_code: "INTERNAL_SERVER_ERROR" }),
        { status: 500 }
      )
    )

    const res = await capturedHandler!(makeRequest("Bearer valid"))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.details).toBe("Something went wrong")
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns link_token and expiration on success", async () => {
    const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins from now

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          link_token: "link-sandbox-abc-123-xyz",
          expiration,
          request_id: "req-abc",
        }),
        { status: 200 }
      )
    )

    const res = await capturedHandler!(makeRequest("Bearer valid-token"))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.link_token).toBe("link-sandbox-abc-123-xyz")
    expect(json.expiration).toBe(expiration)
  })

  it("calls Plaid with the correct user ID from auth", async () => {
    const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ link_token: "link-token-for-user", expiration }),
        { status: 200 }
      )
    )

    await capturedHandler!(makeRequest("Bearer valid-token"))

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain("sandbox.plaid.com/link/token/create")

    const reqBody = JSON.parse(options.body)
    expect(reqBody.user.client_user_id).toBe("user-1")
    expect(reqBody.client_name).toBe("Lacoda Capital")
    expect(reqBody.products).toContain("auth")
    expect(reqBody.country_codes).toContain("US")
  })

  it("returns CORS header on success response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ link_token: "link-token", expiration: "2030-01-01" }),
        { status: 200 }
      )
    )

    const res = await capturedHandler!(makeRequest("Bearer valid-token"))
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })
})
