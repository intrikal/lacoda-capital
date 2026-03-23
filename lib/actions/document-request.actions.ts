"use server"

import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { documentRequests } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createDocumentRequestSchema, updateDocumentRequestSchema } from "@/lib/validations/document-request.schema"
import type { DocumentRequestRecord, PaginatedResult } from "@/lib/types"

export async function getDocumentRequests(params?: {
  clientId?: string
  status?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<DocumentRequestRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 25, 100)
  const offset = (page - 1) * limit

  const conditions = [eq(documentRequests.orgId, session.orgId!)]
  if (params?.clientId) conditions.push(eq(documentRequests.clientId, params.clientId))
  if (params?.status) conditions.push(eq(documentRequests.status, params.status as "pending" | "sent" | "received" | "reviewed" | "approved"))

  const where = and(...conditions)
  const [items, [{ total }]] = await Promise.all([
    db.select().from(documentRequests).where(where).orderBy(documentRequests.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(documentRequests).where(where),
  ])

  return { items: items as unknown as DocumentRequestRecord[], totalCount: total, page, limit }
}

export async function getDocumentRequest(id: string): Promise<DocumentRequestRecord | null> {
  const session = await requireAuth()
  const row = await db.query.documentRequests.findFirst({
    where: and(eq(documentRequests.id, id), eq(documentRequests.orgId, session.orgId!)),
  })
  return (row as unknown as DocumentRequestRecord) ?? null
}

export async function createDocumentRequest(input: unknown): Promise<DocumentRequestRecord> {
  const session = await requireRole(["admin", "assistant"])
  const parsed = createDocumentRequestSchema.parse(input)

  const [created] = await db
    .insert(documentRequests)
    .values({
      ...parsed,
      orgId: session.orgId!,
      requestedBy: session.memberId!,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      metadata: {},
    })
    .returning()

  return created as unknown as DocumentRequestRecord
}

export async function updateDocumentRequest(id: string, input: unknown): Promise<DocumentRequestRecord> {
  const session = await requireRole(["admin", "assistant"])
  const existing = await db.query.documentRequests.findFirst({
    where: and(eq(documentRequests.id, id), eq(documentRequests.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")

  const parsed = updateDocumentRequestSchema.parse(input)
  const setData: Record<string, unknown> = {}
  if (parsed.title !== undefined) setData.title = parsed.title
  if (parsed.description !== undefined) setData.description = parsed.description ?? null
  if (parsed.documentType !== undefined) setData.documentType = parsed.documentType ?? null
  if (parsed.status !== undefined) {
    setData.status = parsed.status
    if (parsed.status === "fulfilled") setData.fulfilledAt = new Date()
  }
  if (parsed.priority !== undefined) setData.priority = parsed.priority
  if (parsed.dueDate !== undefined) setData.dueDate = parsed.dueDate ? new Date(parsed.dueDate) : null
  if (parsed.assignedTo !== undefined) setData.assignedTo = parsed.assignedTo ?? null

  const [updated] = await db.update(documentRequests).set(setData).where(eq(documentRequests.id, id)).returning()
  return updated as unknown as DocumentRequestRecord
}

export async function deleteDocumentRequest(id: string): Promise<boolean> {
  const session = await requireRole(["admin"])
  const existing = await db.query.documentRequests.findFirst({
    where: and(eq(documentRequests.id, id), eq(documentRequests.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Not found")
  await db.delete(documentRequests).where(eq(documentRequests.id, id))
  return true
}
