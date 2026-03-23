/**
 * utils/supabase/middleware.ts
 *
 * Creates a Supabase client designed to run inside Next.js middleware
 * (proxy.ts). Unlike the server client, this one reads/writes cookies
 * directly on the incoming NextRequest and outgoing NextResponse so that
 * the refreshed session token travels back to the browser.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHY A SEPARATE CLIENT FOR MIDDLEWARE?                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ In Server Components you call `cookies()` from next/headers.           │
 * │ In middleware you have a NextRequest object with its own .cookies API. │
 * │ Supabase's SSR package needs us to wire up those two different APIs,   │
 * │ hence the separate factory function here.                               │
 * │                                                                         │
 * │ We return BOTH the supabase client AND the response so the middleware  │
 * │ can call supabase.auth.getUser() and then forward the response (which  │
 * │ carries the refreshed auth cookies) to the browser.                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * IMPORTANT — cookie options bug fix:
 *   The original code dropped `options` in the first setAll loop, which
 *   stripped security flags like HttpOnly, SameSite, and Secure from the
 *   refreshed cookies. This version always passes options through.
 */

import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

/**
 * createMiddlewareClient()
 *
 * Call this at the top of your middleware function. It:
 *   1. Creates a Supabase client wired to the request's cookies
 *   2. Returns a `response` object (NextResponse.next()) that carries
 *      any refreshed auth cookies back to the browser
 *
 * Usage in proxy.ts:
 *   const { supabase, response } = createMiddlewareClient(request)
 *   const { data: { user } } = await supabase.auth.getUser()
 *   // ... check auth, then:
 *   return response  // ← always return this, not NextResponse.next()
 */
export function createMiddlewareClient(request: NextRequest): {
  supabase: ReturnType<typeof createServerClient>
  response: NextResponse
} {
  // Create a mutable response object. We'll attach refreshed cookies to it.
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // First: write the cookies onto the request so subsequent middleware
        // reads see the updated values within this same request lifecycle.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )

        // Recreate the response so it inherits the updated request headers.
        response = NextResponse.next({ request })

        // Then: write cookies onto the response so the browser receives them.
        // Pass `options` here to preserve HttpOnly, SameSite, Secure, etc.
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  return { supabase, response }
}
