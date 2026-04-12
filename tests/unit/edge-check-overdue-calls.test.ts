/**
 * ============================================================================
 * TEST FILE: edge-check-overdue-calls.test.ts
 * ============================================================================
 *
 * Tests the check-overdue-calls Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Overdue pending capital calls → status updated to "overdue", notification created
 *   • No overdue calls → returns 0 message
 *   • Update failure → skips that call, continues
 *   • Alert email dispatched for each overdue call
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

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

// ─── Mock global fetch ───────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// ─── Import Edge Function ─────────────────────────────────────────────────────

await import("../../supabase/functions/check-overdue-calls/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return new Request("http://localhost/functions/v1/check-overdue-calls", {
    method: "GET",
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["SUPABASE_URL"] = "https://test.supabase.co"
  mockDenoEnv["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"

  // Default fetch → send-email success
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ success: true }), { status: 200 })
  )
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach((k) => delete mockDenoEnv[k])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("check-overdue-calls edge function", () => {
  it("returns 'No overdue calls found' when no pending past-due calls exist", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("No overdue calls found")
  })

  it("marks overdue capital calls as 'overdue' and creates notifications", async () => {
    const overdueCall = {
      id: "call-1",
      asset_id: "asset-1",
      org_id: "org-1",
      amount: "500000",
      currency: "USD",
      due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      event_type: "capital_call",
    }

    const memberRow = {
      users: { id: "user-1" },
    }

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "capital_events") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: [overdueCall], error: null }),
          update: mockUpdate,
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { name: "Pine Ridge Property" }, error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [memberRow], error: null }),
        }
      }
      if (table === "notifications") {
        return { insert: mockInsert }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain("Marked 1 calls overdue")
    expect(json.message).toContain("1 notifications")

    // Notification insert should have been called
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        org_id: "org-1",
        type: "capital_call_overdue",
      })
    )
  })

  it("dispatches alert email for overdue capital calls when recipients configured", async () => {
    mockDenoEnv["ALERT_EMAIL_RECIPIENTS"] = "ops@lacoda.capital"

    const overdueCall = {
      id: "call-2",
      asset_id: "asset-2",
      org_id: "org-2",
      amount: "250000",
      currency: "USD",
      due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      event_type: "capital_call",
    }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "capital_events") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: [overdueCall], error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { name: "Harbor Fund" }, error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "notifications") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest())
    expect(res.status).toBe(200)

    // fetch should have been called for send-email alert
    const emailCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
      typeof url === "string" && url.includes("send-email")
    )
    expect(emailCalls.length).toBeGreaterThanOrEqual(1)

    const emailBody = JSON.parse(emailCalls[0][1].body)
    expect(emailBody.type).toBe("operational_alert")
    expect(emailBody.data.severity).toBe("warning")
    expect(emailBody.data.source).toBe("check-overdue-calls")
  })

  it("skips a call when status update fails and continues processing others", async () => {
    const calls = [
      {
        id: "call-fail",
        asset_id: "asset-fail",
        org_id: "org-fail",
        amount: "100000",
        currency: "USD",
        due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        event_type: "capital_call",
      },
      {
        id: "call-ok",
        asset_id: "asset-ok",
        org_id: "org-ok",
        amount: "200000",
        currency: "USD",
        due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        event_type: "capital_call",
      },
    ]

    let updateCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "capital_events") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: calls, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => {
              updateCallCount++
              // First call fails, second succeeds
              if (updateCallCount === 1) return Promise.resolve({ error: new Error("DB write failed") })
              return Promise.resolve({ error: null })
            }),
          }),
        }
      }
      if (table === "assets") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { name: "Test Asset" }, error: null }),
        }
      }
      if (table === "org_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === "notifications") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const res = await capturedHandler!(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    // Only 1 was successfully updated (the second one)
    expect(json.message).toContain("Marked 1 calls overdue")
  })

  it("returns 500 when initial capital_events query fails", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Connection refused"),
      }),
    })

    const res = await capturedHandler!(makeRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })
})
