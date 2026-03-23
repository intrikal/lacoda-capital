/**
 * lib/auth.ts — Server-side auth helpers
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS THIS FILE?                                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ These are helper functions you call at the top of Server Components    │
 * │ and Server Actions to answer two questions:                            │
 * │                                                                         │
 * │   1. "Is this user logged in?"  → use requireAuth() or getSession()   │
 * │   2. "Does this user have the right role?"  → use requireRole()       │
 * │                                                                         │
 * │ If a check fails, these functions REDIRECT automatically — you don't   │
 * │ need an if/else in every page.                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ROLE HIERARCHY (lowest → highest):
 *
 *   pending < client < assistant < admin
 *
 * requireRole("assistant") means: the user must be assistant OR admin.
 * This lets you write "minimum required role" guards easily.
 */

import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { createClient } from "@/utils/supabase/server"
import { db } from "@/app/db"
import { orgMembers } from "@/app/db/schema"
import type { OrgMember } from "@/app/db/schema/org_members"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthSession = {
  userId: string
  email: string
  role: OrgMember["role"] | "pending"
  orgId: string | null
  memberId: string | null
}

/**
 * Role hierarchy used by requireRole(minimumRole).
 *
 * Higher index = more permissions.
 * "pending" is below "client" — new users with no org assignment yet.
 */
const ROLE_HIERARCHY = ["pending", "client", "assistant", "admin"] as const
type HierarchyRole = (typeof ROLE_HIERARCHY)[number]

type RequiredRole = "admin" | "assistant" | "client"

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const membership = await db.query.orgMembers.findFirst({
    where: eq(orgMembers.userId, user.id),
  })

  return {
    userId: user.id,
    email: user.email!,
    role: membership?.role ?? "pending",
    orgId: membership?.orgId ?? null,
    memberId: membership?.id ?? null,
  }
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
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

/**
 * getSessionOrRedirect()
 *
 * Server Action helper — returns the current user + their org membership.
 * Handles the three special cases automatically:
 *
 *   • Not logged in            → redirect to /login
 *   • No org membership yet    → redirect to /onboarding  (new signup)
 *   • Has membership           → returns the full AuthSession
 *
 * Use this instead of requireAuth() when you also want to handle the
 * "new user with no org" case (otherwise they'd silently get role="pending").
 *
 * Example:
 *   export async function myAction() {
 *     "use server"
 *     const session = await getSessionOrRedirect()
 *     // session.orgId is guaranteed non-null here
 *   }
 */
export async function getSessionOrRedirect(): Promise<
  AuthSession & { orgId: string; memberId: string }
> {
  const session = await requireAuth()

  if (!session.orgId || !session.memberId) {
    // Authenticated but not yet assigned to an org — send to onboarding
    redirect("/onboarding")
  }

  return session as AuthSession & { orgId: string; memberId: string }
}

/**
 * requireRole(minimumRole)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ MINIMUM ROLE GUARD                                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Unlike the old requireRole([...allowedRoles]), this version takes a    │
 * │ MINIMUM required role and uses the hierarchy:                          │
 * │                                                                         │
 * │   pending < client < assistant < admin                                 │
 * │                                                                         │
 * │ requireRole("assistant") allows: assistant, admin                      │
 * │ requireRole("client")    allows: client, assistant, admin              │
 * │ requireRole("admin")     allows: admin only                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Throws (redirects) if:
 *   - Not logged in → /login
 *   - No org membership → /onboarding
 *   - Role is below minimumRole → /unauthorized
 *
 * Example:
 *   export default async function AdminPage() {
 *     const session = await requireRole("admin")
 *     // only admins reach here
 *   }
 *
 *   export default async function AdvisorPage() {
 *     const session = await requireRole("assistant")
 *     // assistants AND admins reach here
 *   }
 */
export async function requireRole(
  minimumRole: RequiredRole
): Promise<AuthSession & { orgId: string; memberId: string }> {
  const session = await getSessionOrRedirect()

  const userRank = ROLE_HIERARCHY.indexOf(session.role as HierarchyRole)
  const requiredRank = ROLE_HIERARCHY.indexOf(minimumRole)

  if (userRank < requiredRank) {
    // User's role is below the minimum — redirect to the appropriate portal
    const destination =
      session.role === "client"
        ? "/client"
        : "/unauthorized"
    redirect(destination)
  }

  return session
}

// ─── Convenience guards ───────────────────────────────────────────────────────

/** Require admin or assistant (advisor portal access). */
export const requireAdvisor = () => requireRole("assistant")

/** Require admin only (destructive or org-wide operations). */
export const requireAdmin = () => requireRole("admin")

/** Require client role (client portal access). */
export const requireClient = () => requireRole("client")
