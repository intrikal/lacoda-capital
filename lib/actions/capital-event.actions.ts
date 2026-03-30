"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, desc, isNull, sql, lte } from "drizzle-orm"
import { db } from "@/app/db"
import { capitalEvents, assets, notifications, entities, clients } from "@/app/db/schema"
import { requireRole, requireAuth } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { createCapitalEventSchema, updateCapitalEventStatusSchema } from "@/lib/validations/capital-event.schema"
import { isValidStatusTransition, recalculateCachedTotals } from "@/lib/calculations/pe-metrics"
import type { CapitalEventSummary } from "@/lib/calculations/pe-metrics"

// ============================================================================
// Capital Event Server Actions
// ============================================================================

/**
 * Get all capital events for an asset.
 */
export async function getCapitalEvents(assetId: string) {
  const session = await requireAuth()

  const events = await db
    .select()
    .from(capitalEvents)
    .where(
      and(
        eq(capitalEvents.assetId, assetId),
        eq(capitalEvents.orgId, session.orgId!),
        isNull(capitalEvents.deletedAt)
      )
    )
    .orderBy(desc(capitalEvents.eventDate))

  return events
}

/**
 * Get upcoming capital calls for the org (next 30 days, pending status).
 */
export async function getUpcomingCapitalCalls(days = 30) {
  const session = await requireAuth()

  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)

  const calls = await db
    .select({
      id: capitalEvents.id,
      assetId: capitalEvents.assetId,
      assetName: assets.name,
      amount: capitalEvents.amount,
      currency: capitalEvents.currency,
      dueDate: capitalEvents.dueDate,
      eventDate: capitalEvents.eventDate,
      status: capitalEvents.status,
    })
    .from(capitalEvents)
    .innerJoin(assets, eq(capitalEvents.assetId, assets.id))
    .where(
      and(
        eq(capitalEvents.orgId, session.orgId!),
        eq(capitalEvents.eventType, "capital_call"),
        sql`${capitalEvents.status} IN ('pending', 'overdue')`,
        isNull(capitalEvents.deletedAt),
        lte(capitalEvents.dueDate, futureDate)
      )
    )
    .orderBy(capitalEvents.dueDate)

  return calls
}

/**
 * Create a new capital event (call or distribution).
 */
export async function createCapitalEvent(input: unknown) {
  const session = await requireRole("assistant")
  const parsed = createCapitalEventSchema.parse(input)

  // Verify asset belongs to org
  const asset = await db
    .select({ id: assets.id, assetClass: assets.assetClass })
    .from(assets)
    .innerJoin(entities, eq(assets.entityId, entities.id))
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(
      and(
        eq(assets.id, parsed.assetId),
        eq(clients.orgId, session.orgId!),
        isNull(assets.deletedAt)
      )
    )
    .limit(1)

  if (asset.length === 0) {
    throw new Error("Asset not found or access denied")
  }

  const [created] = await db
    .insert(capitalEvents)
    .values({
      assetId: parsed.assetId,
      orgId: session.orgId!,
      eventType: parsed.eventType,
      amount: String(parsed.amount),
      currency: parsed.currency,
      eventDate: new Date(parsed.eventDate),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      status: parsed.status,
      notes: parsed.notes ?? null,
      createdBy: session.userId,
    })
    .returning()

  // If the event is already settled (paid/received), update cached totals
  if (parsed.status === "paid" || parsed.status === "received") {
    await refreshCachedTotals(parsed.assetId)
  }

  // Create ledger event
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "created",
    targetType: "asset",
    targetId: parsed.assetId,
    metadata: {
      capitalEventId: created.id,
      eventType: parsed.eventType,
      amount: parsed.amount,
      status: parsed.status,
    },
  })

  captureServerEvent(session.userId, "capital_call.created", { event_type: parsed.eventType })

  return created
}

/**
 * Update a capital event's status (e.g., pending → paid).
 */
export async function updateCapitalEventStatus(input: unknown) {
  const session = await requireRole("assistant")
  const parsed = updateCapitalEventStatusSchema.parse(input)

  // Fetch the current event
  const [event] = await db
    .select()
    .from(capitalEvents)
    .where(
      and(
        eq(capitalEvents.id, parsed.id),
        eq(capitalEvents.orgId, session.orgId!),
        isNull(capitalEvents.deletedAt)
      )
    )

  if (!event) {
    throw new Error("Capital event not found")
  }

  // Validate status transition
  if (!isValidStatusTransition(event.status, parsed.status)) {
    throw new Error(
      `Invalid status transition: ${event.status} → ${parsed.status}`
    )
  }

  const [updated] = await db
    .update(capitalEvents)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(capitalEvents.id, parsed.id))
    .returning()

  // Refresh cached totals
  await refreshCachedTotals(event.assetId)

  // Create ledger event
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "updated",
    targetType: "asset",
    targetId: event.assetId,
    metadata: {
      capitalEventId: parsed.id,
      eventType: event.eventType,
      previousStatus: event.status,
      newStatus: parsed.status,
      amount: event.amount,
    },
  })

  return updated
}

/**
 * Soft-delete a capital event and recalculate cached totals.
 */
export async function archiveCapitalEvent(id: string) {
  const session = await requireRole("assistant")

  const [event] = await db
    .select()
    .from(capitalEvents)
    .where(
      and(
        eq(capitalEvents.id, id),
        eq(capitalEvents.orgId, session.orgId!),
        isNull(capitalEvents.deletedAt)
      )
    )

  if (!event) {
    throw new Error("Capital event not found")
  }

  await db
    .update(capitalEvents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(capitalEvents.id, id))

  // Recalculate cached totals after archival
  await refreshCachedTotals(event.assetId)

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "archived",
    targetType: "asset",
    targetId: event.assetId,
    metadata: {
      capitalEventId: id,
      eventType: event.eventType,
      amount: event.amount,
    },
  })
}

// ─── Cache refresh helper ───────────────────────────────────────────────────

async function refreshCachedTotals(assetId: string) {
  const allEvents = await db
    .select({
      eventType: capitalEvents.eventType,
      status: capitalEvents.status,
      amount: capitalEvents.amount,
      deletedAt: capitalEvents.deletedAt,
    })
    .from(capitalEvents)
    .where(eq(capitalEvents.assetId, assetId))

  const summaries: CapitalEventSummary[] = allEvents.map((e) => ({
    eventType: e.eventType,
    status: e.status,
    amount: parseFloat(e.amount),
    deletedAt: e.deletedAt,
  }))

  const { calledCapital, distributed } = recalculateCachedTotals(summaries)

  await db
    .update(assets)
    .set({
      calledCapitalCached: String(calledCapital),
      distributedCached: String(distributed),
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetId))
}
