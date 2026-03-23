"use server"

import { eq, and, count, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { entities, clients, assets } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createEntitySchema, updateEntitySchema } from "@/lib/validations/entity.schema"
import type { EntityRecord, PaginatedResult } from "@/lib/types"

export async function getEntities(params?: {
  clientId?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<EntityRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  // Entities don't have orgId directly; scoped via clients
  const conditions = [
    sql`${entities.clientId} IN (
      SELECT id FROM clients WHERE org_id = ${session.orgId}
    )`,
  ]
  if (params?.clientId) conditions.push(eq(entities.clientId, params.clientId))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(entities).where(where).orderBy(entities.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(entities).where(where),
  ])

  // Enrich with assetCount and totalValue
  const enriched = await Promise.all(
    items.map(async (row) => {
      const [{ assetCount }] = await db
        .select({ assetCount: count() })
        .from(assets)
        .where(eq(assets.entityId, row.id))
      const [{ total: totalValue }] = await db
        .select({ total: sql<string>`COALESCE(SUM(${assets.currentValue}), 0)` })
        .from(assets)
        .where(and(eq(assets.entityId, row.id), eq(assets.status, "active")))
      return {
        ...row,
        assetCount,
        totalValue: parseFloat(totalValue ?? "0"),
      }
    })
  )

  return { items: enriched as unknown as EntityRecord[], totalCount: total, page, limit }
}

export async function getEntity(id: string): Promise<EntityRecord | null> {
  const session = await requireAuth()
  const row = await db.query.entities.findFirst({
    where: eq(entities.id, id),
    with: { client: true },
  })
  if (!row || (row.client as { orgId: string }).orgId !== session.orgId) return null
  return row as unknown as EntityRecord
}

export async function createEntity(input: unknown): Promise<EntityRecord> {
  const session = await requireRole(["admin", "assistant"])
  const parsed = createEntitySchema.parse(input)

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, parsed.clientId), eq(clients.orgId, session.orgId!)),
  })
  if (!client) throw new Error("Client not found")

  const [created] = await db
    .insert(entities)
    .values({
      ...parsed,
      formationDate: parsed.formationDate ? new Date(parsed.formationDate) : null,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  return created as unknown as EntityRecord
}

export async function updateEntity(id: string, input: unknown): Promise<EntityRecord> {
  const session = await requireRole(["admin", "assistant"])
  const existing = await db.query.entities.findFirst({
    where: eq(entities.id, id),
    with: { client: true },
  })
  if (!existing || (existing.client as { orgId: string }).orgId !== session.orgId) {
    throw new Error("Not found")
  }

  const parsed = updateEntitySchema.parse(input)
  const setData: Record<string, unknown> = {}
  if (parsed.name !== undefined) setData.name = parsed.name
  if (parsed.entityType !== undefined) setData.entityType = parsed.entityType
  if (parsed.jurisdiction !== undefined) setData.jurisdiction = parsed.jurisdiction ?? null
  if (parsed.formationDate !== undefined) setData.formationDate = parsed.formationDate ? new Date(parsed.formationDate) : null
  if (parsed.taxId !== undefined) setData.taxId = parsed.taxId ?? null
  if (parsed.metadata !== undefined) setData.metadata = { ...(existing.metadata as object ?? {}), ...parsed.metadata }

  const [updated] = await db.update(entities).set(setData).where(eq(entities.id, id)).returning()
  return updated as unknown as EntityRecord
}

export async function deleteEntity(id: string): Promise<boolean> {
  const session = await requireRole(["admin"])
  const existing = await db.query.entities.findFirst({
    where: eq(entities.id, id),
    with: { client: true },
  })
  if (!existing || (existing.client as { orgId: string }).orgId !== session.orgId) {
    throw new Error("Not found")
  }
  await db.delete(entities).where(eq(entities.id, id))
  return true
}
