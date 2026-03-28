"use server"

import { eq, and } from "drizzle-orm"
import { db } from "@/app/db"
import { documentRequests, clients, entities, assets, orgs } from "@/app/db/schema"
import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { emailDraftAgent, buildEmailDraftPrompt } from "@/lib/agents/email-draft"
import type { EmailDraftContextData } from "@/lib/agents/email-draft"

// ============================================================================
// AI Email Draft — Server Actions
// ============================================================================

/**
 * Draft an email for a document request using AI.
 */
export async function draftDocumentRequestEmail(requestId: string) {
  const session = await requireRole("assistant")

  // Fetch the document request with related data
  const request = await db.query.documentRequests.findFirst({
    where: and(
      eq(documentRequests.id, requestId),
      eq(documentRequests.orgId, session.orgId!)
    ),
  })

  if (!request) {
    return { success: false as const, error: "Document request not found", code: "NOT_FOUND" as const }
  }

  // Get the org name
  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, session.orgId!),
  })

  // Get the contact info
  const contactName = request.requestedFromName ?? "Recipient"
  const contactEmail = request.requestedFromEmail ?? ""

  if (!contactEmail) {
    return {
      success: false as const,
      error: "No contact email found on this document request. Please add a recipient email first.",
      code: "MISSING_CONTACT" as const,
    }
  }

  // Get related names for context
  let clientName: string | undefined
  let entityName: string | undefined
  let assetName: string | undefined

  if (request.clientId) {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, request.clientId),
    })
    clientName = client?.displayName ?? undefined
  }

  if (request.entityId) {
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, request.entityId),
    })
    entityName = entity?.name ?? undefined
  }

  if (request.assetId) {
    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, request.assetId),
    })
    assetName = asset?.name ?? undefined
  }

  // Build the upload URL
  const uploadUrl = `https://app.lacoda.capital/portal/upload/${requestId}`

  // Build context
  const contextData: EmailDraftContextData = {
    contactName,
    contactEmail,
    documentType: request.documentType ?? request.title,
    clientName,
    entityName,
    assetName,
    deadline: request.dueDate?.toISOString().split("T")[0],
    uploadUrl,
    additionalNotes: request.notes ?? undefined,
    senderName: session.email?.split("@")[0] ?? "Your advisor",
    orgName: org?.name ?? "Lacoda Capital",
  }

  const prompt = buildEmailDraftPrompt(contextData)

  // Run the email draft agent
  const result = await emailDraftAgent.run(prompt, {
    orgId: session.orgId!,
    actorUserId: session.userId,
    targetId: requestId,
    targetType: "document_request",
  })

  if (!result.success) {
    return result
  }

  return {
    ...result,
    contactEmail,
    contactName,
  }
}

/**
 * Send the drafted email via Resend (through the send-email Edge Function).
 */
export async function sendDocumentRequestEmail(params: {
  requestId: string
  to: string
  subject: string
  body: string
}) {
  const session = await requireRole("assistant")
  const { requestId, to, subject, body } = params

  // Verify the request belongs to this org
  const request = await db.query.documentRequests.findFirst({
    where: and(
      eq(documentRequests.id, requestId),
      eq(documentRequests.orgId, session.orgId!)
    ),
  })

  if (!request) {
    return { success: false as const, error: "Document request not found" }
  }

  // Send via the Edge Function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return { success: false as const, error: "Email service not configured" }
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "document_request_email",
        to,
        data: { subject, body },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return { success: false as const, error: `Failed to send email: ${errorBody}` }
    }

    // Update the request status to 'sent'
    await db
      .update(documentRequests)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(documentRequests.id, requestId))

    // Log ledger event
    await createLedgerEvent({
      orgId: session.orgId!,
      actorId: session.userId,
      action: "updated",
      targetType: "document",
      targetId: requestId,
      metadata: {
        action: "email_sent",
        to,
        subject,
        source: "ai_draft",
      },
    })

    return { success: true as const }
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to send email",
    }
  }
}
