"use server"

import * as Sentry from "@sentry/nextjs"
import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import {
  getIntegrationByProvider,
  disconnectIntegration,
} from "@/lib/services/integrations.service"
import { captureServerEvent } from "@/lib/analytics/server"

/**
 * sendForSignature — Creates a DocuSign envelope for a document request
 * and returns the embedded signing URL.
 */
export async function sendForSignature(input: {
  documentRequestId: string
  signerEmail: string
  signerName: string
  documentName: string
  documentBase64?: string
  returnUrl?: string
}): Promise<{ envelopeId: string; signingUrl: string | null }> {
  const session = await requireRole("assistant")

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/docusign-create-envelope`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        ...input,
        orgId: session.orgId,
      }),
    }
  )

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }))
    const err = new Error(errBody.error ?? "Failed to create DocuSign envelope")
    Sentry.withScope((scope) => {
      scope.setContext("docusign", {
        documentRequestId: input.documentRequestId,
        signerName: input.signerName,
      })
      scope.captureException(err)
    })
    throw err
  }

  const result = await res.json()

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "created",
    targetType: "document",
    targetId: input.documentRequestId,
    metadata: {
      action: "sent_for_signature",
      envelopeId: result.envelopeId,
      signerEmail: input.signerEmail,
    },
  })

  captureServerEvent(session.userId, "docusign.envelope_sent")

  return result
}

/**
 * getDocuSignIntegration — Returns the DocuSign integration for the current org.
 */
export async function getDocuSignIntegration() {
  const session = await requireRole("client")
  if (!session.orgId) return null
  return getIntegrationByProvider(session.orgId, "docusign")
}

/**
 * disconnectDocuSign — Disconnects the DocuSign integration.
 */
export async function disconnectDocuSign(): Promise<void> {
  const session = await requireRole("admin")
  if (!session.orgId) throw new Error("No organization")

  await disconnectIntegration(session.orgId, "docusign")

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: "docusign",
    metadata: { action: "disconnected" },
  })
}
