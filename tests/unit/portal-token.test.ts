/**
 * Stakeholder Portal Token Tests
 *
 * Tests that portal URL tokens are unique and non-guessable.
 */

import { describe, it, expect } from "vitest"
import { generatePortalToken, isValidPortalToken } from "@/lib/portal-token"

describe("portal token generation", () => {
  it("produces unique, non-guessable tokens", () => {
    const token1 = generatePortalToken()
    const token2 = generatePortalToken()

    expect(token1).not.toBe(token2)
    expect(token1.length).toBe(64)
    expect(token2.length).toBe(64)
  })

  it("produces tokens with only hex characters", () => {
    const token = generatePortalToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it("generates 10 unique tokens without collision", () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 10; i++) {
      tokens.add(generatePortalToken())
    }
    expect(tokens.size).toBe(10)
  })

  it("validates correct token format", () => {
    const token = generatePortalToken()
    expect(isValidPortalToken(token)).toBe(true)
  })

  it("rejects too-short tokens", () => {
    expect(isValidPortalToken("abc123")).toBe(false)
  })

  it("rejects tokens with non-hex characters", () => {
    expect(isValidPortalToken("g".repeat(64))).toBe(false)
  })

  it("rejects empty string", () => {
    expect(isValidPortalToken("")).toBe(false)
  })
})
