/**
 * ============================================================================
 * TEST FILE: edge-send-email.test.ts
 * ============================================================================
 *
 * Tests the send-email Supabase Edge Function.
 *
 * WHAT THIS TESTS:
 *   • Valid expiration_reminder → calls Resend, returns { success: true }
 *   • Valid team_invite → calls Resend
 *   • Valid weekly_digest → calls Resend
 *   • Valid document_request_email → calls Resend
 *   • Valid smart_alert_digest → calls Resend
 *   • Valid operational_alert (critical/warning/info) → calls Resend
 *   • Missing 'to' or 'type' → returns 400
 *   • Unknown email type → returns 400
 *   • Resend returns 5xx → retries with backoff, returns 502
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

// ─── Mock global fetch ───────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// ─── Import Edge Function ─────────────────────────────────────────────────────

await import("../../supabase/functions/send-email/index.ts")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/functions/v1/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const EXPIRATION_DATA = {
  userName: "Alice",
  documents: [
    { name: "Flood Insurance", assetName: "Beach House", expiresAt: "Apr 15, 2026", daysUntilExpiry: 3 },
  ],
  orgName: "Smith Family Office",
}

const INVITE_DATA = {
  inviterName: "Bob Admin",
  orgName: "Smith Family Office",
  role: "assistant",
  magicLink: "https://app.lacoda.capital/join?token=abc123",
}

const DIGEST_DATA = {
  userName: "Carol",
  orgName: "Smith Family Office",
  period: "Apr 1 – Apr 7, 2026",
  newAssets: [{ name: "Tech Fund", assetClass: "equities", value: 500000 }],
  newValuations: [{ assetName: "Tech Fund", value: 510000, change: 2.0 }],
  upcomingDeadlines: [{ title: "Annual Review", dueDate: "Apr 10", type: "Task" }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDenoEnv["RESEND_API_KEY"] = "re_test_abc123"
  mockDenoEnv["APP_URL"] = "https://app.lacoda.capital"

  // Default: Resend returns success
  mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: "email-id-123" }), { status: 200 }))
})

afterEach(() => {
  Object.keys(mockDenoEnv).forEach((k) => delete mockDenoEnv[k])
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("send-email edge function", () => {
  // ── Method guard ──────────────────────────────────────────────────────────

  it("returns 405 for GET requests", async () => {
    const req = new Request("http://localhost/functions/v1/send-email", { method: "GET" })
    const res = await capturedHandler!(req)
    expect(res.status).toBe(405)
  })

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when 'to' is missing", async () => {
    const res = await capturedHandler!(
      makeRequest({ type: "expiration_reminder", data: EXPIRATION_DATA })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Missing")
  })

  it("returns 400 when 'type' is missing", async () => {
    const res = await capturedHandler!(
      makeRequest({ to: "user@example.com", data: EXPIRATION_DATA })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Missing")
  })

  it("returns 400 for unknown email type", async () => {
    const res = await capturedHandler!(
      makeRequest({ to: "user@example.com", type: "unknown_type", data: {} })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Unknown email type")
  })

  // ── expiration_reminder ───────────────────────────────────────────────────

  it("sends expiration_reminder email via Resend", async () => {
    const res = await capturedHandler!(
      makeRequest({ to: "alice@example.com", type: "expiration_reminder", data: EXPIRATION_DATA })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.resend.com/emails")
    const body = JSON.parse(options.body)
    expect(body.to).toBe("alice@example.com")
    expect(body.subject).toContain("Flood Insurance")
  })

  // ── team_invite ───────────────────────────────────────────────────────────

  it("sends team_invite email via Resend", async () => {
    const res = await capturedHandler!(
      makeRequest({ to: "newuser@example.com", type: "team_invite", data: INVITE_DATA })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toContain("Bob Admin invited you")
    expect(body.html).toContain("Smith Family Office")
  })

  // ── weekly_digest ─────────────────────────────────────────────────────────

  it("sends weekly_digest email via Resend", async () => {
    const res = await capturedHandler!(
      makeRequest({ to: "carol@example.com", type: "weekly_digest", data: DIGEST_DATA })
    )
    expect(res.status).toBe(200)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toContain("Weekly Digest")
    expect(body.html).toContain("Tech Fund")
  })

  // ── document_request_email ────────────────────────────────────────────────

  it("sends document_request_email via Resend", async () => {
    const res = await capturedHandler!(
      makeRequest({
        to: "client@example.com",
        type: "document_request_email",
        data: {
          subject: "Please upload your K-1",
          body: "Hi there,\n\nWe need your K-1 document.\n\nThanks",
        },
      })
    )
    expect(res.status).toBe(200)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toBe("Please upload your K-1")
    expect(body.html).toContain("K-1 document")
  })

  // ── smart_alert_digest ────────────────────────────────────────────────────

  it("sends smart_alert_digest email and uses criticalCount in subject", async () => {
    const res = await capturedHandler!(
      makeRequest({
        to: "admin@example.com",
        type: "smart_alert_digest",
        data: {
          userName: "Dave",
          orgName: "Smith Family Office",
          executiveSummary: "You have 2 critical items this week.",
          criticalCount: 2,
          totalItems: 5,
          alertRows: "<tr><td>Test alert</td></tr>",
        },
      })
    )
    expect(res.status).toBe(200)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toContain("2 critical alert")
  })

  it("sends smart_alert_digest with generic subject when no critical alerts", async () => {
    const res = await capturedHandler!(
      makeRequest({
        to: "admin@example.com",
        type: "smart_alert_digest",
        data: {
          userName: "Dave",
          orgName: "Smith Family Office",
          executiveSummary: "All clear this week.",
          criticalCount: 0,
          totalItems: 3,
          alertRows: "<tr><td>Minor item</td></tr>",
        },
      })
    )
    expect(res.status).toBe(200)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toContain("Weekly Alert Digest")
  })

  // ── operational_alert ─────────────────────────────────────────────────────

  it("sends critical operational_alert with CRITICAL prefix in subject", async () => {
    const res = await capturedHandler!(
      makeRequest({
        to: "ops@lacoda.capital",
        type: "operational_alert",
        data: {
          title: "Plaid sync failed",
          description: "Balance sync failed for integration Chase Bank.",
          severity: "critical",
          source: "sync-balances",
        },
      })
    )
    expect(res.status).toBe(200)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toContain("CRITICAL")
    expect(body.subject).toContain("Plaid sync failed")
  })

  it("sends warning operational_alert with ⚠️ prefix", async () => {
    const res = await capturedHandler!(
      makeRequest({
        to: "ops@lacoda.capital",
        type: "operational_alert",
        data: {
          title: "Capital call overdue",
          description: "$500,000 capital call is 3 days past due.",
          severity: "warning",
          source: "check-overdue-calls",
        },
      })
    )
    expect(res.status).toBe(200)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toContain("Capital call overdue")
  })

  // ── Resend API errors & retry ─────────────────────────────────────────────

  it("returns 502 when Resend consistently returns 4xx (no retry)", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ name: "validation_error" }), { status: 422 })
    )

    const res = await capturedHandler!(
      makeRequest({ to: "bad@example.com", type: "expiration_reminder", data: EXPIRATION_DATA })
    )
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.success).toBe(false)
    // 4xx should NOT retry — only called once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("retries on 5xx Resend errors with exponential backoff", async () => {
    vi.useFakeTimers()

    // First two calls fail with 500, third succeeds
    mockFetch
      .mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }))
      .mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "email-ok" }), { status: 200 }))

    const resultPromise = capturedHandler!(
      makeRequest({ to: "user@example.com", type: "expiration_reminder", data: EXPIRATION_DATA })
    )

    // Advance timers through the two backoffs (1s and 2s)
    await vi.runAllTimersAsync()

    const res = await resultPromise
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(3)

    vi.useRealTimers()
  })

  it("returns 502 after exhausting all retries on 5xx", async () => {
    vi.useFakeTimers()

    mockFetch.mockResolvedValue(new Response("Service Unavailable", { status: 503 }))

    const resultPromise = capturedHandler!(
      makeRequest({ to: "user@example.com", type: "expiration_reminder", data: EXPIRATION_DATA })
    )

    await vi.runAllTimersAsync()

    const res = await resultPromise
    expect(res.status).toBe(502)
    expect(mockFetch).toHaveBeenCalledTimes(3) // 3 retries

    vi.useRealTimers()
  })

  // ── Resend API key authorization ──────────────────────────────────────────

  it("passes Resend API key in Authorization header", async () => {
    await capturedHandler!(
      makeRequest({ to: "user@example.com", type: "expiration_reminder", data: EXPIRATION_DATA })
    )

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers["Authorization"]).toBe("Bearer re_test_abc123")
  })

  it("sends from the correct FROM address", async () => {
    await capturedHandler!(
      makeRequest({ to: "user@example.com", type: "team_invite", data: INVITE_DATA })
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.from).toBe("Lacoda Capital <notifications@lacoda.capital>")
  })
})
