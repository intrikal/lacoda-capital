"use server"

import { eq, and, isNull, lte, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { users, orgMembers, deletionRequests, ledgerEvents, orgs } from "@/app/db/schema"
import { requireAuth } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import type { OrgSettings } from "@/app/db/schema/orgs"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeletionRequestInfo {
  id: string
  requestedAt: string
  scheduledFor: string
  cancelledAt: string | null
  completedAt: string | null
  daysRemaining: number
}

export interface RetentionSettings {
  archiveRetentionMonths: number | null
  deletedItemRetentionMonths: number | null
}

// ─── Account Deletion ───────────────────────────────────────────────────────

/**
 * requestAccountDeletion — Initiates a 30-day account deletion grace period.
 */
export async function requestAccountDeletion(reason?: string): Promise<DeletionRequestInfo> {
  const session = await requireAuth()

  // Check for existing pending request
  const existing = await db.query.deletionRequests.findFirst({
    where: and(
      eq(deletionRequests.userId, session.userId),
      isNull(deletionRequests.cancelledAt),
      isNull(deletionRequests.completedAt)
    ),
  })

  if (existing) {
    const daysRemaining = Math.max(
      0,
      Math.ceil((existing.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )
    return {
      id: existing.id,
      requestedAt: existing.requestedAt.toISOString(),
      scheduledFor: existing.scheduledFor.toISOString(),
      cancelledAt: null,
      completedAt: null,
      daysRemaining,
    }
  }

  const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const [request] = await db
    .insert(deletionRequests)
    .values({
      userId: session.userId,
      reason: reason ?? null,
      scheduledFor,
    })
    .returning()

  if (session.orgId) {
    await createLedgerEvent({
      orgId: session.orgId,
      actorId: session.userId,
      action: "updated",
      targetType: "user",
      targetId: session.userId,
      metadata: { action: "account_deletion_requested", scheduledFor: scheduledFor.toISOString() },
    })
  }

  return {
    id: request.id,
    requestedAt: request.requestedAt.toISOString(),
    scheduledFor: request.scheduledFor.toISOString(),
    cancelledAt: null,
    completedAt: null,
    daysRemaining: 30,
  }
}

/**
 * cancelAccountDeletion — Cancels a pending deletion request.
 */
export async function cancelAccountDeletion(): Promise<{ success: boolean }> {
  const session = await requireAuth()

  const pending = await db.query.deletionRequests.findFirst({
    where: and(
      eq(deletionRequests.userId, session.userId),
      isNull(deletionRequests.cancelledAt),
      isNull(deletionRequests.completedAt)
    ),
  })

  if (!pending) throw new Error("No pending deletion request found")

  await db
    .update(deletionRequests)
    .set({ cancelledAt: new Date() })
    .where(eq(deletionRequests.id, pending.id))

  if (session.orgId) {
    await createLedgerEvent({
      orgId: session.orgId,
      actorId: session.userId,
      action: "updated",
      targetType: "user",
      targetId: session.userId,
      metadata: { action: "account_deletion_cancelled" },
    })
  }

  return { success: true }
}

/**
 * getDeletionRequestStatus — Check if current user has a pending deletion.
 */
export async function getDeletionRequestStatus(): Promise<DeletionRequestInfo | null> {
  const session = await requireAuth()

  const pending = await db.query.deletionRequests.findFirst({
    where: and(
      eq(deletionRequests.userId, session.userId),
      isNull(deletionRequests.cancelledAt),
      isNull(deletionRequests.completedAt)
    ),
  })

  if (!pending) return null

  const daysRemaining = Math.max(
    0,
    Math.ceil((pending.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return {
    id: pending.id,
    requestedAt: pending.requestedAt.toISOString(),
    scheduledFor: pending.scheduledFor.toISOString(),
    cancelledAt: null,
    completedAt: null,
    daysRemaining,
  }
}

/**
 * executeAccountDeletion — Called by cron job to process expired grace periods.
 *
 * This nullifies all PII but preserves ledger events with anonymized actor.
 * NOT a server action — called by a scheduled job.
 */
export async function executeAccountDeletion(requestId: string): Promise<{ success: boolean }> {
  const request = await db.query.deletionRequests.findFirst({
    where: and(
      eq(deletionRequests.id, requestId),
      isNull(deletionRequests.cancelledAt),
      isNull(deletionRequests.completedAt)
    ),
  })

  if (!request) throw new Error("Deletion request not found or already processed")
  if (request.scheduledFor > new Date()) throw new Error("Grace period not yet expired")

  const userId = request.userId

  // 1. Null all PII in users table
  await db
    .update(users)
    .set({
      email: `deleted_${userId.substring(0, 8)}@deleted.local`,
      fullName: null,
      avatarUrl: null,
      phone: null,
      preferences: {},
      deletedAt: new Date(),
    })
    .where(eq(users.id, userId))

  // 2. Soft-delete all org memberships
  await db
    .update(orgMembers)
    .set({ deletedAt: new Date() })
    .where(eq(orgMembers.userId, userId))

  // 3. Mark deletion request as completed
  await db
    .update(deletionRequests)
    .set({ completedAt: new Date() })
    .where(eq(deletionRequests.id, requestId))

  // Note: Ledger events are preserved with the original actorUserId.
  // The user row now has anonymized email, so the actor is effectively "deleted_user".

  return { success: true }
}

/**
 * processPendingDeletions — Batch processor for expired deletion requests.
 * Called by a cron job / scheduled function.
 */
export async function processPendingDeletions(): Promise<{
  processed: number
  errors: string[]
}> {
  const pendingRequests = await db
    .select()
    .from(deletionRequests)
    .where(
      and(
        isNull(deletionRequests.cancelledAt),
        isNull(deletionRequests.completedAt),
        lte(deletionRequests.scheduledFor, new Date())
      )
    )

  let processed = 0
  const errors: string[] = []

  for (const request of pendingRequests) {
    try {
      await executeAccountDeletion(request.id)
      processed++
    } catch (err) {
      errors.push(`Failed to process ${request.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { processed, errors }
}

// ─── Data Retention ─────────────────────────────────────────────────────────

/**
 * getRetentionSettings — Get org-level data retention settings.
 */
export async function getRetentionSettings(): Promise<RetentionSettings> {
  const session = await requireAuth()
  if (!session.orgId) return { archiveRetentionMonths: null, deletedItemRetentionMonths: null }

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, session.orgId),
  })

  const settings = (org?.settings ?? {}) as OrgSettings & {
    retention?: { archiveRetentionMonths?: number; deletedItemRetentionMonths?: number }
  }

  return {
    archiveRetentionMonths: settings.retention?.archiveRetentionMonths ?? null,
    deletedItemRetentionMonths: settings.retention?.deletedItemRetentionMonths ?? null,
  }
}

/**
 * updateRetentionSettings — Update org-level data retention policy.
 */
export async function updateRetentionSettings(settings: RetentionSettings): Promise<{ success: boolean }> {
  const session = await requireAuth()
  if (!session.orgId) throw new Error("No org found")

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, session.orgId),
  })

  const currentSettings = (org?.settings ?? {}) as Record<string, unknown>

  await db
    .update(orgs)
    .set({
      settings: {
        ...currentSettings,
        retention: {
          archiveRetentionMonths: settings.archiveRetentionMonths,
          deletedItemRetentionMonths: settings.deletedItemRetentionMonths,
        },
      },
    })
    .where(eq(orgs.id, session.orgId))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: session.orgId,
    metadata: { action: "retention_settings_updated", ...settings },
  })

  return { success: true }
}
