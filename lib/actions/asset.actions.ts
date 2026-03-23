"use server"

import { eq, and, count, sql, gte, lte, like, isNull, desc } from "drizzle-orm"
import { db } from "@/app/db"
import { assets, entities, clients, valuations, documents } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createAssetSchema, updateAssetSchema } from "@/lib/validations/asset.schema"
import { createLedgerEvent } from "@/lib/actions/ledger"
import type { AssetRecord, PaginatedResult } from "@/lib/types"

// ─── List with filters ──────────────────────────────────────────────────────

export async function getAssets(params?: {
  entityId?: string
  assetClass?: string
  status?: string
  search?: string
  minValue?: number
  maxValue?: number
  page?: number
  limit?: number
}): Promise<PaginatedResult<AssetRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  // Base org scoping
  const conditions = [
    sql`${assets.entityId} IN (
      SELECT e.id FROM entities e
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id = ${session.orgId}
    )`,
    isNull(assets.deletedAt),
  ]

  if (params?.entityId) conditions.push(eq(assets.entityId, params.entityId))
  if (params?.assetClass) conditions.push(eq(assets.assetClass, params.assetClass as typeof assets.assetClass.enumValues[number]))
  if (params?.status) conditions.push(eq(assets.status, params.status as typeof assets.status.enumValues[number]))
  if (params?.search) conditions.push(like(assets.name, `%${params.search}%`))
  if (params?.minValue !== undefined) conditions.push(gte(assets.currentValue, params.minValue.toString()))
  if (params?.maxValue !== undefined) conditions.push(lte(assets.currentValue, params.maxValue.toString()))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(assets).where(where).orderBy(assets.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(assets).where(where),
  ])

  const parsed = items.map((row) => ({
    ...row,
    currentValue: row.currentValue ? parseFloat(row.currentValue as string) : null,
    acquisitionCost: row.acquisitionCost ? parseFloat(row.acquisitionCost as string) : null,
  }))

  return { items: parsed as unknown as AssetRecord[], totalCount: total, page, limit }
}

// ─── Single with joins ──────────────────────────────────────────────────────

export async function getAsset(id: string): Promise<AssetRecord | null> {
  const session = await requireAuth()
  const row = await db.query.assets.findFirst({
    where: eq(assets.id, id),
    with: { entity: { with: { client: true } } },
  })
  if (!row) return null
  const client = (row.entity as { client: { orgId: string } }).client
  if (client.orgId !== session.orgId) return null
  return {
    ...row,
    currentValue: row.currentValue ? parseFloat(row.currentValue as string) : null,
    acquisitionCost: row.acquisitionCost ? parseFloat(row.acquisitionCost as string) : null,
  } as unknown as AssetRecord
}

/**
 * getAssetById — Rich fetch with latest valuation, entity, and documents.
 */
export async function getAssetById(id: string) {
  const session = await requireAuth()

  const row = await db.query.assets.findFirst({
    where: eq(assets.id, id),
    with: {
      entity: { with: { client: true } },
      valuations: true,
      documents: true,
    },
  })
  if (!row) return null
  const client = (row.entity as { client: { orgId: string } }).client
  if (client.orgId !== session.orgId) return null

  // Find latest valuation
  const sortedValuations = [...(row.valuations ?? [])].sort(
    (a, b) => new Date(b.asOfDate).getTime() - new Date(a.asOfDate).getTime()
  )
  const latestValuation = sortedValuations[0] ?? null

  return {
    ...row,
    currentValue: row.currentValue ? parseFloat(row.currentValue as string) : null,
    acquisitionCost: row.acquisitionCost ? parseFloat(row.acquisitionCost as string) : null,
    latestValuation: latestValuation
      ? { ...latestValuation, value: parseFloat(latestValuation.value as string) }
      : null,
    documents: row.documents ?? [],
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createAsset(input: unknown): Promise<AssetRecord> {
  const session = await requireRole("assistant")
  const data = createAssetSchema.parse(input)

  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, data.entityId),
    with: { client: true },
  })
  if (!entity || (entity.client as { orgId: string }).orgId !== session.orgId) {
    throw new Error("Entity not found")
  }

  const [created] = await db
    .insert(assets)
    .values({
      ...data,
      acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
      acquisitionCost: data.acquisitionCost?.toString() ?? null,
      currentValue: data.currentValue?.toString() ?? null,
      metadata: data.metadata ?? {},
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "created",
    targetType: "asset",
    targetId: created.id,
    metadata: { name: data.name, assetClass: data.assetClass },
  })

  return {
    ...created,
    currentValue: created.currentValue ? parseFloat(created.currentValue as string) : null,
    acquisitionCost: created.acquisitionCost ? parseFloat(created.acquisitionCost as string) : null,
  } as unknown as AssetRecord
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateAsset(id: string, input: unknown): Promise<AssetRecord> {
  const session = await requireRole("assistant")
  const existing = await db.query.assets.findFirst({
    where: eq(assets.id, id),
    with: { entity: { with: { client: true } } },
  })
  if (!existing || (existing.entity as { client: { orgId: string } }).client.orgId !== session.orgId) {
    throw new Error("Not found")
  }

  const data = updateAssetSchema.parse(input)
  const setData: Record<string, unknown> = {}
  if (data.name !== undefined) setData.name = data.name
  if (data.description !== undefined) setData.description = data.description ?? null
  if (data.assetClass !== undefined) setData.assetClass = data.assetClass
  if (data.status !== undefined) setData.status = data.status
  if (data.acquisitionDate !== undefined) setData.acquisitionDate = data.acquisitionDate ? new Date(data.acquisitionDate) : null
  if (data.acquisitionCost !== undefined) setData.acquisitionCost = data.acquisitionCost?.toString() ?? null
  if (data.currency !== undefined) setData.currency = data.currency
  if (data.currentValue !== undefined) setData.currentValue = data.currentValue?.toString() ?? null
  if (data.externalId !== undefined) setData.externalId = data.externalId ?? null
  if (data.metadata !== undefined) setData.metadata = { ...(existing.metadata as object ?? {}), ...data.metadata }

  const [updated] = await db.update(assets).set(setData).where(eq(assets.id, id)).returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "asset",
    targetId: id,
    metadata: { changedFields: Object.keys(setData) },
  })

  return {
    ...updated,
    currentValue: updated.currentValue ? parseFloat(updated.currentValue as string) : null,
    acquisitionCost: updated.acquisitionCost ? parseFloat(updated.acquisitionCost as string) : null,
  } as unknown as AssetRecord
}

// ─── Archive (soft delete) ───────────────────────────────────────────────────

export async function archiveAsset(id: string): Promise<boolean> {
  const session = await requireRole("assistant")
  const existing = await db.query.assets.findFirst({
    where: eq(assets.id, id),
    with: { entity: { with: { client: true } } },
  })
  if (!existing || (existing.entity as { client: { orgId: string } }).client.orgId !== session.orgId) {
    throw new Error("Not found")
  }

  await db.update(assets).set({ deletedAt: new Date() }).where(eq(assets.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "archived",
    targetType: "asset",
    targetId: id,
    metadata: { name: existing.name },
  })

  return true
}

// ─── Delete (hard) ───────────────────────────────────────────────────────────

export async function deleteAsset(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  const existing = await db.query.assets.findFirst({
    where: eq(assets.id, id),
    with: { entity: { with: { client: true } } },
  })
  if (!existing || (existing.entity as { client: { orgId: string } }).client.orgId !== session.orgId) {
    throw new Error("Not found")
  }

  await db.delete(assets).where(eq(assets.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "deleted",
    targetType: "asset",
    targetId: id,
    metadata: { name: existing.name },
  })

  return true
}
