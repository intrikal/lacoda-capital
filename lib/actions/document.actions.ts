"use server"

import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { documents } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createDocumentSchema, updateDocumentSchema } from "@/lib/validations/document.schema"
import type { DocumentRecord, PaginatedResult } from "@/lib/types"

export async function getDocuments(params?: {
  clientId?: string
  entityId?: string
  assetId?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<DocumentRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(documents.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(documents.clientId, params.clientId))
  if (params?.entityId) conditions.push(eq(documents.entityId, params.entityId))
  if (params?.assetId) conditions.push(eq(documents.assetId, params.assetId))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(documents).where(where).orderBy(documents.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(documents).where(where),
  ])

  return { items: items as unknown as DocumentRecord[], totalCount: total, page, limit }
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const session = await requireAuth()
  const row = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.orgId, session.orgId!)),
  })
  return (row as unknown as DocumentRecord) ?? null
}

export async function createDocument(input: unknown): Promise<DocumentRecord> {
  const session = await requireRole("assistant")
  const parsed = createDocumentSchema.parse(input)

  const [created] = await db
    .insert(documents)
    .values({
      ...parsed,
      orgId: session.orgId!,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      tags: parsed.tags ?? [],
      metadata: parsed.metadata ?? {},
    })
    .returning()

  return created as unknown as DocumentRecord
}

export async function updateDocument(id: string, input: unknown): Promise<DocumentRecord> {
  const session = await requireRole("assistant")
  const existing = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateDocumentSchema.parse(input)
  const setData: Record<string, unknown> = {}
  if (parsed.name !== undefined) setData.name = parsed.name
  if (parsed.description !== undefined) setData.description = parsed.description ?? null
  if (parsed.folder !== undefined) setData.folder = parsed.folder ?? null
  if (parsed.status !== undefined) setData.status = parsed.status
  if (parsed.expiresAt !== undefined) setData.expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null
  if (parsed.tags !== undefined) setData.tags = parsed.tags
  if (parsed.metadata !== undefined) setData.metadata = { ...(existing.metadata as object ?? {}), ...parsed.metadata }

  const [updated] = await db.update(documents).set(setData).where(eq(documents.id, id)).returning()
  return updated as unknown as DocumentRecord
}

export async function deleteDocument(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  const existing = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(documents).where(eq(documents.id, id))
  return true
}
