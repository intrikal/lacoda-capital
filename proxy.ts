import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // ─── 1. Refresh session (required on every request) ────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Use getUser() not getSession() — getUser() validates with Supabase
  // servers on every call, getSession() only reads the local JWT (can be stale).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ─── 2. Role from cookie (set during auth/callback) ────────────────────────
  // This cookie is HttpOnly and set server-side — clients cannot forge it.
  // It's a UX routing hint. Real data access is gated in server components/actions
  // via a fresh DB lookup (lib/auth.ts → requireRole).
  const role = request.cookies.get("user-role")?.value;

  // ─── 3. Classify route ─────────────────────────────────────────────────────
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isAdvisorRoute = pathname.startsWith("/app");
  const isClientRoute = pathname.startsWith("/client");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isProtectedRoute = isAdvisorRoute || isClientRoute || isOnboardingRoute;

  // ─── 4. Redirect rules ─────────────────────────────────────────────────────

  // Not authenticated → send to login (preserve destination for post-login redirect)
  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated → don't show auth pages, send to their dashboard
  if (user && isAuthRoute) {
    const destination = role === "client" ? "/client" : "/app";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Wrong portal for role — prevent advisors from accessing client portal & vice versa
  if (user && isAdvisorRoute && role === "client") {
    return NextResponse.redirect(new URL("/client", request.url));
  }
  if (user && isClientRoute && (role === "admin" || role === "assistant")) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public image/font assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
