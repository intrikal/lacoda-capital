"use server"

import * as Sentry from "@sentry/nextjs"
import { captureServerEvent } from "@/lib/analytics/server"
import { db } from "@/app/db"
import { assets, valuations, documents } from "@/app/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { extractionAgent, getExtractionFlaggedFields } from "@/lib/agents/extraction"
import type { ExtractionOutput } from "@/lib/agents/extraction"
import { createClient } from "@/utils/supabase/server"

// ============================================================================
// AI Document Extraction — Server Actions
// ============================================================================

/**
 * Extract data from an uploaded document using AI.
 * Returns pre-filled form data with confidence scores.
 */
export async function extractDocumentData(documentId: string) {
  const session = await requireRole("assistant")

  // Fetch the document record
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.orgId, session.orgId!),
      isNull(documents.deletedAt)
    ),
  })

  if (!doc) {
    return { success: false as const, error: "Document not found", code: "NOT_FOUND" as const }
  }

  // Read file content from Supabase Storage
  let fileContent: string
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from("documents")
      .download(doc.storagePath)

    if (error || !data) {
      return { success: false as const, error: "Failed to download document from storage", code: "STORAGE_ERROR" as const }
    }

    // Convert blob to text (for PDFs, we send the raw content and let Claude handle it)
    fileContent = await data.text()
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error("Failed to read document file"))
    return { success: false as const, error: "Failed to read document file", code: "STORAGE_ERROR" as const }
  }

  // Build the prompt
  const prompt = [
    `Document Name: ${doc.name}`,
    `MIME Type: ${doc.mimeType ?? "unknown"}`,
    `File Size: ${doc.fileSize ?? "unknown"}`,
    ``,
    `=== DOCUMENT CONTENT ===`,
    fileContent.slice(0, 50_000), // Limit to ~50k chars to stay within token limits
  ].join("\n")

  captureServerEvent(session.userId, "ai.extraction_started")

  // Run the extraction agent
  const result = await extractionAgent.run(prompt, {
    orgId: session.orgId!,
    actorUserId: session.userId,
    targetId: documentId,
    targetType: "document",
  })

  if (!result.success) {
    return result
  }

  // Add flagged fields info
  const flaggedFields = getExtractionFlaggedFields(result.data)

  return {
    ...result,
    flaggedFields,
  }
}

/**
 * Confirm extracted data — creates asset + valuation from AI extraction.
 */
export async function confirmExtractedData(params: {
  documentId: string
  extractedData: ExtractionOutput
  /** User-edited overrides */
  overrides?: Partial<ExtractionOutput>
}) {
  const session = await requireRole("assistant")
  const { documentId, extractedData, overrides } = params

  // Merge AI data with user overrides
  const data = { ...extractedData, ...overrides }

  // Fetch the document to get its entity context
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.orgId, session.orgId!),
      isNull(documents.deletedAt)
    ),
  })

  if (!doc) {
    return { success: false as const, error: "Document not found" }
  }

  // Need an entity to create the asset under
  if (!doc.entityId) {
    return { success: false as const, error: "Document must be linked to an entity to create an asset" }
  }

  // Create the asset
  const [asset] = await db
    .insert(assets)
    .values({
      entityId: doc.entityId,
      name: data.asset_name ?? data.property_address ?? doc.name,
      assetClass: (data.asset_class as typeof assets.$inferInsert["assetClass"]) ?? "other",
      currentValue: data.valuation_amount ? String(data.valuation_amount) : "0",
      metadata: {
        propertyAddress: data.property_address
          ? { street: data.property_address }
          : undefined,
        customFields: {
          source: "ai_extraction",
          documentId,
          appraiserName: data.appraiser_name,
          documentType: data.document_type,
          extractionConfidence: data.confidence,
        },
      },
    })
    .returning()

  // Create valuation record
  if (data.valuation_amount) {
    await db.insert(valuations).values({
      assetId: asset.id,
      asOfDate: data.valuation_date ? new Date(data.valuation_date) : new Date(),
      value: String(data.valuation_amount),
      source: "ai_extraction",
      notes: `Extracted from document "${doc.name}" by AI. Appraiser: ${data.appraiser_name ?? "N/A"}`,
    })
  }

  // Log ledger event
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "created",
    targetType: "asset",
    targetId: asset.id,
    metadata: {
      source: "ai_extraction",
      documentId,
      assetName: asset.name,
      valuationAmount: data.valuation_amount,
      documentType: data.document_type,
    },
  })

  return {
    success: true as const,
    assetId: asset.id,
    assetName: asset.name,
  }
}
