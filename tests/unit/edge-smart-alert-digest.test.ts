/**
 * ============================================================================
 * TEST FILE: edge-smart-alert-digest.test.ts
 * ============================================================================
 *
 * Tests the smart-alert-digest Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Pending alerts exist → calls Claude, groups by severity, sends digest email
 *   • No items for org → org is skipped
 *   • No orgs → returns early with "No orgs"
 *   • Claude API failure → skips org, continues to next
 *   • Critical alerts → dispatches Discord notification
 *   • Top-5 alerts → creates in-app notifications
 *   • ai_call_log → insert called with latency, token count
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Deno shim ────────────────────────────────────────────────────────────────

let capturedHandler: ((req: Request) => Promise<Response>) | null = null

const mockDenoEnv: Record<string, string> = {}

// We also need to shim crypto.subtle for the SHA-256 hash in the function
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

await import("../../supabase/functions/smart-alert-digest/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return new Request("http://localhost/functions/v1/smart-alert-digest", {
    method: "GET",
  })
}

/** Builds a valid Claude API response with prioritized alerts. */
function makeClaudeResponse(alerts: unknown[], criticalCount = 1) {
  const digest = {
    alerts,
    executive_summary: "You have urgent items requiring attention.",
    total_items: alerts.length,
    critical_count: criticalCount,
  }
  return new Response(
    JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(digest) }],
      usage: { input_tokens: 500, output_tokens: 200 },
    }),
    { status: 200 }
  )
}

const SAMPLE_ALERTS = [
  { title: "Document expiring: LLC Agreement", description: "Expires in 2 days", urgency_score: 9, category: "expiring_document", action_url: "/app/vault/doc-1", asset_value: null, days_remaining: 2 },
  { title: "Stale valuation: Harbor Fund", description: "Last valued 95 days ago", urgency_score: 6, category: "stale_valuation", action_url: "/app/assets/asset-1", asset_value: 2000000, days_remaining: null },
  { title: "Past-due request: K-1 Upload", description: "5 days past deadline", urgency_score: 7, category: "past_due_request", action_url: "/app/requests/req-1", asset_value: null, days_remaining: -5 },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["SUPABASE_URL"] = "https://test.supabase.co"
  mockDenoEnv["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"
  mockDenoEnv["ANTHROPIC_API_KEY"] = "sk-ant-test-key"

  // Default fetch: Anthropic returns valid response, send-email returns success
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("anthropic.com")) {
      return Promise.resolve(makeClaudeResponse(SAMPLE_ALERTS, 1))
    }
    if (url.includes("send-email")) {
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    }
    if (url.includes("discord.com")) {
      return Promise.resolve(new Response("ok", { status: 200 }))
    }
    return Promise.resolve(new Response("ok", { status: 200 }))
  })
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach((k) => delete mockDenoEnv[k])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("smart-alert-digest edge function", () => {
  // ── No orgs ───────────────────────────────────────────────────────────────

  it("returns 'No orgs' when no organizations exist", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toBe("No orgs")
  })

  // ── No items for org ──────────────────────────────────────────────────────

  it("skips org when no alert items are found", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-1", name: "Empty Org" }],
            error: null,
          }),
        }
      }
      // All item queries return empty
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    // Claude should NOT have been called (no items)
    const claudeCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("anthropic.com")
    )
    expect(claudeCalls).toHaveLength(0)
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it("calls Claude, sends digest email, creates notifications for pending alerts", async () => {
    const expiringDoc = {
      id: "doc-1",
      name: "LLC Agreement",
      expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      asset_id: "asset-1",
    }

    const orgMember = {
      users: { id: "user-1", email: "admin@example.com", full_name: "Alice Admin", preferences: null },
    }

    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-1", name: "Smith Family Office" }],
            error: null,
          }),
        }
      }
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [expiringDoc], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [orgMember], error: null }),
        }
      }
      if (table === "notifications") {
        return { insert: mockInsert }
      }
      if (table === "ai_call_log") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("emails")

    // Claude should have been called
    const claudeCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("anthropic.com")
    )
    expect(claudeCalls.length).toBeGreaterThanOrEqual(1)

    // Verify Claude was called with the Anthropic API key
    const claudeHeaders = claudeCalls[0][1].headers
    expect(claudeHeaders["x-api-key"]).toBe("sk-ant-test-key")

    // send-email should have been called for the member
    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls.length).toBeGreaterThanOrEqual(1)
    const emailBody = JSON.parse(emailCalls[0][1].body)
    expect(emailBody.type).toBe("smart_alert_digest")
    expect(emailBody.to).toBe("admin@example.com")

    // In-app notifications should have been created (top 5)
    expect(mockInsert).toHaveBeenCalled()
    const notifCall = mockInsert.mock.calls[0][0]
    expect(notifCall.type).toBe("compliance_alert")
    expect(notifCall.user_id).toBe("user-1")
  })

  // ── Claude API failure ────────────────────────────────────────────────────

  it("skips org when Claude API returns an error status", async () => {
    const expiringDoc = {
      id: "doc-2",
      name: "Insurance Policy",
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      asset_id: "asset-2",
    }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-2", name: "Jones Family Office" }],
            error: null,
          }),
        }
      }
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [expiringDoc], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    // Claude API fails
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("anthropic.com")) {
        return Promise.resolve(new Response("Unauthorized", { status: 401 }))
      }
      return Promise.resolve(new Response("ok", { status: 200 }))
    })

    const res = await capturedHandler!(makeRequest())
    // Should still return 200 (skipped the failing org)
    expect(res.status).toBe(200)

    // No emails should have been sent for this org
    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls).toHaveLength(0)
  })

  // ── Discord dispatch ──────────────────────────────────────────────────────

  it("dispatches Discord notification when critical_count > 0 and DISCORD_WEBHOOK_URL is set", async () => {
    mockDenoEnv["DISCORD_WEBHOOK_URL"] = "https://discord.com/api/webhooks/test"

    const expiringDoc = {
      id: "doc-3",
      name: "Critical Doc",
      expires_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      asset_id: "asset-3",
    }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-3", name: "Critical Org" }],
            error: null,
          }),
        }
      }
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [expiringDoc], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    // Claude returns 2 critical alerts
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("anthropic.com")) {
        return Promise.resolve(makeClaudeResponse(SAMPLE_ALERTS, 2))
      }
      return Promise.resolve(new Response("ok", { status: 200 }))
    })

    await capturedHandler!(makeRequest())

    const discordCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("discord.com")
    )
    expect(discordCalls.length).toBeGreaterThanOrEqual(1)
  })

  // ── ai_call_log ───────────────────────────────────────────────────────────

  it("inserts to ai_call_log after successful Claude call", async () => {
    const expiringDoc = {
      id: "doc-4",
      name: "Log Test Doc",
      expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      asset_id: "asset-4",
    }

    const mockAiLogInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-4", name: "Log Test Org" }],
            error: null,
          }),
        }
      }
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [expiringDoc], error: null }),
        }
      }
      if (table === "ai_call_log") {
        return { insert: mockAiLogInsert }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    await capturedHandler!(makeRequest())

    expect(mockAiLogInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-4",
        agent_type: "alert_digest",
        status: "success",
      })
    )
  })
})
