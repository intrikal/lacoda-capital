"use server"

import { eq, and, lte } from "drizzle-orm"
import { db } from "@/app/db"
import { kycRecords } from "@/app/db/schema"
import { requireAdvisor } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { captureServerEvent } from "@/lib/analytics/server"
import type { KycRecord, NewKycRecord } from "@/app/db/schema"

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpsertKycInput = Omit<
  NewKycRecord,
  "id" | "orgId" | "createdAt" | "updatedAt"
>

export type UpdateKycInput = Partial<
  Omit<NewKycRecord, "id" | "orgId" | "clientId" | "createdAt" | "updatedAt">
>

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List all KYC records for the org, ordered by review urgency.
 */
export async function listKycRecords(): Promise<KycRecord[]> {
  const session = await requireAdvisor()
  return db
    .select()
    .from(kycRecords)
    .where(eq(kycRecords.orgId, session.orgId))
    .orderBy(kycRecords.status, kycRecords.nextReviewDue)
}

/**
 * Get a single client's KYC record.
 */
export async function getKycRecord(
  clientId: string
): Promise<KycRecord | null> {
  const session = await requireAdvisor()

  const row = await db.query.kycRecords.findFirst({
    where: and(
      eq(kycRecords.orgId, session.orgId),
      eq(kycRecords.clientId, clientId)
    ),
  })

  return row ?? null
}

/**
 * Clients whose KYC review is overdue (nextReviewDue is in the past).
 */
export async function getOverdueKycReviews(): Promise<KycRecord[]> {
  const session = await requireAdvisor()
  return db
    .select()
    .from(kycRecords)
    .where(
      and(
        eq(kycRecords.orgId, session.orgId),
        lte(kycRecords.nextReviewDue, new Date())
      )
    )
    .orderBy(kycRecords.nextReviewDue)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create or update a KYC record for a client.
 */
export async function upsertKycRecord(input: UpsertKycInput): Promise<KycRecord> {
  const session = await requireAdvisor()

  const [record] = await db
    .insert(kycRecords)
    .values({ ...input, orgId: session.orgId })
    .onConflictDoUpdate({
      target: [kycRecords.orgId, kycRecords.clientId],
      set: { ...input, updatedAt: new Date() },
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "client",
    targetId: input.clientId,
    metadata: { type: "kyc_record", status: input.status, amlStatus: input.amlStatus },
  })

  captureServerEvent(session.userId, "kyc.record_upserted", {
    org_id: session.orgId,
    client_id: input.clientId,
    status: input.status,
  })

  return record
}

/**
 * Mark a KYC review as complete and schedule the next one.
 */
export async function completeKycReview(
  clientId: string,
  outcome: {
    status: KycRecord["status"]
    notes?: string
    nextReviewDays?: number // defaults to current reviewFrequencyDays or 365
  }
): Promise<KycRecord> {
  const session = await requireAdvisor()

  const existing = await getKycRecord(clientId)
  const freqDays = outcome.nextReviewDays ?? existing?.reviewFrequencyDays ?? 365
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + freqDays)

  const [updated] = await db
    .update(kycRecords)
    .set({
      status: outcome.status,
      notes: outcome.notes ?? existing?.notes,
      lastReviewedAt: new Date(),
      nextReviewDue: nextReview,
      assignedTo: session.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(kycRecords.orgId, session.orgId),
        eq(kycRecords.clientId, clientId)
      )
    )
    .returning()

  if (!updated) throw new Error("KYC record not found")

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "client",
    targetId: clientId,
    metadata: {
      type: "kyc_review_completed",
      outcome: outcome.status,
      nextReviewDue: nextReview.toISOString(),
    },
  })

  return updated
}

/**
 * Record an AML screening result.
 */
export async function recordAmlScreening(
  clientId: string,
  result: {
    amlStatus: KycRecord["amlStatus"]
    amlRiskScore?: number
    pepStatus?: boolean
    sanctionsMatch?: boolean
    adverseMediaFlag?: boolean
  }
): Promise<KycRecord> {
  const session = await requireAdvisor()

  const [updated] = await db
    .update(kycRecords)
    .set({
      ...result,
      amlScreenedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(kycRecords.orgId, session.orgId),
        eq(kycRecords.clientId, clientId)
      )
    )
    .returning()

  if (!updated) throw new Error("KYC record not found")

  if (result.amlStatus === "flagged" || result.sanctionsMatch || result.pepStatus) {
    await createLedgerEvent({
      orgId: session.orgId,
      actorId: session.userId,
      action: "updated",
      targetType: "client",
      targetId: clientId,
      metadata: { type: "aml_alert", ...result },
    })
  }

  return updated
}
