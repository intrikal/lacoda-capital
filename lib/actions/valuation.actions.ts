"use server"

import { eq, and, desc, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { valuations, assets, entities, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createValuationSchema } from "@/lib/validations/valuation.schema"
import { createLedgerEvent } from "@/lib/actions/ledger"
import type { ValuationRecord } from "@/lib/types"

/**
 * addValuation — Creates a new valuation record for an asset.
 * If the new valuation's asOfDate is the most recent, updates asset.currentValue.
 */
export async function addValuation(input: unknown): Promise<ValuationRecord> {
  const session = await requireRole("assistant")
  const data = createValuationSchema.parse(input)

  // Verify asset exists and belongs to user's org
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, data.assetId),
    with: { entity: { with: { client: true } } },
  })
  if (!asset) throw new Error("Asset not found")
  const client = (asset.entity as { client: { orgId: string } }).client
  if (client.orgId !== session.orgId) throw new Error("Asset not found")

  // Insert the valuation
  const [created] = await db
    .insert(valuations)
    .values({
      assetId: data.assetId,
      asOfDate: new Date(data.asOfDate),
      value: data.value.toString(),
      currency: data.currency,
      source: data.source ?? null,
      notes: data.notes ?? null,
    })
    .returning()

  // Check if this is the most recent valuation for the asset
  const [latest] = await db
    .select({ asOfDate: valuations.asOfDate })
    .from(valuations)
    .where(eq(valuations.assetId, data.assetId))
    .orderBy(desc(valuations.asOfDate))
    .limit(1)

  // Only update asset.currentValue if this valuation is the most recent
  if (latest && new Date(created.asOfDate).getTime() >= new Date(latest.asOfDate).getTime()) {
    await db
      .update(assets)
      .set({
        currentValue: data.value.toString(),
        valuedAt: new Date(data.asOfDate),
      })
      .where(eq(assets.id, data.assetId))
  }

  // Audit log
  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "asset_valued",
    targetType: "asset",
    targetId: data.assetId,
    metadata: {
      valuationId: created.id,
      value: data.value,
      asOfDate: data.asOfDate,
      source: data.source,
    },
  })

  return {
    ...created,
    value: parseFloat(created.value),
    asOfDate: created.asOfDate.toISOString(),
    createdAt: created.createdAt!.toISOString(),
  } as ValuationRecord
}

/**
 * getValuationHistory — Returns all valuations for an asset in DESC order.
 */
export async function getValuationHistory(assetId: string): Promise<ValuationRecord[]> {
  const session = await requireAuth()

  // Verify asset belongs to user's org
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetId),
    with: { entity: { with: { client: true } } },
  })
  if (!asset) return []
  const client = (asset.entity as { client: { orgId: string } }).client
  if (client.orgId !== session.orgId) return []

  const rows = await db
    .select()
    .from(valuations)
    .where(eq(valuations.assetId, assetId))
    .orderBy(desc(valuations.asOfDate))

  return rows.map((row) => ({
    ...row,
    value: parseFloat(row.value),
    asOfDate: row.asOfDate.toISOString(),
    createdAt: row.createdAt!.toISOString(),
  })) as ValuationRecord[]
}
