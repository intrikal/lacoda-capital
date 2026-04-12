/**
 * ============================================================================
 * TEST FILE: proxy.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the proxy() edge middleware from proxy.ts.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT DOES THIS TEST CHECK?                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ proxy() is the "front door bouncer" — it runs on EVERY request before  │
 * │ any page renders. Unlike requireRole() (which checks your role inside  │
 * │ the app), proxy() only asks: "Are you logged in at all?"               │
 * │                                                                         │
 * │   ✓ Unauthenticated users hitting /app/*, /client/*, /onboarding/*    │
 * │     → redirect to /login?next={path}                                   │
 * │   ✓ Authenticated users hitting /login, /signup, etc.                  │
 * │     → redirect to /app (they're already logged in)                     │
 * │   ✓ Self-auth routes (/api/v1/*, /portal/*) → always pass through     │
 * │   ✓ Marketing pages (/, /pricing) → always pass through               │
 * │   ✓ Every request refreshes the Supabase session via getUser()        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * HOW THE MOCKS WORK:
 *   We mock two things:
 *   1. createMiddlewareClient — returns a fake supabase client + response
 *   2. NextResponse.redirect — so we can capture where it redirects to
 *
 *   We do NOT mock NextRequest — we construct real-ish objects with the
 *   URL paths we want to test.
 *
 * RUN THIS TEST:
 *   npx vitest run --project unit tests/unit/proxy.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock: @/utils/supabase/middleware ────────────────────────────────────────

/**
 * We need to control what createMiddlewareClient returns so we can
 * simulate "logged in" vs "not logged in" scenarios.
 */
const mockGetUser = vi.fn()
const mockResponse = { headers: new Headers(), type: "middleware-response" }

vi.mock("@/utils/supabase/middleware", () => ({
  createMiddlewareClient: vi.fn(() => ({
    supabase: {
      auth: {
        getUser: mockGetUser,
      },
    },
    response: mockResponse,
  })),
}))

// ─── Mock: next/server (NextResponse.redirect) ──────────────────────────────

/**
 * NextResponse.redirect() normally creates a real HTTP redirect response.
 * We mock it to return a simple object we can inspect in assertions.
 *
 * NextResponse.next() is used inside createMiddlewareClient (which is
 * already fully mocked above), so we just make it a no-op here.
 */
const mockRedirect = vi.fn((url: URL) => ({
  type: "redirect",
  url: url.toString(),
}))

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (...args: unknown[]) => mockRedirect(...(args as [URL])),
    next: vi.fn(() => mockResponse),
  },
}))

// ─── Import AFTER mocks are set up ──────────────────────────────────────────

import { proxy } from "@/proxy"
import { createMiddlewareClient } from "@/utils/supabase/middleware"

// ─── Helper: build a fake NextRequest ───────────────────────────────────────

/**
 * makeRequest() — builds a minimal NextRequest-like object for a given path.
 *
 * The real NextRequest has many properties, but proxy() only uses:
 *   - request.nextUrl.pathname  (to check which route was hit)
 *   - request.url               (as the base for redirect URLs)
 *
 * So we build just enough to satisfy those needs.
 */
function makeRequest(pathname: string) {
  const url = new URL(pathname, "http://localhost:3000")
  return {
    nextUrl: url,
    url: url.toString(),
  } as never // cast to NextRequest — we only use the fields proxy() reads
}

// ─── Helpers: simulate auth states ──────────────────────────────────────────

function mockAuthenticated(userId = "user-123") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId, email: "test@example.com" } },
  })
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("proxy() edge middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ════════════════════════════════════════════════════════════════════════
  // UNAUTHENTICATED USER
  // ════════════════════════════════════════════════════════════════════════

  describe("unauthenticated user", () => {
    beforeEach(() => {
      mockUnauthenticated()
    })

    // ── Protected routes → redirect to /login ───────────────────────────

    it("redirects /app/clients to /login?next=/app/clients", async () => {
      const result = await proxy(makeRequest("/app/clients"))

      expect(mockRedirect).toHaveBeenCalledOnce()
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL
      expect(redirectUrl.pathname).toBe("/login")
      expect(redirectUrl.searchParams.get("next")).toBe("/app/clients")
      expect(result).toEqual(expect.objectContaining({ type: "redirect" }))
    })

    it("redirects /client/portfolio to /login?next=/client/portfolio", async () => {
      const result = await proxy(makeRequest("/client/portfolio"))

      expect(mockRedirect).toHaveBeenCalledOnce()
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL
      expect(redirectUrl.pathname).toBe("/login")
      expect(redirectUrl.searchParams.get("next")).toBe("/client/portfolio")
      expect(result).toEqual(expect.objectContaining({ type: "redirect" }))
    })

    it("redirects /onboarding to /login?next=/onboarding", async () => {
      const result = await proxy(makeRequest("/onboarding"))

      expect(mockRedirect).toHaveBeenCalledOnce()
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL
      expect(redirectUrl.pathname).toBe("/login")
      expect(redirectUrl.searchParams.get("next")).toBe("/onboarding")
      expect(result).toEqual(expect.objectContaining({ type: "redirect" }))
    })

    // ── Marketing pages → pass through ──────────────────────────────────

    it("passes through / (marketing homepage)", async () => {
      const result = await proxy(makeRequest("/"))

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBe(mockResponse)
    })

    it("passes through /pricing (marketing page)", async () => {
      const result = await proxy(makeRequest("/pricing"))

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBe(mockResponse)
    })

    // ── Self-auth routes → pass through (they handle their own auth) ────

    it("passes through /api/v1/assets (self-auth API route)", async () => {
      const result = await proxy(makeRequest("/api/v1/assets"))

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBe(mockResponse)
    })

    it("passes through /portal/abc123 (self-auth portal route)", async () => {
      const result = await proxy(makeRequest("/portal/abc123"))

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBe(mockResponse)
    })
  })

  // ════════════════════════════════════════════════════════════════════════
  // AUTHENTICATED USER
  // ════════════════════════════════════════════════════════════════════════

  describe("authenticated user", () => {
    beforeEach(() => {
      mockAuthenticated()
    })

    // ── Protected routes → pass through (user is logged in) ─────────────

    it("passes through /app/clients (returns response with refreshed cookies)", async () => {
      const result = await proxy(makeRequest("/app/clients"))

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBe(mockResponse)
    })

    // ── Auth routes → redirect to /app (already logged in) ─────────────

    it("redirects /login to /app", async () => {
      const result = await proxy(makeRequest("/login"))

      expect(mockRedirect).toHaveBeenCalledOnce()
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL
      expect(redirectUrl.pathname).toBe("/app")
      expect(result).toEqual(expect.objectContaining({ type: "redirect" }))
    })

    it("redirects /signup to /app", async () => {
      const result = await proxy(makeRequest("/signup"))

      expect(mockRedirect).toHaveBeenCalledOnce()
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL
      expect(redirectUrl.pathname).toBe("/app")
      expect(result).toEqual(expect.objectContaining({ type: "redirect" }))
    })

    it("redirects /forgot-password to /app", async () => {
      const result = await proxy(makeRequest("/forgot-password"))

      expect(mockRedirect).toHaveBeenCalledOnce()
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL
      expect(redirectUrl.pathname).toBe("/app")
      expect(result).toEqual(expect.objectContaining({ type: "redirect" }))
    })

    // ── Marketing pages → pass through (accessible to everyone) ─────────

    it("passes through / (marketing pages accessible to everyone)", async () => {
      const result = await proxy(makeRequest("/"))

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBe(mockResponse)
    })
  })

  // ════════════════════════════════════════════════════════════════════════
  // SESSION REFRESH
  // ════════════════════════════════════════════════════════════════════════

  describe("session refresh", () => {
    it("calls supabase.auth.getUser() on every request", async () => {
      mockAuthenticated()

      await proxy(makeRequest("/app/dashboard"))

      expect(mockGetUser).toHaveBeenCalledOnce()
    })

    it("calls createMiddlewareClient with the request", async () => {
      mockAuthenticated()
      const request = makeRequest("/app/dashboard")

      await proxy(request)

      expect(createMiddlewareClient).toHaveBeenCalledWith(request)
    })

    it("returns the response from createMiddlewareClient (carries refreshed cookies)", async () => {
      mockAuthenticated()

      const result = await proxy(makeRequest("/about"))

      expect(result).toBe(mockResponse)
    })
  })
})
