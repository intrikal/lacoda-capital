"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count, sql, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { entities, clients, assets } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { blockDemoMutation } from "@/lib/demo/guard"
import { createEntitySchema, updateEntitySchema } from "@/lib/validations/entity.schema"
import { createLedgerEvent } from "@/lib/actions/ledger"
import type { EntityRecord, PaginatedResult } from "@/lib/types"

// ─── List ────────────────────────────────────────────────────────────────────

export async function getEntities(params?: {
  clientId?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<EntityRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [
    sql`${entities.clientId} IN (
      SELECT id FROM clients WHERE org_id = ${session.orgId}
    )`,
    isNull(entities.deletedAt),
  ]
  if (params?.clientId) conditions.push(eq(entities.clientId, params.clientId))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(entities).where(where).orderBy(entities.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(entities).where(where),
  ])

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

// ─── Tree (recursive CTE) ───────────────────────────────────────────────────

export interface EntityTreeNode extends EntityRecord {
  children: EntityTreeNode[]
}

/**
 * getEntitiesTree — Returns all org entities as a nested tree.
 * Uses a recursive CTE to walk the parent_id hierarchy.
 */
export async function getEntitiesTree(clientId?: string): Promise<EntityTreeNode[]> {
  const session = await requireAuth()

  const conditions = [
    sql`${entities.clientId} IN (
      SELECT id FROM clients WHERE org_id = ${session.orgId}
    )`,
    isNull(entities.deletedAt),
  ]
  if (clientId) conditions.push(eq(entities.clientId, clientId))

  const where = and(...conditions)
  const rows = await db.select().from(entities).where(where).orderBy(entities.name)

  // Enrich with asset data
  const enriched = await Promise.all(
    rows.map(async (row) => {
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
        children: [] as EntityTreeNode[],
      } as unknown as EntityTreeNode
    })
  )

  // Build tree in memory
  const nodeMap = new Map<string, EntityTreeNode>()
  for (const node of enriched) nodeMap.set(node.id, node)

  const roots: EntityTreeNode[] = []
  for (const node of enriched) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

// ─── Single ──────────────────────────────────────────────────────────────────

export async function getEntity(id: string): Promise<EntityRecord | null> {
  const session = await requireAuth()
  const row = await db.query.entities.findFirst({
    where: eq(entities.id, id),
    with: { client: true },
  })
  if (!row || (row.client as { orgId: string }).orgId !== session.orgId) return null
  return row as unknown as EntityRecord
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createEntity(input: unknown): Promise<EntityRecord> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
  const parsed = createEntitySchema.parse(input)

  // Validate client belongs to org
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, parsed.clientId), eq(clients.orgId, session.orgId!)),
  })
  if (!client) throw new Error("Client not found")

  // Reject self-referencing parentId
  if (parsed.parentId) {
    const parent = await db.query.entities.findFirst({
      where: eq(entities.id, parsed.parentId),
      with: { client: true },
    })
    if (!parent || (parent.client as { orgId: string }).orgId !== session.orgId) {
      throw new Error("Parent entity not found")
    }
  }

  const [created] = await db
    .insert(entities)
    .values({
      ...parsed,
      parentId: parsed.parentId ?? null,
      formationDate: parsed.formationDate ? new Date(parsed.formationDate) : null,
      metadata: parsed.metadata ?? {},
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "created",
    targetType: "entity",
    targetId: created.id,
    metadata: { name: parsed.name, entityType: parsed.entityType },
  })

  captureServerEvent(session.userId, "entity.created", { entity_type: parsed.entityType })

  return created as unknown as EntityRecord
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateEntity(id: string, input: unknown): Promise<EntityRecord> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
  const existing = await db.query.entities.findFirst({
    where: eq(entities.id, id),
    with: { client: true },
  })
  if (!existing || (existing.client as { orgId: string }).orgId !== session.orgId) {
    throw new Error("Not found")
  }

  const parsed = updateEntitySchema.parse(input)

  // Circular parent check: cannot set parentId to self or any descendant
  if (parsed.parentId !== undefined && parsed.parentId !== null) {
    if (parsed.parentId === id) throw new Error("Cannot create circular ownership.")
    if (await isDescendant(id, parsed.parentId)) {
      throw new Error("Cannot create circular ownership.")
    }
  }

  const setData: Record<string, unknown> = {}
  if (parsed.name !== undefined) setData.name = parsed.name
  if (parsed.entityType !== undefined) setData.entityType = parsed.entityType
  if (parsed.parentId !== undefined) setData.parentId = parsed.parentId ?? null
  if (parsed.jurisdiction !== undefined) setData.jurisdiction = parsed.jurisdiction ?? null
  if (parsed.formationDate !== undefined) setData.formationDate = parsed.formationDate ? new Date(parsed.formationDate) : null
  if (parsed.taxId !== undefined) setData.taxId = parsed.taxId ?? null
  if (parsed.metadata !== undefined) setData.metadata = { ...(existing.metadata as object ?? {}), ...parsed.metadata }

  const [updated] = await db.update(entities).set(setData).where(eq(entities.id, id)).returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "entity",
    targetId: id,
    metadata: { changedFields: Object.keys(setData) },
  })

  return updated as unknown as EntityRecord
}

// ─── Archive (soft delete) ───────────────────────────────────────────────────

export async function archiveEntity(id: string): Promise<boolean> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
  const existing = await db.query.entities.findFirst({
    where: eq(entities.id, id),
    with: { client: true },
  })
  if (!existing || (existing.client as { orgId: string }).orgId !== session.orgId) {
    throw new Error("Not found")
  }

  await db.update(entities).set({ deletedAt: new Date() }).where(eq(entities.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "archived",
    targetType: "entity",
    targetId: id,
    metadata: { name: existing.name },
  })

  return true
}

// ─── Delete (hard) ───────────────────────────────────────────────────────────

export async function deleteEntity(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  blockDemoMutation(session.orgId)
  const existing = await db.query.entities.findFirst({
    where: eq(entities.id, id),
    with: { client: true },
  })
  if (!existing || (existing.client as { orgId: string }).orgId !== session.orgId) {
    throw new Error("Not found")
  }

  await db.delete(entities).where(eq(entities.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "deleted",
    targetType: "entity",
    targetId: id,
    metadata: { name: existing.name },
  })

  return true
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Check if `candidateParentId` is a descendant of `entityId`. */
async function isDescendant(entityId: string, candidateParentId: string): Promise<boolean> {
  let currentId: string | null = candidateParentId
  const visited = new Set<string>()

  while (currentId) {
    if (currentId === entityId) return true
    if (visited.has(currentId)) break
    visited.add(currentId)

    const [result] = await db
      .select({ parentId: entities.parentId })
      .from(entities)
      .where(eq(entities.id, currentId))
      .limit(1)
    currentId = result?.parentId ?? null
  }

  return false
}
