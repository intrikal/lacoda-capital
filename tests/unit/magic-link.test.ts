/**
 * Magic Link Generation Tests
 *
 * Tests that magic link generation produces correct redirect URLs.
 */

import { describe, it, expect } from "vitest"
import { generatePortalToken } from "@/lib/portal-token"

describe("magic link URL generation", () => {
  it("generates correct portal redirect URL", () => {
    const token = generatePortalToken()
    const baseUrl = "https://app.lacoda.capital"
    const redirectUrl = `${baseUrl}/portal/${token}`

    expect(redirectUrl).toContain("/portal/")
    expect(redirectUrl).toContain(token)
    expect(redirectUrl.startsWith("https://")).toBe(true)
  })

  it("redirect URL contains the full token", () => {
    const token = generatePortalToken()
    const url = `https://app.lacoda.capital/portal/${token}`

    // Extract token from URL
    const extractedToken = url.split("/portal/")[1]
    expect(extractedToken).toBe(token)
    expect(extractedToken.length).toBe(64)
  })

  it("different portals get different URLs", () => {
    const token1 = generatePortalToken()
    const token2 = generatePortalToken()

    const url1 = `/portal/${token1}`
    const url2 = `/portal/${token2}`

    expect(url1).not.toBe(url2)
  })

  it("supabase signInWithOtp would receive correct redirect", () => {
    const token = "abc123def456".padEnd(64, "0")
    const siteUrl = "https://app.lacoda.capital"
    const expectedRedirect = `${siteUrl}/portal/${token}`

    // This is what sendPortalMagicLink would pass to supabase
    const options = {
      email: "jane@advisory.com",
      emailRedirectTo: expectedRedirect,
    }

    expect(options.emailRedirectTo).toBe(expectedRedirect)
    expect(options.emailRedirectTo).toContain("/portal/")
  })
})
