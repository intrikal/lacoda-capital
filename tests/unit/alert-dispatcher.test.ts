/**
 * ============================================================================
 * TEST FILE: alert-dispatcher.test.ts
 * ============================================================================
 *
 * Tests the central alert dispatcher (lib/alerts/dispatcher.ts).
 *
 * The dispatcher routes alerts to channels based on severity:
 *   Critical → Discord + email + in-app notification
 *   Warning  → email + in-app notification
 *   Info     → Discord only
 *
 * We mock:
 *   - Discord sender (lib/alerts/discord.ts)
 *   - Email sender (lib/alerts/email.ts)
 *   - Database (drizzle-orm + schema)
 *
 * RELATED FILES:
 *   lib/alerts/dispatcher.ts — module under test
 *   lib/alerts/discord.ts    — Discord webhook sender
 *   lib/alerts/email.ts      — email alert sender
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockSendDiscordAlert = vi.fn().mockResolvedValue({ success: true })
const mockSendAlertEmail = vi.fn().mockResolvedValue({ success: true, errors: [] })
const mockInsertValues = vi.fn().mockResolvedValue([])
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })
const mockDbSelect = vi.fn()

vi.mock("@/lib/alerts/discord", () => ({
  sendDiscordAlert: (...args: unknown[]) => mockSendDiscordAlert(...args),
}))

vi.mock("@/lib/alerts/email", () => ({
  sendAlertEmail: (...args: unknown[]) => mockSendAlertEmail(...args),
}))

vi.mock("@/app/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => {
      const chain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { userId: "user-1" },
            { userId: "user-2" },
          ]),
        }),
      }
      mockDbSelect(...args)
      return chain
    },
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

// ─── Import after mocks ───────────────────────────────────────────────────

import { dispatchAlert } from "@/lib/alerts/dispatcher"

// ─── Env setup ─────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test"
  process.env.ALERT_EMAIL_RECIPIENTS = "ops@test.com,admin@test.com"
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ============================================================================
// 1. Critical → Discord + email + notification
// ============================================================================

describe("Alert dispatcher — critical severity", () => {
  it("sends to Discord, email, and creates in-app notification", async () => {
    await dispatchAlert({
      title: "Sync failed",
      description: "Plaid sync crashed",
      severity: "critical",
      source: "test",
      orgId: "org-123",
    })

    expect(mockSendDiscordAlert).toHaveBeenCalledTimes(1)
    expect(mockSendDiscordAlert).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/test",
      expect.objectContaining({
        title: "Sync failed",
        severity: "critical",
      }),
    )

    expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
    expect(mockSendAlertEmail).toHaveBeenCalledWith(
      ["ops@test.com", "admin@test.com"],
      expect.objectContaining({
        title: "Sync failed",
        severity: "critical",
      }),
    )

    // In-app notification insert should have been called
    expect(mockInsert).toHaveBeenCalled()
  })
})

// ============================================================================
// 2. Warning → email + notification only
// ============================================================================

describe("Alert dispatcher — warning severity", () => {
  it("sends email and in-app notification, but NOT Discord", async () => {
    await dispatchAlert({
      title: "Plan limit approaching",
      description: "85% of AUM limit",
      severity: "warning",
      source: "test",
      orgId: "org-123",
    })

    expect(mockSendDiscordAlert).not.toHaveBeenCalled()
    expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalled()
  })
})

// ============================================================================
// 3. Info → Discord only
// ============================================================================

describe("Alert dispatcher — info severity", () => {
  it("sends to Discord only, no email or notification", async () => {
    await dispatchAlert({
      title: "New signup",
      description: "user@test.com signed up",
      severity: "info",
      source: "test",
    })

    expect(mockSendDiscordAlert).toHaveBeenCalledTimes(1)
    expect(mockSendAlertEmail).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 4. Missing DISCORD_WEBHOOK_URL → skip Discord, no error
// ============================================================================

describe("Alert dispatcher — missing Discord URL", () => {
  it("skips Discord when DISCORD_WEBHOOK_URL is not set", async () => {
    delete process.env.DISCORD_WEBHOOK_URL

    await dispatchAlert({
      title: "Test",
      description: "Test",
      severity: "critical",
      source: "test",
      orgId: "org-123",
    })

    // Discord should still be called but with undefined URL
    // sendDiscordAlert handles the no-op internally
    expect(mockSendDiscordAlert).toHaveBeenCalledWith(
      undefined,
      expect.anything(),
    )

    // Email and notification should still work
    expect(mockSendAlertEmail).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
  })
})

// ============================================================================
// 5. Missing ALERT_EMAIL_RECIPIENTS → skip email, no error
// ============================================================================

describe("Alert dispatcher — missing email recipients", () => {
  it("skips email when ALERT_EMAIL_RECIPIENTS is not set", async () => {
    delete process.env.ALERT_EMAIL_RECIPIENTS

    await dispatchAlert({
      title: "Test",
      description: "Test",
      severity: "critical",
      source: "test",
      orgId: "org-123",
    })

    // Email should not be called with empty recipients
    expect(mockSendAlertEmail).not.toHaveBeenCalled()
    // Discord and notification should still work
    expect(mockSendDiscordAlert).toHaveBeenCalled()
  })
})

// ============================================================================
// 6. Discord 429 rate limit → retries with backoff
// ============================================================================

describe("Alert dispatcher — Discord rate limit", () => {
  it("returns failure from Discord but dispatcher does not throw", async () => {
    mockSendDiscordAlert.mockResolvedValueOnce({
      success: false,
      error: "Discord rate limited after 3 attempts",
    })

    // Should not throw
    await expect(
      dispatchAlert({
        title: "Test",
        description: "Test",
        severity: "critical",
        source: "test",
        orgId: "org-123",
      }),
    ).resolves.toBeUndefined()

    expect(mockSendDiscordAlert).toHaveBeenCalled()
  })
})

// ============================================================================
// 7. Discord 500 → retries then gives up silently
// ============================================================================

describe("Alert dispatcher — Discord server error", () => {
  it("handles Discord failure silently", async () => {
    mockSendDiscordAlert.mockResolvedValueOnce({
      success: false,
      error: "Discord 500: Internal Server Error",
    })

    await expect(
      dispatchAlert({
        title: "Test",
        description: "Test",
        severity: "info",
        source: "test",
      }),
    ).resolves.toBeUndefined()
  })
})

// ============================================================================
// 8. Email failure → logged, not thrown
// ============================================================================

describe("Alert dispatcher — email failure", () => {
  it("does not throw when email fails", async () => {
    mockSendAlertEmail.mockResolvedValueOnce({
      success: false,
      errors: ["Failed to send to ops@test.com: 502"],
    })

    await expect(
      dispatchAlert({
        title: "Test",
        description: "Test",
        severity: "warning",
        source: "test",
        orgId: "org-123",
      }),
    ).resolves.toBeUndefined()
  })
})

// ============================================================================
// 9. Alert with orgId → notification created for all admins in org
// ============================================================================

describe("Alert dispatcher — in-app notifications with orgId", () => {
  it("creates notifications for all admins when orgId is provided", async () => {
    await dispatchAlert({
      title: "Compliance deadline",
      description: "KYC-001 due in 3 days",
      severity: "warning",
      source: "test",
      orgId: "org-456",
    })

    expect(mockInsert).toHaveBeenCalled()
    expect(mockInsertValues).toHaveBeenCalled()
  })
})

// ============================================================================
// 10. Alert without orgId → no in-app notification
// ============================================================================

describe("Alert dispatcher — no in-app notifications without orgId", () => {
  it("skips in-app notifications when orgId is not provided", async () => {
    await dispatchAlert({
      title: "Test",
      description: "Test",
      severity: "warning",
      source: "test",
      // no orgId
    })

    // insert should not be called for notifications (only email)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
