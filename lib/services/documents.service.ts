// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import { mockDocuments } from "@/lib/mock/data"
import type { Document, DocumentStatus } from "@/lib/mock/types"

export async function getDocuments(): Promise<Document[]> {
  // REAL: return db.query.documents.findMany({ orderBy: desc(documents.uploadedAt) })
  return mockDocuments
}

export async function getDocumentById(id: string): Promise<Document | undefined> {
  // REAL: return db.query.documents.findFirst({ where: eq(documents.id, id) })
  return mockDocuments.find((d) => d.id === id)
}

export async function getDocumentsByAsset(assetId: string): Promise<Document[]> {
  // REAL: return db.query.documents.findMany({ where: eq(documents.assetId, assetId) })
  return mockDocuments.filter((d) => d.assetId === assetId)
}

export async function getDocumentsByClient(clientId: string): Promise<Document[]> {
  // REAL: return db.query.documents.findMany({ where: eq(documents.clientId, clientId) })
  return mockDocuments.filter((d) => d.clientId === clientId)
}

export async function getDocumentsByStatus(status: DocumentStatus): Promise<Document[]> {
  // REAL: return db.query.documents.findMany({ where: eq(documents.status, status) })
  return mockDocuments.filter((d) => d.status === status)
}

export async function getDocumentStats() {
  const all = mockDocuments
  // REAL: use SQL COUNT grouped by status
  return {
    total: all.length,
    verified: all.filter((d) => d.status === "verified").length,
    pending: all.filter((d) => d.status === "pending").length,
    expired: all.filter((d) => d.status === "expired").length,
    missing: all.filter((d) => d.status === "missing").length,
  }
}
