/**
 * ============================================================================
 * TEST FILE: edge-weekly-digest.test.ts
 * ============================================================================
 *
 * Tests the weekly-digest Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Active org with activity → sends weekly summary email to admins
 *   • No activity (empty assets/valuations) → still sends digest with zeros
 *   • User opted out (digest: "never") → skipped
 *   • No orgs → returns early with "No orgs"
 *   • Multiple orgs → sends emails per org
 *   • Supabase query failure → returns 500
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

await import("../../supabase/functions/weekly-digest/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return new Request("http://localhost/functions/v1/weekly-digest", {
    method: "GET",
  })
}

const ADMIN_MEMBER = {
  users: {
    email: "admin@example.com",
    full_name: "Alice Admin",
    preferences: null,
  },
}

const OPTED_OUT_MEMBER = {
  users: {
    email: "optout@example.com",
    full_name: "Bob Optout",
    preferences: { email_preferences: { digest: "never" } },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["SUPABASE_URL"] = "https://test.supabase.co"
  mockDenoEnv["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"

  // Default: send-email returns success
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ success: true }), { status: 200 })
  )
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach((k) => delete mockDenoEnv[k])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("weekly-digest edge function", () => {
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

  // ── Happy path — active org with activity ─────────────────────────────────

  it("sends weekly digest email to org admins", async () => {
    const newAsset = { name: "Harbor Fund", asset_class: "private_equity", current_value: "1500000" }
    const newValuation = { asset_name: "Harbor Fund", value: "1550000", change_pct: "3.33" }
    const upcomingTask = {
      title: "Annual K-1 Review",
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-1", name: "Smith Family Office" }],
            error: null,
          }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [newAsset], error: null }),
        }
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [upcomingTask], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [ADMIN_MEMBER], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    // RPC calls for org_new_assets and org_recent_valuations
    mockSupabaseRpc.mockImplementation((fnName: string) => {
      if (fnName === "get_org_new_assets") {
        return {
          select: vi.fn().mockResolvedValue({ data: [newAsset], error: null }),
        }
      }
      if (fnName === "get_org_recent_valuations") {
        return {
          select: vi.fn().mockResolvedValue({ data: [newValuation], error: null }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("Sent 1 digest emails")

    // Verify send-email was called with the correct payload
    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls.length).toBe(1)

    const emailBody = JSON.parse(emailCalls[0][1].body)
    expect(emailBody.type).toBe("weekly_digest")
    expect(emailBody.to).toBe("admin@example.com")
    expect(emailBody.data.orgName).toBe("Smith Family Office")
    expect(emailBody.data.newAssets).toHaveLength(1)
    expect(emailBody.data.newAssets[0].name).toBe("Harbor Fund")
    expect(emailBody.data.upcomingDeadlines).toHaveLength(1)
    expect(emailBody.data.upcomingDeadlines[0].title).toBe("Annual K-1 Review")
  })

  // ── No activity ───────────────────────────────────────────────────────────

  it("still sends digest email when org has no new assets or valuations this week", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-2", name: "Jones Family" }],
            error: null,
          }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }), // no new assets
        }
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }), // no upcoming tasks
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [ADMIN_MEMBER], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    // Digest STILL sent even with empty content
    expect(json.message).toContain("Sent 1 digest emails")

    const emailBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(emailBody.data.newAssets).toHaveLength(0)
    expect(emailBody.data.newValuations).toHaveLength(0)
    expect(emailBody.data.upcomingDeadlines).toHaveLength(0)
  })

  // ── Opted-out user ────────────────────────────────────────────────────────

  it("skips users with digest preference set to 'never'", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-3", name: "Chen Family" }],
            error: null,
          }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [OPTED_OUT_MEMBER], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("Sent 0 digest emails")
    expect(json.message).toContain("skipped 1")

    // fetch should NOT have been called for send-email
    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls).toHaveLength(0)
  })

  // ── Mixed members ─────────────────────────────────────────────────────────

  it("sends to opted-in members and skips opted-out ones in same org", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-4", name: "Mixed Org" }],
            error: null,
          }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [ADMIN_MEMBER, OPTED_OUT_MEMBER],
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    // 1 sent (Alice), 1 skipped (Bob)
    expect(json.message).toContain("Sent 1 digest emails")
    expect(json.message).toContain("skipped 1")
  })

  // ── Multiple orgs ─────────────────────────────────────────────────────────

  it("processes multiple orgs and sends a digest for each", async () => {
    const orgMembers: Record<string, typeof ADMIN_MEMBER[]> = {
      "org-a": [{ users: { email: "admin-a@example.com", full_name: "Admin A", preferences: null } }],
      "org-b": [{ users: { email: "admin-b@example.com", full_name: "Admin B", preferences: null } }],
    }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { id: "org-a", name: "Alpha Family" },
              { id: "org-b", name: "Beta Family" },
            ],
            error: null,
          }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "org_members") {
        // Return different members per org — use a counter to differentiate
        let callIdx = 0
        const orgIds = Object.keys(orgMembers)
        const members = orgMembers[orgIds[callIdx % orgIds.length]]
        callIdx++
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: members, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    // Should have sent at least 2 emails (one per org)
    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls.length).toBeGreaterThanOrEqual(2)
  })

  // ── Supabase error ────────────────────────────────────────────────────────

  it("returns 500 when Supabase orgs query fails", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
    })

    const res = await capturedHandler!(makeRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  // ── send-email called with correct Authorization header ───────────────────

  it("passes service role key in Authorization header when calling send-email", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "orgs") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: "org-5", name: "Auth Test Org" }],
            error: null,
          }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "tasks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [ADMIN_MEMBER], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    mockSupabaseRpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    await capturedHandler!(makeRequest())

    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls.length).toBe(1)

    const [, options] = emailCalls[0]
    expect(options.headers["Authorization"]).toBe("Bearer service-key")
  })
})
