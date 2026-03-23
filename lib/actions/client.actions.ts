"use server"

import { eq, and, ilike, sql, count } from "drizzle-orm"
import { db } from "@/app/db"
import { clients, entities, assets } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createClientSchema, updateClientSchema } from "@/lib/validations/client.schema"
import type { ClientRecord, PaginatedResult } from "@/lib/types"

export async function getClients(params?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<ClientRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(clients.orgId, session.orgId!)]
  if (params?.search) conditions.push(ilike(clients.displayName, `%${params.search}%`))
  if (params?.status) conditions.push(sql`(${clients.profile}->>'clientStatus') = ${params.status}`)

  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(clients).where(where).orderBy(clients.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(clients).where(where),
  ])

  // Enrich with entityCount
  const items = await Promise.all(
    rows.map(async (row) => {
      const profile = (row.profile ?? {}) as Record<string, unknown>
      const [{ entityCount }] = await db
        .select({ entityCount: count() })
        .from(entities)
        .where(eq(entities.clientId, row.id))
      const [aumResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(${assets.currentValue}), 0)` })
        .from(assets)
        .innerJoin(entities, eq(assets.entityId, entities.id))
        .where(and(eq(entities.clientId, row.id), eq(assets.status, "active")))
      const [{ assetCount }] = await db
        .select({ assetCount: count() })
        .from(assets)
        .innerJoin(entities, eq(assets.entityId, entities.id))
        .where(and(eq(entities.clientId, row.id), eq(assets.status, "active")))
      return {
        ...row,
        clientType: (profile.clientType as string) ?? "individual",
        clientStatus: (profile.clientStatus as string) ?? "prospect",
        entityCount,
        assetCount,
        totalAUM: parseFloat(aumResult?.total ?? "0"),
      }
    })
  )

  return { items: items as unknown as ClientRecord[], totalCount: total, page, limit }
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  const session = await requireAuth()
  const row = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.orgId, session.orgId!)),
  })
  if (!row) return null
  const profile = (row.profile ?? {}) as Record<string, unknown>
  return {
    ...row,
    clientType: (profile.clientType as string) ?? "individual",
    clientStatus: (profile.clientStatus as string) ?? "prospect",
    entityCount: 0,
    assetCount: 0,
    totalAUM: null,
  } as unknown as ClientRecord
}

export async function createClient(input: unknown): Promise<ClientRecord> {
  const session = await requireRole(["admin", "assistant"])
  const parsed = createClientSchema.parse(input)
  const { clientType, clientStatus, ...rest } = parsed

  const [created] = await db
    .insert(clients)
    .values({
      ...rest,
      orgId: session.orgId!,
      profile: { clientType, clientStatus },
    })
    .returning()

  const profile = (created.profile ?? {}) as Record<string, unknown>
  return {
    ...created,
    clientType: (profile.clientType as string) ?? "individual",
    clientStatus: (profile.clientStatus as string) ?? "prospect",
    entityCount: 0,
    assetCount: 0,
    totalAUM: null,
  } as unknown as ClientRecord
}

export async function updateClient(id: string, input: unknown): Promise<ClientRecord> {
  const session = await requireRole(["admin", "assistant"])
  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateClientSchema.parse(input)
  const { displayName, email, phone, clientType, clientStatus, ...rest } = parsed
  const existingProfile = (existing.profile ?? {}) as Record<string, unknown>
  const updatedProfile = {
    ...existingProfile,
    ...(clientType !== undefined && { clientType }),
    ...(clientStatus !== undefined && { clientStatus }),
  }

  const [updated] = await db
    .update(clients)
    .set({
      ...(displayName !== undefined && { displayName }),
      ...(email !== undefined && { email: email ?? null }),
      ...(phone !== undefined && { phone: phone ?? null }),
      ...("externalId" in rest && rest.externalId !== undefined && {
        externalId: rest.externalId as string ?? null,
      }),
      profile: updatedProfile,
    })
    .where(eq(clients.id, id))
    .returning()

  const profile = (updated.profile ?? {}) as Record<string, unknown>
  return {
    ...updated,
    clientType: (profile.clientType as string) ?? "individual",
    clientStatus: (profile.clientStatus as string) ?? "prospect",
    entityCount: 0,
    assetCount: 0,
    totalAUM: null,
  } as unknown as ClientRecord
}

export async function deleteClient(id: string): Promise<boolean> {
  const session = await requireRole(["admin"])
  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(clients).where(eq(clients.id, id))
  return true
}
