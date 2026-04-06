"use server"

import { eq, count } from "drizzle-orm"
import { db } from "@/app/db"
import { orgs, orgMembers, users, documents, clients, entities } from "@/app/db/schema"
import { requireAuth } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { captureServerEvent } from "@/lib/analytics/posthog-server"

// ─── Provision admin org (new user signup) ──────────────────────────────────

/**
 * provisionAdminOrg()
 *
 * Called at the end of the onboarding tour for a brand-new user who has no org yet.
 * Creates the `users` row, an `orgs` row, and an `org_members` row with role "admin".
 *
 * Safe to call multiple times — skips everything if the user is already provisioned.
 */
export async function provisionAdminOrg(input: {
  fullName?: string
  phone?: string
}): Promise<{ success: boolean }> {
  const session = await requireAuth()

  // Already provisioned — nothing to do
  if (session.orgId) return { success: true }

  // Upsert the public users row (matches Supabase auth.users.id)
  await db
    .insert(users)
    .values({
      id: session.userId,
      email: session.email,
      fullName: input.fullName?.trim() || null,
    })
    .onConflictDoNothing()

  // Build a URL-safe slug from the email prefix + random suffix
  const emailPrefix = session.email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  const slug = `${emailPrefix}-${Math.random().toString(36).slice(2, 6)}`

  // Create the org
  const orgName = input.fullName?.trim()
    ? `${input.fullName.trim()}'s Firm`
    : `${session.email.split("@")[0]}'s Firm`

  const [org] = await db
    .insert(orgs)
    .values({ name: orgName, slug })
    .returning()

  // Create the admin membership
  await db.insert(orgMembers).values({
    orgId: org.id,
    userId: session.userId,
    role: "admin",
  })

  captureServerEvent(session.userId, "onboarding.org_provisioned", { org_id: org.id })

  return { success: true }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingState {
  /** Whether the wizard should show (new org with 0 assets) */
  showWizard: boolean
  /** Which steps have been completed */
  completedSteps: {
    org: boolean
    team: boolean
    asset: boolean
    document: boolean
  }
  /** Org info for step 1 pre-fill */
  orgInfo: {
    id: string
    name: string
    timezone: string | null
    currency: string | null
  } | null
}

export interface OnboardingChecklist {
  steps: {
    key: string
    label: string
    description: string
    completed: boolean
    href: string
  }[]
  completedCount: number
  totalCount: number
}

// ─── Get onboarding state ───────────────────────────────────────────────────

export async function getOnboardingState(): Promise<OnboardingState> {
  const session = await requireAuth()

  // No org yet — definitely needs onboarding
  if (!session.orgId) {
    return {
      showWizard: true,
      completedSteps: { org: false, team: false, asset: false, document: false },
      orgInfo: null,
    }
  }

  // Simplified: just check if any entities exist (which implies assets might)
  const [entityCount] = await db
    .select({ total: count() })
    .from(entities)
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(eq(clients.orgId, session.orgId))

  // Check each step
  const [org] = await db.select().from(orgs).where(eq(orgs.id, session.orgId))
  const [memberCount] = await db
    .select({ total: count() })
    .from(orgMembers)
    .where(eq(orgMembers.orgId, session.orgId))
  const [docCount] = await db
    .select({ total: count() })
    .from(documents)
    .where(eq(documents.orgId, session.orgId))

  const hasAssets = entityCount.total > 0
  const hasTeam = memberCount.total > 1 // more than just the creator
  const hasDocs = docCount.total > 0

  // Don't show wizard if org already has assets
  if (hasAssets) {
    return {
      showWizard: false,
      completedSteps: { org: true, team: hasTeam, asset: true, document: hasDocs },
      orgInfo: org
        ? {
            id: org.id,
            name: org.name,
            timezone: (org.settings as Record<string, unknown>)?.timezone as string ?? null,
            currency: (org.settings as Record<string, unknown>)?.currency as string ?? null,
          }
        : null,
    }
  }

  return {
    showWizard: true,
    completedSteps: {
      org: !!org,
      team: hasTeam,
      asset: false,
      document: hasDocs,
    },
    orgInfo: org
      ? {
          id: org.id,
          name: org.name,
          timezone: (org.settings as Record<string, unknown>)?.timezone as string ?? null,
          currency: (org.settings as Record<string, unknown>)?.currency as string ?? null,
        }
      : null,
  }
}

// ─── Update org info (step 1) ───────────────────────────────────────────────

export async function updateOrgOnboarding(input: {
  name: string
  timezone: string
  currency: string
}): Promise<{ success: boolean }> {
  const session = await requireAuth()
  if (!session.orgId) throw new Error("No org")

  const [org] = await db.select().from(orgs).where(eq(orgs.id, session.orgId))
  const existingSettings = (org.settings as Record<string, unknown>) ?? {}

  await db
    .update(orgs)
    .set({
      name: input.name,
      settings: { ...existingSettings, timezone: input.timezone, currency: input.currency },
    })
    .where(eq(orgs.id, session.orgId))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: session.orgId,
    metadata: { step: "onboarding_org_setup" },
  })

  captureServerEvent(session.userId, "onboarding.org_updated", { org_id: session.orgId })

  return { success: true }
}

// ─── Invite team member (step 2) ────────────────────────────────────────────

export async function inviteTeamMember(input: {
  email: string
  role: "admin" | "assistant" | "client"
}): Promise<{ success: boolean }> {
  const session = await requireAuth()
  if (!session.orgId) throw new Error("No org")

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  })

  if (existingUser) {
    // Check if already a member
    const existingMember = await db.query.orgMembers.findFirst({
      where: eq(orgMembers.userId, existingUser.id),
    })
    if (existingMember) {
      throw new Error("User is already a member of this organization")
    }

    // Add directly
    await db.insert(orgMembers).values({
      orgId: session.orgId,
      userId: existingUser.id,
      role: input.role,
    })
  }

  // Send invite email via the send-email Supabase Edge Function.
  // Only attempted for new users (existing users are already on the platform).
  // Failures are non-fatal — the member row was already written.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (supabaseUrl && supabaseAnonKey) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? supabaseUrl
    fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        to: input.email,
        subject: "You've been invited to Lacoda",
        html: `<p>You've been invited to join Lacoda as <strong>${input.role}</strong>.</p><p><a href="${appUrl}/login">Sign in to get started</a></p>`,
      }),
    }).catch((err) => console.error("[onboarding] invite email failed:", err))
  }

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "created",
    targetType: "org",
    targetId: session.orgId,
    metadata: { step: "onboarding_team_invite", invitedEmail: input.email, role: input.role },
  })

  captureServerEvent(session.userId, "onboarding.team_invited", {
    org_id: session.orgId,
    invited_role: input.role,
  })

  return { success: true }
}

// ─── Get checklist for /app/help ────────────────────────────────────────────

export async function getOnboardingChecklist(): Promise<OnboardingChecklist> {
  const state = await getOnboardingState()

  const steps = [
    {
      key: "org",
      label: "Set up your organization",
      description: "Confirm your org name, timezone, and default currency",
      completed: state.completedSteps.org,
      href: "/app/settings",
    },
    {
      key: "team",
      label: "Invite your team",
      description: "Add team members and configure their roles",
      completed: state.completedSteps.team,
      href: "/app/settings",
    },
    {
      key: "asset",
      label: "Add your first asset",
      description: "Create or import an asset to start tracking",
      completed: state.completedSteps.asset,
      href: "/app/assets",
    },
    {
      key: "document",
      label: "Upload a document",
      description: "Store important documents in your secure vault",
      completed: state.completedSteps.document,
      href: "/app/vault",
    },
  ]

  return {
    steps,
    completedCount: steps.filter((s) => s.completed).length,
    totalCount: steps.length,
  }
}
