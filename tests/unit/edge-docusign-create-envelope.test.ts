/**
 * ============================================================================
 * TEST FILE: edge-docusign-create-envelope.test.ts
 * ============================================================================
 *
 * Tests the docusign-create-envelope Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Valid request → creates DocuSign envelope, returns envelopeId + signingUrl
 *   • DocuSign not connected → returns 400
 *   • Missing required fields → returns 400
 *   • No Authorization header → returns 401
 *   • DocuSign API error → returns 502
 *   • OPTIONS preflight → returns 200 with CORS headers
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

await import("../../supabase/functions/docusign-create-envelope/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(
  body?: Record<string, unknown>,
  headers: Record<string, string> = {}
): Request {
  return new Request("http://localhost/functions/v1/docusign-create-envelope", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const VALID_BODY = {
  documentRequestId: "req-123",
  orgId: "org-1",
  signerEmail: "signer@example.com",
  signerName: "Jane Signer",
  documentName: "Investment Agreement.pdf",
  returnUrl: "https://app.lacoda.capital/app/vault?signed=true",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["SUPABASE_URL"] = "https://test.supabase.co"
  mockDenoEnv["SUPABASE_ANON_KEY"] = "anon-key"
  mockDenoEnv["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"
  mockDenoEnv["DOCUSIGN_ACCOUNT_ID"] = "acct-123"
  mockDenoEnv["DOCUSIGN_BASE_URL"] = "https://demo.docusign.net/restapi"

  // Default auth: authenticated user
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "user@example.com" } },
    error: null,
  })
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach((k) => delete mockDenoEnv[k])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("docusign-create-envelope edge function", () => {
  // ── CORS preflight ────────────────────────────────────────────────────────

  it("returns 200 with CORS headers for OPTIONS preflight", async () => {
    const req = new Request("http://localhost/functions/v1/docusign-create-envelope", {
      method: "OPTIONS",
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })

  it("returns 405 for non-POST methods", async () => {
    const req = new Request("http://localhost/functions/v1/docusign-create-envelope", {
      method: "GET",
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(405)
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 when Authorization header is missing", async () => {
    const req = new Request("http://localhost/functions/v1/docusign-create-envelope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 401 when user is not authenticated", async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid token"),
    })

    const res = await capturedHandler!(makeRequest(VALID_BODY, { Authorization: "Bearer bad-token" }))
    expect(res.status).toBe(401)
  })

  // ── Missing fields ────────────────────────────────────────────────────────

  it("returns 400 when required fields are missing", async () => {
    const res = await capturedHandler!(
      makeRequest(
        { orgId: "org-1" }, // missing documentRequestId, signerEmail, signerName, documentName
        { Authorization: "Bearer valid-token" }
      )
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Missing required fields")
  })

  // ── DocuSign not connected ────────────────────────────────────────────────

  it("returns 400 when DocuSign integration is not connected", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const res = await capturedHandler!(makeRequest(VALID_BODY, { Authorization: "Bearer valid" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("DocuSign not connected")
  })

  it("returns 400 when DocuSign vault secret exists but access_token is missing", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { vault_secret_id: "secret-1" },
        error: null,
      }),
    })

    mockSupabaseRpc.mockResolvedValue({
      data: JSON.stringify({ item_id: "item-1" }), // no access_token
      error: null,
    })

    const res = await capturedHandler!(makeRequest(VALID_BODY, { Authorization: "Bearer valid" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("credentials expired")
  })

  // ── DocuSign API error ────────────────────────────────────────────────────

  it("returns 502 when DocuSign envelope creation fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { vault_secret_id: "secret-1" },
            error: null,
          }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: "ds-access-token" }),
      error: null,
    })

    // DocuSign envelope API returns error
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "ACCOUNT_LACKS_PERMISSIONS" }), { status: 400 })
    )

    const res = await capturedHandler!(makeRequest(VALID_BODY, { Authorization: "Bearer valid" }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toContain("Failed to create envelope")
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it("creates DocuSign envelope and returns envelopeId and signingUrl", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { vault_secret_id: "secret-1" },
            error: null,
          }),
        }
      }
      if (table === "document_requests") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === "ledger_events") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: "ds-access-token" }),
      error: null,
    })

    // DocuSign create envelope → success
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ envelopeId: "env-abc-123" }), { status: 201 })
      )
      // DocuSign create recipient view → success
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ url: "https://demo.docusign.net/signing/env-abc-123" }),
          { status: 201 }
        )
      )

    const res = await capturedHandler!(makeRequest(VALID_BODY, { Authorization: "Bearer valid" }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.envelopeId).toBe("env-abc-123")
    expect(json.signingUrl).toBe("https://demo.docusign.net/signing/env-abc-123")
  })

  it("still returns envelopeId even when recipient view creation fails", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "integrations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { vault_secret_id: "secret-1" },
            error: null,
          }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: "ds-access-token" }),
      error: null,
    })

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ envelopeId: "env-xyz-456" }), { status: 201 })
      )
      // Recipient view fails → signingUrl should be null
      .mockResolvedValueOnce(new Response("Service unavailable", { status: 503 }))

    const res = await capturedHandler!(makeRequest(VALID_BODY, { Authorization: "Bearer valid" }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.envelopeId).toBe("env-xyz-456")
    expect(json.signingUrl).toBeNull()
  })
})
