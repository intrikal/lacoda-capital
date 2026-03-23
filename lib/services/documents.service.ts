"use server"

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { documents } from "@/app/db/schema"
import { eq, desc, isNull } from "drizzle-orm"
import type { Document, DocumentStatus } from "@/lib/types/mock"

/** Map a DB documents row to the Document mock type shape. */
function toDocument(row: typeof documents.$inferSelect): Document {
  return {
    id: row.id,
    name: row.name,
    type: row.mimeType ?? "application/pdf",
    status: (row.status ?? "pending") as DocumentStatus,
    assetId: row.assetId ?? undefined,
    clientId: row.clientId ?? undefined,
    uploadedBy: row.uploadedBy ?? "",
    uploadedAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? undefined,
    size: row.fileSize ?? "0",
    tags: (row.tags as string[]) ?? [],
    folder: row.folder ?? "",
  }
}

export async function getDocuments(): Promise<Document[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(isNull(documents.deletedAt))
    .orderBy(desc(documents.createdAt))
  return rows.map(toDocument)
}

export async function getDocumentById(id: string): Promise<Document | undefined> {
  const rows = await db.select().from(documents).where(eq(documents.id, id))
  return rows[0] ? toDocument(rows[0]) : undefined
}

export async function getDocumentsByAsset(assetId: string): Promise<Document[]> {
  const rows = await db.select().from(documents).where(eq(documents.assetId, assetId))
  return rows.map(toDocument)
}

export async function getDocumentsByClient(clientId: string): Promise<Document[]> {
  const rows = await db.select().from(documents).where(eq(documents.clientId, clientId))
  return rows.map(toDocument)
}

export async function getDocumentsByStatus(status: DocumentStatus): Promise<Document[]> {
  const rows = await db.select().from(documents).where(eq(documents.status, status))
  return rows.map(toDocument)
}

export async function getDocumentStats() {
  const all = await getDocuments()
  return {
    total: all.length,
    verified: all.filter((d) => d.status === "verified").length,
    pending: all.filter((d) => d.status === "pending").length,
    expired: all.filter((d) => d.status === "expired").length,
    missing: all.filter((d) => d.status === "missing").length,
  }
}
