"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/app/db";
import { orgMembers } from "@/app/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult = { error: string } | { success: true };
type OAuthResult = { error: string } | { url: string };

// ─── Helper ───────────────────────────────────────────────────────────────────

async function setRoleCookie(role: string) {
  const cookieStore = await cookies();
  cookieStore.set("user-role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * loginAction
 *
 * Signs in with email + password. On success, sets the role cookie and
 * server-redirects to the correct portal. On failure, returns { error }.
 *
 * Called from the login page client component:
 *   const result = await loginAction(email, password)
 *   if ('error' in result) setError(result.error)
 *   // redirect happens automatically server-side on success
 */
export async function loginAction(
  email: string,
  password: string,
  next?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Login failed" };
  }

  // Fetch this user's org role from the DB
  const membership = await db.query.orgMembers.findFirst({
    where: eq(orgMembers.userId, data.user.id),
  });

  const role = membership?.role ?? "pending";
  await setRoleCookie(role);

  // Honor the `next` param if it's safe for this role
  if (next) {
    const nextIsAdvisor = next.startsWith("/app");
    const nextIsClient = next.startsWith("/client");
    const isAdvisor = role === "admin" || role === "assistant";
    if ((nextIsAdvisor && isAdvisor) || (nextIsClient && role === "client")) {
      redirect(next);
    }
  }

  const destination =
    role === "client" ? "/client" : role === "pending" ? "/onboarding" : "/app";
  redirect(destination);
}

// ─── Signup ───────────────────────────────────────────────────────────────────

/**
 * signupAction
 *
 * Creates a new Supabase auth account. If Supabase email confirmation is enabled,
 * returns { success: true } so the UI can show a "check your email" state.
 * If confirmation is disabled (dev), sets role cookie + redirects immediately.
 */
export async function signupAction(
  email: string,
  password: string,
  fullName: string
): Promise<ActionResult & { emailConfirmationRequired?: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Tell Supabase where to redirect after email confirmation
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If the user is immediately active (no email confirmation required)
  if (data.session) {
    await setRoleCookie("pending");
    redirect("/onboarding");
  }

  // Email confirmation required — UI will show "check your email"
  return { success: true, emailConfirmationRequired: true };
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * getOAuthUrlAction
 *
 * Generates the OAuth redirect URL for Google or Microsoft sign-in.
 * The client component calls this, then does window.location.href = url.
 *
 * Note: We return the URL rather than calling redirect() here because
 * Supabase's OAuth URL must be opened by the browser to set third-party
 * cookies correctly.
 */
export async function getOAuthUrlAction(
  provider: "google" | "azure"
): Promise<OAuthResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      // Request offline_access for Azure so we get a refresh token
      ...(provider === "azure" && { scopes: "openid email profile offline_access" }),
    },
  });

  if (error || !data.url) {
    return { error: error?.message ?? "OAuth failed" };
  }

  return { url: data.url };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * logoutAction
 *
 * Signs out from Supabase, clears the role cookie, and redirects to /login.
 * Call this from a logout button anywhere in the app:
 *
 *   <form action={logoutAction}>
 *     <button type="submit">Sign out</button>
 *   </form>
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete("user-role");

  redirect("/login");
}

// ─── Forgot / Reset password ──────────────────────────────────────────────────

export async function forgotPasswordAction(email: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function resetPasswordAction(
  newPassword: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };

  redirect("/app");
}
