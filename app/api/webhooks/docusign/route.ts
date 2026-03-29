import { NextRequest, NextResponse } from "next/server"
import { db } from "@/app/db"
import { documents } from "@/app/db/schema"
import { eq } from "drizzle-orm"
import { dispatchAlert } from "@/lib/alerts"

/**
 * DocuSign Webhook Handler (Connect)
 *
 * Receives events from DocuSign when:
 * - envelope-completed: All recipients have signed
 * - envelope-declined:  A recipient declined to sign
 * - envelope-voided:    Sender voided the envelope
 *
 * DocuSign sends a POST with an XML or JSON body (configurable).
 * We configured JSON in sendForSignature().
 *
 * SETUP:
 *   1. Webhook URL is set per-envelope when creating the envelope (in docusign.ts)
 *   2. URL: https://your-domain.com/api/webhooks/docusign
 *   3. Set DOCUSIGN_WEBHOOK_SECRET for HMAC verification
 */

export async function POST(req: NextRequest) {
  const body = await req.text()

  // TODO: Verify X-DocuSign-Signature-1 header using HMAC
  // See: https://developers.docusign.com/platform/webhooks/connect/hmac/

  let event: {
    event: string
    apiVersion: string
    uri: string
    retryCount: number
    configurationId: string
    generatedDateTime: string
    data: {
      accountId: string
      userId: string
      envelopeId: string
      envelopeSummary: {
        status: string
        completedDateTime?: string
        recipients?: {
          signers: {
            email: string
            name: string
            status: string
            signedDateTime?: string
          }[]
        }
      }
    }
  }

  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    const { envelopeId } = event.data
    const status = event.data.envelopeSummary.status

    console.log(`[docusign-webhook] Envelope ${envelopeId}: ${status}`)

    switch (status) {
      case "completed": {
        // All signers have signed — mark document as verified
        // TODO: Download signed document and store in Supabase Storage
        // TODO: Update document record linked to this envelope
        console.log(`[docusign-webhook] Envelope ${envelopeId} completed — downloading signed document`)

        // Find document linked to this envelope ID
        // Documents store envelope ID in their metadata
        // TODO: Query documents where metadata->>'docusign_envelope_id' = envelopeId
        // and update status to "verified"
        break
      }

      case "declined": {
        const decliner = event.data.envelopeSummary.recipients?.signers?.find(
          (s) => s.status === "declined",
        )
        console.log(
          `[docusign-webhook] Envelope ${envelopeId} declined by ${decliner?.name ?? "unknown"}`,
        )
        // TODO: Update document status and notify advisor
        break
      }

      case "voided": {
        console.log(`[docusign-webhook] Envelope ${envelopeId} voided`)
        // TODO: Update document status
        break
      }

      default:
        console.log(`[docusign-webhook] Unhandled status: ${status} for envelope ${envelopeId}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[docusign-webhook] Processing error:", err)

    dispatchAlert({
      title: "DocuSign webhook processing failed",
      description: `Error processing envelope: ${err instanceof Error ? err.message : String(err)}`,
      severity: "critical",
      source: "docusign-webhook",
    }).catch(() => {})

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
