/**
 * ============================================================================
 * TEST FILE: alert-discord.test.ts
 * ============================================================================
 *
 * Tests the Discord webhook sender (lib/alerts/discord.ts).
 *
 * We test:
 *   - Correct embed colors per severity (red, amber, blue)
 *   - Description truncation at 2000 characters
 *   - Empty webhook URL → immediate return, no fetch
 *   - Special characters in title/description escaped
 *   - Rate limit (429) → retries with backoff
 *   - Server error (500) → retries then gives up
 *
 * RELATED FILES:
 *   lib/alerts/discord.ts — module under test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sendDiscordAlert } from "@/lib/alerts/discord"

// ─── Mock fetch ────────────────────────────────────────────────────────────

const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = mockFetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================================
// 1. Correct embed colors per severity
// ============================================================================

describe("Discord alert — embed colors", () => {
  it("uses red (0xEF4444) for critical severity", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test alert",
      severity: "critical",
      source: "test",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.embeds[0].color).toBe(0xef4444)
  })

  it("uses amber (0xF59E0B) for warning severity", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test alert",
      severity: "warning",
      source: "test",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.embeds[0].color).toBe(0xf59e0b)
  })

  it("uses blue (0x3B82F6) for info severity", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test alert",
      severity: "info",
      source: "test",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.embeds[0].color).toBe(0x3b82f6)
  })
})

// ============================================================================
// 2. Truncates description at 2000 chars
// ============================================================================

describe("Discord alert — description truncation", () => {
  it("truncates description longer than 2000 characters", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    const longDescription = "a".repeat(2500)

    await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: longDescription,
      severity: "info",
      source: "test",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.embeds[0].description.length).toBe(2000)
    expect(body.embeds[0].description.endsWith("...")).toBe(true)
  })

  it("does not truncate description under 2000 characters", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    const shortDescription = "a".repeat(500)

    await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: shortDescription,
      severity: "info",
      source: "test",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.embeds[0].description.length).toBe(500)
  })
})

// ============================================================================
// 3. Empty webhook URL → immediate return, no fetch
// ============================================================================

describe("Discord alert — empty webhook URL", () => {
  it("returns success immediately when URL is undefined", async () => {
    const result = await sendDiscordAlert(undefined, {
      title: "Test",
      description: "Test",
      severity: "critical",
      source: "test",
    })

    expect(result.success).toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("returns success immediately when URL is empty string", async () => {
    const result = await sendDiscordAlert("", {
      title: "Test",
      description: "Test",
      severity: "critical",
      source: "test",
    })

    expect(result.success).toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 4. Special characters in title/description escaped
// ============================================================================

describe("Discord alert — special character escaping", () => {
  it("escapes Discord markdown special characters in title", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "**bold** _italic_ ~strike~ `code` |spoiler|",
      description: "Normal description",
      severity: "info",
      source: "test",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.embeds[0].title).toContain("\\*")
    expect(body.embeds[0].title).toContain("\\_")
    expect(body.embeds[0].title).toContain("\\~")
    expect(body.embeds[0].title).toContain("\\`")
    expect(body.embeds[0].title).toContain("\\|")
  })
})

// ============================================================================
// 5. Rate limit (429) → retries
// ============================================================================

describe("Discord alert — rate limiting", () => {
  it("retries on 429 and succeeds on second attempt", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "0.1" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const result = await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test",
      severity: "critical",
      source: "test",
    })

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("gives up after max retries on persistent 429", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "0.01" }),
    })

    const result = await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test",
      severity: "critical",
      source: "test",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("rate limited")
    expect(mockFetch).toHaveBeenCalledTimes(3) // max retries = 3
  })
})

// ============================================================================
// 6. Server error (500) → retries then gives up
// ============================================================================

describe("Discord alert — server errors", () => {
  it("retries on 500 and succeeds on second attempt", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const result = await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test",
      severity: "critical",
      source: "test",
    })

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("gives up after 3 attempts on persistent 500", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    })

    const result = await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test",
      severity: "critical",
      source: "test",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("500")
  })

  it("handles network errors with retry", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const result = await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test",
      severity: "info",
      source: "test",
    })

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// 7. Embed structure
// ============================================================================

describe("Discord alert — embed structure", () => {
  it("includes all required fields in the embed", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test Alert",
      description: "Something happened",
      severity: "warning",
      source: "unit-test",
      actionUrl: "https://app.lacoda.capital/app/test",
      timestamp: "2024-01-01T00:00:00Z",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const embed = body.embeds[0]

    expect(embed.footer.text).toBe("Lacoda Capital Alerts")
    expect(embed.timestamp).toBe("2024-01-01T00:00:00Z")
    expect(embed.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Severity", value: "WARNING" }),
        expect.objectContaining({ name: "Source", value: "unit-test" }),
        expect.objectContaining({ name: "Action", value: "https://app.lacoda.capital/app/test" }),
      ]),
    )
  })

  it("omits action field when actionUrl is not provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await sendDiscordAlert("https://discord.com/api/webhooks/test", {
      title: "Test",
      description: "Test",
      severity: "info",
      source: "test",
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const fieldNames = body.embeds[0].fields.map((f: { name: string }) => f.name)
    expect(fieldNames).not.toContain("Action")
  })
})
