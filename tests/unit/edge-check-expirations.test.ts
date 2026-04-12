/**
 * ============================================================================
 * TEST FILE: edge-check-expirations.test.ts
 * ============================================================================
 *
 * Tests the check-expirations Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Documents expiring within 7 days → sends summary email per user
 *   • Documents expiring within 1 day → sends urgent notification + Discord alert
 *   • No expiring documents → returns 0 message
 *   • Users who opt-out → skipped, no email sent
 *   • No eligible recipients → returns early
 *
 * HOW THE DENO SHIM WORKS:
 *   The Edge Function calls Deno.serve(handler) at the top level.
 *   We shim globalThis.Deno before importing so Deno.serve() captures the
 *   handler fn instead of actually starting a server. Then we call it
 *   directly in tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Deno shim — must come before the module import ─────────────────────────

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

const mockSelect = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockIs = vi.fn()
const mockIn = vi.fn()
const mockEq = vi.fn()

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}))

// ─── Mock global fetch ───────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// ─── Import the Edge Function (triggers Deno.serve, captures handler) ────────

await import("../../supabase/functions/check-expirations/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return new Request("http://localhost/functions/v1/check-expirations", {
    method: "GET",
  })
}

/** Helper to build a chainable Supabase query mock that resolves with data. */
function makeQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const fns = ["select", "gte", "lte", "is", "in", "eq", "insert", "update", "single", "maybeSingle"]
  for (const fn of fns) {
    chain[fn] = vi.fn().mockReturnValue(chain)
  }
  chain["then"] = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result))
  // Make it awaitable
  ;(chain as Record<string, unknown>)[Symbol.for("nodejs.rejection")] = undefined
  return Object.assign(Promise.resolve(result), chain) as unknown as ReturnType<typeof mockSupabaseFrom>
}

// ─── Env defaults ─────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...mockDenoEnv }

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["SUPABASE_URL"] = "https://test.supabase.co"
  mockDenoEnv["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"

  // Default: fetch resolves successfully (for send-email calls)
  mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach(k => delete mockDenoEnv[k])
  Object.assign(mockDenoEnv, ORIGINAL_ENV)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("check-expirations edge function", () => {
  it("returns 'No expiring documents found' when no docs expiring", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("No expiring documents")
  })

  it("returns 'No eligible recipients' when no admin/assistant members found", async () => {
    const docRow = {
      id: "doc-1",
      name: "Insurance Policy",
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      asset_id: "asset-1",
      client_id: "client-1",
      org_id: "org-1",
      assets: { name: "Beach House" },
    }

    let callCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      callCount++
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: [docRow], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).then(_resolve, _reject),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("No eligible recipients")
  })

  it("sends one summary email per user for docs expiring within 7 days", async () => {
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const docRow = {
      id: "doc-1",
      name: "LLC Agreement",
      expires_at: expiresAt,
      asset_id: "asset-1",
      client_id: "client-1",
      org_id: "org-1",
      assets: { name: "Main Street Property" },
    }

    const memberRow = {
      user_id: "user-1",
      org_id: "org-1",
      role: "admin",
      users: { email: "admin@example.com", full_name: "Alice Admin", preferences: null },
    }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: [docRow], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [memberRow], error: null }).then(_resolve, _reject),
        }
      }
      if (table === "orgs") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ id: "org-1", name: "Test Org" }], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("Sent 1 emails")

    // Should have called fetch to send-email
    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls.length).toBeGreaterThanOrEqual(1)

    const emailBody = JSON.parse(emailCalls[0][1].body)
    expect(emailBody.type).toBe("expiration_reminder")
    expect(emailBody.to).toBe("admin@example.com")
  })

  it("skips users who have opted out of expiration reminders", async () => {
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    const docRow = {
      id: "doc-2",
      name: "Flood Insurance",
      expires_at: expiresAt,
      asset_id: "asset-2",
      client_id: "client-2",
      org_id: "org-2",
      assets: { name: "Lakeside Cottage" },
    }

    const memberRow = {
      user_id: "user-2",
      org_id: "org-2",
      role: "admin",
      users: {
        email: "optout@example.com",
        full_name: "Bob Optout",
        preferences: { email_preferences: { expirationReminders: false } },
      },
    }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: [docRow], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [memberRow], error: null }).then(_resolve, _reject),
        }
      }
      if (table === "orgs") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ id: "org-2", name: "Test Org 2" }], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    // Email should NOT have been sent
    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls.length).toBe(0)
    expect(json.message).toContain("skipped 1")
  })

  it("dispatches urgent Discord alert for docs expiring within 1 day", async () => {
    mockDenoEnv["DISCORD_WEBHOOK_URL"] = "https://discord.com/api/webhooks/test"

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours

    const docRow = {
      id: "doc-3",
      name: "Critical Contract",
      expires_at: expiresAt,
      asset_id: "asset-3",
      client_id: "client-3",
      org_id: "org-3",
      assets: { name: "Tower Asset" },
    }

    const memberRow = {
      user_id: "user-3",
      org_id: "org-3",
      role: "admin",
      users: { email: "admin3@example.com", full_name: "Carol", preferences: null },
    }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: [docRow], error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          then: (_resolve: (v: unknown) => unknown, _reject: (e: unknown) => unknown) =>
            Promise.resolve({ data: [memberRow], error: null }).then(_resolve, _reject),
        }
      }
      if (table === "orgs") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ id: "org-3", name: "Test Org 3" }], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest())
    expect(res.status).toBe(200)

    // Should have called Discord webhook
    const discordCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("discord.com")
    )
    expect(discordCalls.length).toBeGreaterThanOrEqual(1)

    const discordBody = JSON.parse(discordCalls[0][1].body)
    expect(discordBody.embeds[0].title).toContain("expiring imminently")
  })

  it("returns 500 when Supabase query fails", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: null, error: new Error("DB connection failed") }),
    })

    const res = await capturedHandler!(makeRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })
})
