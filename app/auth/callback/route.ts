import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/app/db";
import { users, orgs, orgMembers } from "@/app/db/schema";
import { dispatchAlert } from "@/lib/alerts";
import { captureServerEvent } from "@/lib/analytics/server";

// ─── Constants ────────────────────────────────────────────────────────────────

/** The email address that automatically becomes admin of the Lacoda Capital org. */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

/** The canonical org for this deployment. */
const LACODA_ORG = {
  name: "Lacoda Capital Holdings",
  slug: "lacoda-capital",
} as const;

// ─── Route Handler ────────────────────────────────────────────────────────────

/**
 * GET /auth/callback
 *
 * Handles two types of Supabase auth flows:
 *   1. OAuth (Google, Microsoft) — exchanges `code` for session
 *   2. Email links (signup confirmation, password reset) — exchanges `token_hash`
 *
 * After session is established it:
 *   - Upserts the user into our `users` table
 *   - Seeds org + admin membership for the admin email on first login
 *   - Looks up the user's role from `org_members`
 *   - Sets an HttpOnly `user-role` cookie for middleware routing
 *   - Redirects to the correct portal
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? null;

  const cookieStore = await cookies();

  // Build supabase client that can write cookies in this route handler
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // ─── Step 1: Exchange for session ─────────────────────────────────────────

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      Sentry.withScope((scope) => {
        scope.setContext("auth", { step: "exchangeCodeForSession" })
        scope.captureException(new Error(error.message))
      })
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "signup" | "recovery" | "email" });
    if (error) {
      console.error("[auth/callback] verifyOtp error:", error.message);
      Sentry.withScope((scope) => {
        scope.setContext("auth", { step: "verifyOtp", type })
        scope.captureException(new Error(error.message))
      })
      return NextResponse.redirect(new URL("/login?error=link_expired", request.url));
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=missing_params", request.url));
  }

  // ─── Step 2: Get the authenticated user ───────────────────────────────────

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[auth/callback] getUser error:", userError?.message);
    Sentry.withScope((scope) => {
      scope.setContext("auth", { step: "getUser" })
      scope.captureException(new Error(userError?.message ?? "getUser returned no user"))
    })
    return NextResponse.redirect(new URL("/login?error=no_user", request.url));
  }

  // ─── Step 3: Sync user into our users table ───────────────────────────────

  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email!,
      fullName:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: user.email!,
        // Only update avatar/name if they came from OAuth (provider fills these in)
        ...(user.user_metadata?.avatar_url && {
          avatarUrl: user.user_metadata.avatar_url,
        }),
        updatedAt: new Date(),
      },
    });

  // ─── Step 4: Resolve or seed org membership ───────────────────────────────

  let role: string;
  let redirectTo: string;

  const existingMembership = await db.query.orgMembers.findFirst({
    where: eq(orgMembers.userId, user.id),
  });

  if (existingMembership) {
    // User already has a role — just use it
    role = existingMembership.role;
    redirectTo = role === "client" ? "/client" : "/app";
  } else if (user.email === ADMIN_EMAIL) {
    // ── Admin bootstrap: ensure the Lacoda org + admin membership exist ──
    let org = await db.query.orgs.findFirst({
      where: eq(orgs.slug, LACODA_ORG.slug),
    });

    if (!org) {
      const [created] = await db
        .insert(orgs)
        .values({ name: LACODA_ORG.name, slug: LACODA_ORG.slug })
        .returning();
      org = created;
    }

    await db.insert(orgMembers).values({
      orgId: org.id,
      userId: user.id,
      role: "admin",
    });

    role = "admin";
    redirectTo = "/app";
  } else {
    // New user without an org → onboarding flow
    role = "pending";
    redirectTo = "/onboarding";

    captureServerEvent(user.id, "marketing.signup_completed", {
      method: code ? "oauth" : "email",
    });

    dispatchAlert({
      title: "New user signup",
      description: `${user.email} signed up and is pending onboarding.`,
      severity: "info",
      source: "auth-callback",
    }).catch(() => {});
  }

  // ─── Step 5: Set role cookie ───────────────────────────────────────────────
  // HttpOnly = JS can't read it, only the browser sends it automatically.
  // This cookie is the routing signal for proxy.ts middleware.
  // Actual data access is always re-verified via DB in server components/actions.

  cookieStore.set("user-role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  // ─── Step 6: Redirect ──────────────────────────────────────────────────────
  // If middleware saved a `next` param (e.g., user tried to go to /app/clients
  // but got bounced to login), honor that destination — but only if the role
  // permits that route to prevent privilege escalation.

  if (next) {
    const nextIsAdvisor = next.startsWith("/app");
    const nextIsClient = next.startsWith("/client");
    const isAdvisor = role === "admin" || role === "assistant";

    if ((nextIsAdvisor && isAdvisor) || (nextIsClient && role === "client")) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
