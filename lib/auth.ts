import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/app/db";
import { orgMembers } from "@/app/db/schema";
import type { OrgMember } from "@/app/db/schema/org_members";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthSession = {
  userId: string;
  email: string;
  role: OrgMember["role"] | "pending";
  orgId: string | null;
  memberId: string | null;
};

type RequiredRole = "admin" | "assistant" | "client";

// ─── Core helper ─────────────────────────────────────────────────────────────

/**
 * getSession()
 *
 * Returns the current user's session enriched with their org role.
 * Returns null if the user is not authenticated.
 *
 * Use this in Server Components and Server Actions where you need
 * to know who is making the request.
 *
 * Example:
 *   const session = await getSession()
 *   if (!session) redirect('/login')
 *   console.log(session.role) // "admin" | "assistant" | "client" | "pending"
 */
export async function getSession(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const membership = await db.query.orgMembers.findFirst({
    where: eq(orgMembers.userId, user.id),
  });

  return {
    userId: user.id,
    email: user.email!,
    role: membership?.role ?? "pending",
    orgId: membership?.orgId ?? null,
    memberId: membership?.id ?? null,
  };
}

// ─── Route guards ─────────────────────────────────────────────────────────────

/**
 * requireAuth()
 *
 * Call at the top of any Server Component or Server Action that requires login.
 * Redirects to /login if not authenticated, otherwise returns the session.
 *
 * Example:
 *   export default async function DashboardPage() {
 *     const session = await requireAuth()
 *     // session is guaranteed non-null here
 *   }
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * requireRole()
 *
 * Call in Server Components or Server Actions that require a specific role.
 * Redirects to /login (unauthenticated) or throws a 403 response (wrong role).
 *
 * Example:
 *   export default async function AdminPage() {
 *     const session = await requireRole(["admin"])
 *     // only admins reach here
 *   }
 */
export async function requireRole(
  allowedRoles: RequiredRole[]
): Promise<AuthSession> {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.role as RequiredRole)) {
    // Wrong role — redirect to their correct portal rather than a blank error
    const destination =
      session.role === "client"
        ? "/client"
        : session.role === "pending"
        ? "/onboarding"
        : "/app";
    redirect(destination);
  }

  return session;
}

// ─── Convenience guards ───────────────────────────────────────────────────────

/** Require admin or assistant (advisor portal access). */
export const requireAdvisor = () => requireRole(["admin", "assistant"]);

/** Require admin only (destructive or org-wide operations). */
export const requireAdmin = () => requireRole(["admin"]);

/** Require client role (client portal access). */
export const requireClient = () => requireRole(["client"]);
