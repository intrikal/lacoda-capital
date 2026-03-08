import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_ROUTES = ["/app", "/onboarding", "/client"]
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Inline the client here — proxy needs access to both the supabase client
  // AND the response object simultaneously to correctly refresh session cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() must be called to keep the session cookie refreshed
  // on every request — do not skip this even if you don't use the user object
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Not logged in → redirect to login
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Already logged in → skip auth pages, go straight to app
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/app", request.url))
  }

  return supabaseResponse
}

export const config = {
  // Run on all routes except static files and Next.js internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
