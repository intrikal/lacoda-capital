/**
 * ============================================================================
 * TEST FILE: alert-flow.test.ts (integration)
 * ============================================================================
 *
 * Integration tests for the full alert flow — from trigger to delivery.
 *
 * Tests the complete path:
 *   trigger condition → check function → dispatcher → channels
 *
 * We mock external calls (fetch, DB) but test the real wiring between
 * the alerts module files.
 *
 * RELATED FILES:
 *   lib/alerts/dispatcher.ts — central dispatcher
 *   lib/alerts/discord.ts    — Discord webhook sender
 *   lib/alerts/email.ts      — email alert sender
 *   lib/alerts/checks.ts     — check functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mock DB layer ─────────────────────────────────────────────────────────

const mockInsertValues = vi.fn().mockResolvedValue([])
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })
const mockSelectWhere = vi.fn().mockResolvedValue([
  { userId: "admin-1" },
  { userId: "admin-2" },
])

vi.mock("@/app/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: (...args: unknown[]) => mockSelectWhere(...args),
      }),
    }),
  },
}))

vi.mock("@/app/db/schema", () => ({
  notifications: { userId: "userId", orgId: "orgId" },
  orgMembers: { userId: "userId", orgId: "orgId", role: "role" },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
}))

// ─── Mock fetch (Discord + email) ──────────────────────────────────────────

const mockFetch = vi.fn()

// ─── Import after mocks ───────────────────────────────────────────────────

import { dispatchAlert } from "@/lib/alerts/dispatcher"

// ─── Env setup ─────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = mockFetch
  mockFetch.mockResolvedValue({ ok: true, status: 200 })

  process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test"
  process.env.ALERT_EMAIL_RECIPIENTS = "ops@test.com"
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ============================================================================
// 1. Plaid sync fails → status error → alert dispatched → all channels called
// ============================================================================

describe("Integration: Plaid sync failure flow", () => {
  it("dispatches critical alert that reaches Discord, email, and notifications", async () => {
    // Simulate what sync-balances would dispatch after a failure
    await dispatchAlert({
      title: "Plaid sync failed: Chase Checking",
      description: "Balance sync failed for integration Chase Checking. Error: ITEM_LOGIN_REQUIRED",
      severity: "critical",
      source: "sync-balances",
      orgId: "org-123",
      actionUrl: "/app/settings/integrations",
    })

    // Discord was called
    const discordCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes("discord.com"),
    )
    expect(discordCalls.length).toBe(1)

    const discordBody = JSON.parse(discordCalls[0][1].body)
    expect(discordBody.embeds[0].title).toContain("Plaid sync failed")
    expect(discordBody.embeds[0].color).toBe(0xef4444) // red = critical

    // Email was called via send-email edge function
    const emailCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes("supabase.co"),
    )
    expect(emailCalls.length).toBe(1)

    const emailBody = JSON.parse(emailCalls[0][1].body)
    expect(emailBody.type).toBe("operational_alert")
    expect(emailBody.to).toBe("ops@test.com")
    expect(emailBody.data.severity).toBe("critical")

    // In-app notification was created
    expect(mockInsert).toHaveBeenCalled()
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "admin-1",
          orgId: "org-123",
          title: "Plaid sync failed: Chase Checking",
        }),
      ]),
    )
  })
})

// ============================================================================
// 2. Plan limit exceeded → correct severity routing
// ============================================================================

describe("Integration: Plan limit exceeded flow", () => {
  it("dispatches warning that goes to email and notification but not Discord", async () => {
    // Simulate what checkPlanLimitAlerts would produce
    await dispatchAlert({
      title: "Approaching plan limit: aum",
      description: "You're using 85% of your AUM.",
      severity: "warning",
      source: "check-plan-limits",
      orgId: "org-123",
      actionUrl: "/app/settings/billing",
    })

    // Discord should NOT be called for warnings
    const discordCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes("discord.com"),
    )
    expect(discordCalls.length).toBe(0)

    // Email should be called
    const emailCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes("supabase.co"),
    )
    expect(emailCalls.length).toBe(1)

    // Notification should be created
    expect(mockInsert).toHaveBeenCalled()
  })
})

// ============================================================================
// 3. Multiple rapid alerts → all delivered, no duplicates
// ============================================================================

describe("Integration: Multiple rapid alerts", () => {
  it("delivers all alerts without duplicates", async () => {
    const alerts = [
      {
        title: "Alert 1",
        description: "First alert",
        severity: "critical" as const,
        source: "test",
        orgId: "org-1",
      },
      {
        title: "Alert 2",
        description: "Second alert",
        severity: "critical" as const,
        source: "test",
        orgId: "org-1",
      },
      {
        title: "Alert 3",
        description: "Third alert",
        severity: "critical" as const,
        source: "test",
        orgId: "org-1",
      },
    ]

    // Dispatch all alerts concurrently
    await Promise.all(alerts.map((a) => dispatchAlert(a)))

    // Each critical alert sends: 1 Discord + 1 email = 2 fetches per alert
    const discordCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes("discord.com"),
    )
    const emailCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes("supabase.co"),
    )

    expect(discordCalls.length).toBe(3)
    expect(emailCalls.length).toBe(3)

    // 3 notification inserts (one per alert, each with 2 admin users)
    expect(mockInsert).toHaveBeenCalledTimes(3)

    // Verify no duplicate titles in Discord calls
    const discordTitles = discordCalls.map(
      (call: unknown[]) => JSON.parse((call as [string, { body: string }])[1].body).embeds[0].title,
    )
    expect(new Set(discordTitles).size).toBe(3) // all unique
  })
})

// ============================================================================
// 4. Graceful degradation — all channels fail, dispatcher survives
// ============================================================================

describe("Integration: Graceful degradation", () => {
  it("dispatcher does not throw when all channels fail", async () => {
    mockFetch.mockRejectedValue(new Error("Network down"))
    mockInsert.mockImplementation(() => {
      throw new Error("DB down")
    })

    // Should not throw
    await expect(
      dispatchAlert({
        title: "Test",
        description: "Everything is broken",
        severity: "critical",
        source: "test",
        orgId: "org-1",
      }),
    ).resolves.toBeUndefined()
  })
})
