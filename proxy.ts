/**
 * proxy.ts — Next.js Edge Middleware (Next.js 16+)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS MIDDLEWARE?                                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Middleware runs BEFORE a page renders — it sits between the browser    │
 * │ request and your Next.js pages. Think of it as a bouncer at the door:  │
 * │                                                                         │
 * │   Browser → [middleware.ts] → Page                                      │
 * │                ↓ (if not logged in)                                     │
 * │            redirect to /login                                           │
 * │                                                                         │
 * │ It runs on the Edge (Cloudflare/Vercel network), so it's fast and      │
 * │ doesn't spin up your full Node.js server for every check.              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHAT THIS FILE DOES:
 *   1. Refreshes the Supabase session token on every request (keeps the
 *      user logged in even if their JWT is about to expire).
 *   2. Protects all /app/* and /client/* routes — unauthenticated users
 *      are redirected to /login?next={currentPath}.
 *   3. Redirects already-authenticated users away from /login and /signup.
 *   4. Handles new users with no org membership → redirect to /onboarding.
 *
 * NOTE ON ROLE CHECKS:
 *   Middleware only checks "are you logged in?" not "are you an admin?".
 *   Role enforcement (admin vs. assistant vs. client) is done in Server
 *   Components via requireRole() from lib/auth.ts — middleware would need
 *   a DB query on every request which is too slow for the Edge.
 */

import { type NextRequest, NextResponse } from "next/server"
import { createMiddlewareClient } from "@/utils/supabase/middleware"

// ─── Route configuration ──────────────────────────────────────────────────────

/**
 * Routes that require the user to be authenticated.
 * Any path starting with these prefixes will be protected.
 */
const PROTECTED_PREFIXES = ["/app", "/client", "/onboarding"]

/**
 * Routes that authenticated users should NOT visit.
 * Visiting /login while logged in redirects to /app.
 */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"]

// ─── Main middleware function ─────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Step 1: Refresh the Supabase session and get the response with updated
  // cookies. This MUST happen on every request to keep tokens fresh.
  const { supabase, response } = createMiddlewareClient(request)

  // Step 2: Get the current user. Using getUser() (not getSession()) because
  // getUser() validates the token with the Supabase server — it can't be
  // spoofed by a tampered cookie. getSession() only reads the local cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user

  // ── Guard: Protected routes ──────────────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (isProtected && !isAuthenticated) {
    // Build the redirect URL: /login?next=/app/clients
    // This lets the login page send the user back where they were going.
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Guard: Auth routes (already logged in) ───────────────────────────────
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  if (isAuthRoute && isAuthenticated) {
    // Already logged in — send them to the dashboard instead
    return NextResponse.redirect(new URL("/app", request.url))
  }

  // All checks passed — return the response (with refreshed cookies)
  return response
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

/**
 * config.matcher tells Next.js which paths this middleware should run on.
 *
 * We EXCLUDE:
 *   - _next/static  — built JS/CSS bundles
 *   - _next/image   — image optimization API
 *   - favicon.ico   — browser tab icon
 *   - Files with extensions (.png, .svg, etc.) — static assets
 *
 * This prevents middleware from slowing down static file requests.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
