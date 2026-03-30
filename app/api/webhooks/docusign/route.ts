import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import * as Sentry from "@sentry/nextjs"
import { db } from "@/app/db"
import { documents, integrations, ledgerEvents, complianceEvidence, orgMembers } from "@/app/db/schema"
import { eq, and, sql, inArray } from "drizzle-orm"
import { dispatchAlert } from "@/lib/alerts"
import { downloadSignedDocument, getAccessToken } from "@/lib/integrations/docusign"
import { createClient } from "@/utils/supabase/server"

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

  // Verify X-DocuSign-Signature-1 header using HMAC-SHA256
  const docusignSignature = req.headers.get("x-docusign-signature-1")
  if (!docusignSignature) {
    return NextResponse.json({ error: "Missing X-DocuSign-Signature-1 header" }, { status: 400 })
  }

  const webhookSecret = process.env.DOCUSIGN_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[docusign-webhook] DOCUSIGN_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(body, "utf8")
    .digest("base64")

  const sigBuffer = Buffer.from(docusignSignature, "utf8")
  const expectedBuffer = Buffer.from(expectedSignature, "utf8")

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

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

    // Find the document linked to this envelope via metadata
    const doc = await db.query.documents.findFirst({
      where: sql`${documents.metadata}->'customFields'->>'docusign_envelope_id' = ${envelopeId}`,
    })

    switch (status) {
      case "completed": {
        if (doc) {
          // Download signed PDF and store in Supabase Storage
          try {
            const docuSignIntegration = await db.query.integrations.findFirst({
              where: and(
                eq(integrations.orgId, doc.orgId),
                eq(integrations.provider, "docusign"),
                eq(integrations.status, "connected"),
              ),
            })

            if (docuSignIntegration) {
              const accessToken = await getAccessToken(docuSignIntegration.id)
              const signedPdf = await downloadSignedDocument(accessToken, envelopeId)

              const signedPath = doc.storagePath.replace(/(\.[^.]+)$/, `_signed$1`)
              const supabase = await createClient()
              await supabase.storage
                .from("documents")
                .upload(signedPath, Buffer.from(signedPdf), {
                  contentType: "application/pdf",
                  upsert: true,
                })

              await db
                .update(documents)
                .set({
                  status: "verified",
                  verifiedAt: new Date(),
                  storagePath: signedPath,
                  metadata: {
                    ...(doc.metadata as Record<string, unknown> ?? {}),
                    sourceSystem: "docusign",
                    customFields: {
                      ...((doc.metadata as Record<string, unknown>)?.customFields as Record<string, unknown> ?? {}),
                      docusign_envelope_id: envelopeId,
                      signed_at: event.data.envelopeSummary.completedDateTime,
                    },
                  },
                })
                .where(eq(documents.id, doc.id))
            } else {
              // No DocuSign integration — still mark as verified but skip download
              await db
                .update(documents)
                .set({ status: "verified", verifiedAt: new Date() })
                .where(eq(documents.id, doc.id))
            }
          } catch (downloadErr) {
            console.error(`[docusign-webhook] Download/store failed for ${envelopeId}:`, downloadErr)
            // Still mark as verified even if download fails
            await db
              .update(documents)
              .set({ status: "verified", verifiedAt: new Date() })
              .where(eq(documents.id, doc.id))
          }

          // Create compliance evidence if document is linked to a client
          if (doc.clientId) {
            try {
              // Find a compliance control that could be satisfied by this document
              const controls = await db.query.complianceControls.findMany({
                where: eq(sql`${sql.raw("org_id")}`, doc.orgId),
              })
              for (const control of controls) {
                const requiredTypes = (control.requiredDocumentTypes as string[]) ?? []
                const docMeta = doc.metadata as Record<string, unknown>
                const docType = (docMeta?.documentType as string) ?? ""
                if (requiredTypes.includes(docType)) {
                  await db.insert(complianceEvidence).values({
                    controlId: control.id,
                    documentId: doc.id,
                    clientId: doc.clientId,
                    status: "pending",
                    validFrom: new Date(),
                  })
                }
              }
            } catch (compErr) {
              console.error(`[docusign-webhook] Compliance evidence creation failed:`, compErr)
            }
          }

          // Write ledger event
          const admin = await db.query.orgMembers.findFirst({
            where: and(
              eq(orgMembers.orgId, doc.orgId),
              inArray(orgMembers.role, ["admin"]),
            ),
          })
          if (admin) {
            await db.insert(ledgerEvents).values({
              orgId: doc.orgId,
              actorUserId: admin.userId,
              targetType: "document",
              targetId: doc.id,
              action: "document_verified",
              payload: {
                documentName: doc.name,
                documentPath: doc.storagePath,
                reason: "DocuSign envelope completed",
                notes: `Envelope ${envelopeId} signed by all parties`,
              },
            })
          }
        }
        break
      }

      case "declined": {
        const decliner = event.data.envelopeSummary.recipients?.signers?.find(
          (s) => s.status === "declined",
        )

        if (doc) {
          await db
            .update(documents)
            .set({ status: "rejected" })
            .where(eq(documents.id, doc.id))

          const admin = await db.query.orgMembers.findFirst({
            where: and(
              eq(orgMembers.orgId, doc.orgId),
              inArray(orgMembers.role, ["admin"]),
            ),
          })
          if (admin) {
            await db.insert(ledgerEvents).values({
              orgId: doc.orgId,
              actorUserId: admin.userId,
              targetType: "document",
              targetId: doc.id,
              action: "updated",
              payload: {
                documentName: doc.name,
                reason: `DocuSign envelope declined by ${decliner?.name ?? "unknown"}`,
                after: { status: "rejected" },
              },
            })
          }

          dispatchAlert({
            title: `Document signing declined: ${doc.name}`,
            description: `${decliner?.name ?? "A signer"} declined to sign "${doc.name}". Review and resend if needed.`,
            severity: "warning",
            source: "docusign-webhook",
            orgId: doc.orgId,
            actionUrl: `/app/documents/${doc.id}`,
          }).catch(() => {})
        }
        break
      }

      case "voided": {
        if (doc) {
          await db
            .update(documents)
            .set({ status: "rejected" })
            .where(eq(documents.id, doc.id))

          const admin = await db.query.orgMembers.findFirst({
            where: and(
              eq(orgMembers.orgId, doc.orgId),
              inArray(orgMembers.role, ["admin"]),
            ),
          })
          if (admin) {
            await db.insert(ledgerEvents).values({
              orgId: doc.orgId,
              actorUserId: admin.userId,
              targetType: "document",
              targetId: doc.id,
              action: "updated",
              payload: {
                documentName: doc.name,
                reason: "DocuSign envelope voided",
                after: { status: "rejected" },
              },
            })
          }

          dispatchAlert({
            title: `Document signing voided: ${doc.name}`,
            description: `The signing envelope for "${doc.name}" has been voided.`,
            severity: "warning",
            source: "docusign-webhook",
            orgId: doc.orgId,
          }).catch(() => {})
        }
        break
      }

      default:
        console.log(`[docusign-webhook] Unhandled status: ${status} for envelope ${envelopeId}`)
    }

    Sentry.addBreadcrumb({
      category: "webhook.docusign",
      message: `DocuSign envelope ${status}: ${envelopeId}`,
      data: { envelopeId, status },
      level: "info",
    })
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[docusign-webhook] Processing error:", err)

    Sentry.withScope((scope) => {
      scope.setTag("webhook", "docusign")
      scope.setContext("webhook", { envelopeId: event.data?.envelopeId, status: event.data?.envelopeSummary?.status })
      scope.captureException(err instanceof Error ? err : new Error(String(err)))
    })

    dispatchAlert({
      title: "DocuSign webhook processing failed",
      description: `Error processing envelope: ${err instanceof Error ? err.message : String(err)}`,
      severity: "critical",
      source: "docusign-webhook",
    }).catch(() => {})

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
