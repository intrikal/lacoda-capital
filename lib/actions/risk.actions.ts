"use server"

import { eq, and } from "drizzle-orm"
import { db } from "@/app/db"
import { riskProfiles } from "@/app/db/schema"
import { requireAdvisor } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { captureServerEvent } from "@/lib/analytics/posthog-server"
import type { RiskProfile, NewRiskProfile } from "@/app/db/schema"

// ─── Types ─────────────────────────────────────────────��─────────────────────

export type UpsertRiskProfileInput = Omit<
  NewRiskProfile,
  "id" | "orgId" | "createdAt" | "updatedAt"
>

// ─── Queries ─────────────────────────��────────────────────────────��──────────

/**
 * List all risk profiles for the org.
 */
export async function listRiskProfiles(): Promise<RiskProfile[]> {
  const session = await requireAdvisor()
  return db
    .select()
    .from(riskProfiles)
    .where(eq(riskProfiles.orgId, session.orgId))
    .orderBy(riskProfiles.alertStatus)
}

/**
 * Get a single client's risk profile.
 * Returns null if no profile exists yet.
 */
export async function getRiskProfile(
  clientId: string
): Promise<RiskProfile | null> {
  const session = await requireAdvisor()

  const row = await db.query.riskProfiles.findFirst({
    where: and(
      eq(riskProfiles.orgId, session.orgId),
      eq(riskProfiles.clientId, clientId)
    ),
  })

  return row ?? null
}

// ─── Mutations ─────────────────────────────────────────────────────���─────────

/**
 * Create or update a risk profile for a client.
 * Uses INSERT ... ON CONFLICT DO UPDATE (upsert).
 */
export async function upsertRiskProfile(
  input: UpsertRiskProfileInput
): Promise<RiskProfile> {
  const session = await requireAdvisor()

  const [profile] = await db
    .insert(riskProfiles)
    .values({ ...input, orgId: session.orgId })
    .onConflictDoUpdate({
      target: [riskProfiles.orgId, riskProfiles.clientId],
      set: {
        ...input,
        updatedAt: new Date(),
      },
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "client",
    targetId: input.clientId,
    metadata: { type: "risk_profile", tolerance: input.riskTolerance },
  })

  captureServerEvent(session.userId, "risk_profile.upserted", {
    org_id: session.orgId,
    client_id: input.clientId,
    tolerance: input.riskTolerance,
  })

  return profile
}

/**
 * Update the live metrics (currentDrawdown, currentVolatility, alertStatus).
 * Called on a scheduled basis or when new valuations are recorded.
 */
export async function updateRiskMetrics(
  clientId: string,
  metrics: {
    currentDrawdown?: string
    currentVolatility?: string
    alertStatus?: RiskProfile["alertStatus"]
    alertNotes?: string
  }
): Promise<RiskProfile> {
  const session = await requireAdvisor()

  const [updated] = await db
    .update(riskProfiles)
    .set({ ...metrics, updatedAt: new Date() })
    .where(
      and(
        eq(riskProfiles.orgId, session.orgId),
        eq(riskProfiles.clientId, clientId)
      )
    )
    .returning()

  if (!updated) throw new Error("Risk profile not found")

  if (metrics.alertStatus && metrics.alertStatus !== "normal") {
    await createLedgerEvent({
      orgId: session.orgId,
      actorId: session.userId,
      action: "updated",
      targetType: "client",
      targetId: clientId,
      metadata: {
        type: "risk_alert",
        alertStatus: metrics.alertStatus,
        currentDrawdown: metrics.currentDrawdown,
        currentVolatility: metrics.currentVolatility,
      },
    })
  }

  return updated
}
