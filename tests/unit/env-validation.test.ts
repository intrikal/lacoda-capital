import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { validateEnv } from "@/lib/validate-env"

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
]

const OPTIONAL_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER_MONTHLY",
  "STRIPE_PRICE_STARTER_ANNUAL",
  "STRIPE_PRICE_GROWTH_MONTHLY",
  "STRIPE_PRICE_GROWTH_ANNUAL",
  "STRIPE_PRICE_PROFESSIONAL_MONTHLY",
  "STRIPE_PRICE_PROFESSIONAL_ANNUAL",
  "STRIPE_PRICE_ELITE_MONTHLY",
  "STRIPE_PRICE_ELITE_ANNUAL",
  "PLAID_CLIENT_ID",
  "DOCUSIGN_INTEGRATION_KEY",
  "QUICKBOOKS_CLIENT_ID",
  "SALESFORCE_CLIENT_ID",
  "DISCORD_WEBHOOK_URL",
  "ALERT_EMAIL_RECIPIENTS",
]

// Full set of required vars with dummy values
const allRequired: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "eyJhbGciOiJIUzI1NiJ9.test",
}

// Full set of optional vars with dummy values
const allOptional: Record<string, string> = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/db",
  NEXT_PUBLIC_SENTRY_DSN: "https://sentry.io/123",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_STARTER_MONTHLY: "price_test_sm",
  STRIPE_PRICE_STARTER_ANNUAL: "price_test_sa",
  STRIPE_PRICE_GROWTH_MONTHLY: "price_test_gm",
  STRIPE_PRICE_GROWTH_ANNUAL: "price_test_ga",
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: "price_test_pm",
  STRIPE_PRICE_PROFESSIONAL_ANNUAL: "price_test_pa",
  STRIPE_PRICE_ELITE_MONTHLY: "price_test_em",
  STRIPE_PRICE_ELITE_ANNUAL: "price_test_ea",
  PLAID_CLIENT_ID: "plaid_client_test",
  DOCUSIGN_INTEGRATION_KEY: "docusign_key_test",
  QUICKBOOKS_CLIENT_ID: "qb_client_test",
  SALESFORCE_CLIENT_ID: "sf_client_test",
  DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/test",
  ALERT_EMAIL_RECIPIENTS: "alerts@example.com",
}

describe("validateEnv", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    // Unset all tracked vars so tests start from a clean slate
    for (const key of [...REQUIRED_KEYS, ...OPTIONAL_KEYS]) {
      vi.stubEnv(key, undefined as unknown as string)
    }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // ── Required vars ──────────────────────────────────────────────────────────

  it("does not throw when all required vars are present", () => {
    for (const [key, value] of Object.entries(allRequired)) {
      vi.stubEnv(key, value)
    }
    expect(() => validateEnv()).not.toThrow()
  })

  it("throws when one required var is missing", () => {
    for (const [key, value] of Object.entries(allRequired)) {
      vi.stubEnv(key, value)
    }
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined as unknown as string)

    expect(() => validateEnv()).toThrow("NEXT_PUBLIC_SUPABASE_URL")
  })

  it("throws with ALL missing var names in a single error", () => {
    // Leave all required vars unset
    let thrownMessage = ""
    try {
      validateEnv()
    } catch (e) {
      thrownMessage = (e as Error).message
    }
    for (const key of REQUIRED_KEYS) {
      expect(thrownMessage).toContain(key)
    }
  })

  it("throws with a reason for each missing var", () => {
    expect(() => validateEnv()).toThrowError(/needed for Supabase/)
  })

  it("error message references .env.example", () => {
    expect(() => validateEnv()).toThrowError(/.env.example/)
  })

  it("does not throw when only optional vars are missing", () => {
    for (const [key, value] of Object.entries(allRequired)) {
      vi.stubEnv(key, value)
    }
    // No optional vars set
    expect(() => validateEnv()).not.toThrow()
  })

  // ── Optional vars ──────────────────────────────────────────────────────────

  it("warns when an optional var is missing", () => {
    for (const [key, value] of Object.entries(allRequired)) {
      vi.stubEnv(key, value)
    }
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", undefined as unknown as string)

    validateEnv()

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Sentry not configured")
    )
  })

  it("does not warn when an optional var is present", () => {
    for (const [key, value] of Object.entries(allRequired)) {
      vi.stubEnv(key, value)
    }
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123")

    validateEnv()

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Stripe not configured")
    )
  })

  it("warns once for each missing optional var", () => {
    for (const [key, value] of Object.entries(allRequired)) {
      vi.stubEnv(key, value)
    }
    // All optional vars left unset

    validateEnv()

    expect(warnSpy).toHaveBeenCalledTimes(OPTIONAL_KEYS.length)
  })

  it("does not warn for any optional var when all are present", () => {
    for (const [key, value] of Object.entries({ ...allRequired, ...allOptional })) {
      vi.stubEnv(key, value)
    }

    validateEnv()

    expect(warnSpy).not.toHaveBeenCalled()
  })

  // ── Mixed scenarios ────────────────────────────────────────────────────────

  it("throws (not warns) when required vars are missing, even if optional vars are present", () => {
    for (const [key, value] of Object.entries(allOptional)) {
      vi.stubEnv(key, value)
    }
    // Required vars left unset

    expect(() => validateEnv()).toThrow("Missing required environment variables")
    // Should throw before reaching the warn loop
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("warns for missing optional vars when all required vars are present", () => {
    for (const [key, value] of Object.entries(allRequired)) {
      vi.stubEnv(key, value)
    }
    vi.stubEnv("PLAID_CLIENT_ID", undefined as unknown as string)
    vi.stubEnv("DISCORD_WEBHOOK_URL", undefined as unknown as string)

    validateEnv()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Plaid not configured"))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Discord webhook not configured"))
  })
})
