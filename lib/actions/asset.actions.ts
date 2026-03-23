"use server"

import { eq, and, count, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { assets, entities } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createAssetSchema, updateAssetSchema } from "@/lib/validations/asset.schema"
import type { AssetRecord, PaginatedResult } from "@/lib/types"

export async function getAssets(params?: {
  entityId?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<AssetRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  // Assets scoped via entities → clients
  const conditions = [
    sql`${assets.entityId} IN (
      SELECT e.id FROM entities e
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id = ${session.orgId}
    )`,
  ]
  if (params?.entityId) conditions.push(eq(assets.entityId, params.entityId))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(assets).where(where).orderBy(assets.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(assets).where(where),
  ])

  // Parse numeric strings to floats
  const parsed = items.map((row) => ({
    ...row,
    currentValue: row.currentValue ? parseFloat(row.currentValue as string) : null,
    acquisitionCost: row.acquisitionCost ? parseFloat(row.acquisitionCost as string) : null,
  }))

  return { items: parsed as unknown as AssetRecord[], totalCount: total, page, limit }
}

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

export async function createAsset(input: unknown): Promise<AssetRecord> {
  const session = await requireRole(["admin", "assistant"])
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

  return {
    ...created,
    currentValue: created.currentValue ? parseFloat(created.currentValue as string) : null,
    acquisitionCost: created.acquisitionCost ? parseFloat(created.acquisitionCost as string) : null,
  } as unknown as AssetRecord
}

export async function updateAsset(id: string, input: unknown): Promise<AssetRecord> {
  const session = await requireRole(["admin", "assistant"])
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
  return {
    ...updated,
    currentValue: updated.currentValue ? parseFloat(updated.currentValue as string) : null,
    acquisitionCost: updated.acquisitionCost ? parseFloat(updated.acquisitionCost as string) : null,
  } as unknown as AssetRecord
}

export async function deleteAsset(id: string): Promise<boolean> {
  const session = await requireRole(["admin"])
  const existing = await db.query.assets.findFirst({
    where: eq(assets.id, id),
    with: { entity: { with: { client: true } } },
  })
  if (!existing || (existing.entity as { client: { orgId: string } }).client.orgId !== session.orgId) {
    throw new Error("Not found")
  }
  await db.delete(assets).where(eq(assets.id, id))
  return true
}
