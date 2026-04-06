"use server"

import { eq, and, count, isNull, inArray, ilike, or } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { db } from "@/app/db"
import { documents } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { blockDemoMutation } from "@/lib/demo/guard"
import { createDocumentSchema, updateDocumentSchema, uploadDocumentSchema } from "@/lib/validations/document.schema"
import type { DocumentRecord, PaginatedResult } from "@/lib/types"
import { captureServerEvent } from "@/lib/analytics/server"
import { createClient } from "@/utils/supabase/server"

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

  const conditions = [eq(documents.orgId, session.orgId!), isNull(documents.deletedAt)]
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
    where: and(eq(documents.id, id), eq(documents.orgId, session.orgId!), isNull(documents.deletedAt)),
  })
  return (row as unknown as DocumentRecord) ?? null
}

export async function createDocument(input: unknown): Promise<DocumentRecord> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
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

  captureServerEvent(session.userId, "document.uploaded", {
    org_id: session.orgId,
    document_type: parsed.mimeType ?? "unknown",
  })

  return created as unknown as DocumentRecord
}

export async function updateDocument(id: string, input: unknown): Promise<DocumentRecord> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)
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
  blockDemoMutation(session.orgId)
  const existing = await db.query.documents.findFirst({
    where: and(eq(documents.id, id), eq(documents.orgId, session.orgId!), isNull(documents.deletedAt)),
  })
  if (!existing) throw new Error("Not found")
  await db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, id))
  return true
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600)

  if (error) throw new Error(`Failed to generate signed URL: ${error.message}`)
  return data.signedUrl
}

interface UploadDocumentInput {
  name: string
  fileName: string
  folder?: string | null
  mimeType?: string | null
  sizeBytes: number
  clientId?: string | null
  entityId?: string | null
  assetId?: string | null
  status?: "pending" | "verified" | "expired" | "rejected"
  expiresAt?: string | null
  tags?: string[]
}

export async function uploadDocument(input: UploadDocumentInput): Promise<DocumentRecord> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)

  // Validate file size
  if (input.sizeBytes > 50 * 1024 * 1024) {
    throw new Error("File must be under 50MB")
  }

  // Validate file type - reject .exe, .bat, .sh
  const fileName = input.fileName.toLowerCase()
  if (fileName.endsWith(".exe") || fileName.endsWith(".bat") || fileName.endsWith(".sh")) {
    throw new Error("File type not allowed")
  }

  // Check for existing document with same name to determine version
  const existing = await db.query.documents.findFirst({
    where: and(
      eq(documents.orgId, session.orgId!),
      eq(documents.name, input.name),
      isNull(documents.deletedAt)
    ),
  })

  const version = existing ? existing.version + 1 : 1

  // Build storage path: {orgId}/{folder ?? 'general'}/{timestamp}_{filename}
  const folder = input.folder || "general"
  const timestamp = Date.now()
  const storagePath = `${session.orgId}/${folder}/${timestamp}_${input.fileName}`

  const [created] = await db
    .insert(documents)
    .values({
      name: input.name,
      folder: input.folder,
      mimeType: input.mimeType,
      clientId: input.clientId,
      entityId: input.entityId,
      assetId: input.assetId,
      status: input.status,
      tags: input.tags ?? [],
      orgId: session.orgId!,
      uploadedBy: session.memberId!,
      storagePath,
      version,
      sizeBytes: BigInt(input.sizeBytes),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      metadata: {},
    })
    .returning()

  return created as unknown as DocumentRecord
}

interface BulkUpdateInput {
  folder?: string | null
  tags?: string[]
  status?: "pending" | "verified" | "expired" | "rejected"
}

export async function bulkUpdateDocuments(ids: string[], update: BulkUpdateInput): Promise<number> {
  const session = await requireRole("assistant")
  blockDemoMutation(session.orgId)

  // Verify all docs belong to this org
  const count_result = await db
    .select({ count: count() })
    .from(documents)
    .where(and(eq(documents.orgId, session.orgId!), inArray(documents.id, ids)))

  if ((count_result[0]?.count ?? 0) !== ids.length) {
    throw new Error("Some documents not found in your organization")
  }

  const setData: Record<string, unknown> = {}
  if (update.folder !== undefined) setData.folder = update.folder
  if (update.tags !== undefined) setData.tags = update.tags
  if (update.status !== undefined) setData.status = update.status

  await db.update(documents).set(setData).where(inArray(documents.id, ids))
  return ids.length
}

export async function getDocumentsSearch(
  query: string,
  tagFilter?: string[]
): Promise<DocumentRecord[]> {
  const session = await requireAuth()

  const searchCondition = query
    ? or(ilike(documents.name, `%${query}%`), ilike(documents.description, `%${query}%`))
    : undefined

  const conditions = [
    eq(documents.orgId, session.orgId!),
    isNull(documents.deletedAt),
    ...(searchCondition ? [searchCondition] : []),
  ]

  const rows = await db
    .select()
    .from(documents)
    .where(and(...conditions.filter((c): c is SQL => c !== null && c !== undefined)))

  // Client-side tag filtering (tags is a JSON array in PostgreSQL)
  if (tagFilter && tagFilter.length > 0) {
    return rows.filter((doc) =>
      tagFilter.some((tag) => (doc.tags as string[]).includes(tag))
    ) as unknown as DocumentRecord[]
  }

  return rows as unknown as DocumentRecord[]
}
