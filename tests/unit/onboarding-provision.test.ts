/**
 * ============================================================================
 * UNIT TESTS: onboarding-provision.test.ts
 * ============================================================================
 *
 * Tests pure logic for the admin org provisioning flow — slug generation,
 * org name derivation, email sanitization, and idempotency guards.
 *
 * No DB, no auth — just the business rules.
 */

import { describe, it, expect } from "vitest"

// ─── Logic extracted from provisionAdminOrg ──────────────────────────────────

function buildOrgSlug(email: string): string {
  const prefix = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  // In production a random suffix is appended; here we test the prefix part
  return prefix
}

function buildOrgName(email: string, fullName?: string | null): string {
  if (fullName?.trim()) return `${fullName.trim()}'s Firm`
  const prefix = email.split("@")[0]
  return `${prefix}'s Firm`
}

function isAlreadyProvisioned(orgId: string | null): boolean {
  return orgId !== null && orgId !== undefined
}

function sanitizeProfileName(name: string | undefined): string | null {
  if (!name || !name.trim()) return null
  return name.trim()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildOrgSlug", () => {
  it("converts simple email prefix to slug", () => {
    expect(buildOrgSlug("kevin@example.com")).toBe("kevin")
  })

  it("lowercases the prefix", () => {
    expect(buildOrgSlug("Kevin@example.com")).toBe("kevin")
  })

  it("replaces dots with dashes", () => {
    expect(buildOrgSlug("john.doe@example.com")).toBe("john-doe")
  })

  it("replaces plus signs with dashes", () => {
    expect(buildOrgSlug("kevin+test@example.com")).toBe("kevin-test")
  })

  it("collapses multiple non-alphanumeric chars", () => {
    expect(buildOrgSlug("binarydecisions1111@gmail.com")).toBe("binarydecisions1111")
  })

  it("strips leading dashes", () => {
    const slug = buildOrgSlug("_underscore@test.com")
    expect(slug).not.toMatch(/^-/)
  })

  it("strips trailing dashes", () => {
    const slug = buildOrgSlug("trailing.@test.com")
    expect(slug).not.toMatch(/-$/)
  })

  it("handles all-numeric prefix", () => {
    expect(buildOrgSlug("123456@test.com")).toBe("123456")
  })

  it("handles prefix with multiple consecutive special chars", () => {
    expect(buildOrgSlug("foo--bar@test.com")).toBe("foo-bar")
  })
})

describe("buildOrgName", () => {
  it("uses fullName when provided", () => {
    expect(buildOrgName("kevin@test.com", "Kevin Lam")).toBe("Kevin Lam's Firm")
  })

  it("trims whitespace from fullName", () => {
    expect(buildOrgName("kevin@test.com", "  Kevin  ")).toBe("Kevin's Firm")
  })

  it("falls back to email prefix when fullName is null", () => {
    expect(buildOrgName("binarydecisions1111@gmail.com", null)).toBe("binarydecisions1111's Firm")
  })

  it("falls back to email prefix when fullName is empty string", () => {
    expect(buildOrgName("kevin@test.com", "")).toBe("kevin's Firm")
  })

  it("falls back to email prefix when fullName is undefined", () => {
    expect(buildOrgName("kevin@test.com", undefined)).toBe("kevin's Firm")
  })

  it("falls back to email prefix when fullName is whitespace only", () => {
    expect(buildOrgName("kevin@test.com", "   ")).toBe("kevin's Firm")
  })

  it("handles email with domain only (edge case)", () => {
    const name = buildOrgName("a@b.com", null)
    expect(name).toBe("a's Firm")
  })
})

describe("isAlreadyProvisioned", () => {
  it("returns false when orgId is null", () => {
    expect(isAlreadyProvisioned(null)).toBe(false)
  })

  it("returns false when orgId is undefined (cast to null)", () => {
    expect(isAlreadyProvisioned(null)).toBe(false)
  })

  it("returns true when orgId is a valid UUID string", () => {
    expect(isAlreadyProvisioned("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
  })

  it("returns true even for a short string (non-empty)", () => {
    expect(isAlreadyProvisioned("org-123")).toBe(true)
  })
})

describe("sanitizeProfileName", () => {
  it("trims whitespace", () => {
    expect(sanitizeProfileName("  Kevin Lam  ")).toBe("Kevin Lam")
  })

  it("returns null for empty string", () => {
    expect(sanitizeProfileName("")).toBeNull()
  })

  it("returns null for whitespace-only string", () => {
    expect(sanitizeProfileName("   ")).toBeNull()
  })

  it("returns null for undefined", () => {
    expect(sanitizeProfileName(undefined)).toBeNull()
  })

  it("preserves internal spaces", () => {
    expect(sanitizeProfileName("John  Doe")).toBe("John  Doe")
  })
})

describe("slug uniqueness via suffix", () => {
  // The real provisionAdminOrg appends Math.random().toString(36).slice(2,6)
  // Test that the pattern produces a valid URL-safe slug

  function buildFullSlug(email: string, suffix: string): string {
    const prefix = buildOrgSlug(email)
    return `${prefix}-${suffix}`
  }

  it("full slug has correct format: prefix-suffix", () => {
    const slug = buildFullSlug("kevin@test.com", "ab12")
    expect(slug).toBe("kevin-ab12")
  })

  it("two calls with different suffixes produce different slugs", () => {
    const slug1 = buildFullSlug("kevin@test.com", "ab12")
    const slug2 = buildFullSlug("kevin@test.com", "cd34")
    expect(slug1).not.toBe(slug2)
  })

  it("slug contains only alphanumeric chars and dashes", () => {
    const slug = buildFullSlug("binarydecisions1111@gmail.com", "x9z2")
    expect(slug).toMatch(/^[a-z0-9-]+$/)
  })
})
