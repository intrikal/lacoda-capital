/**
 * docusign-webhook — Supabase Edge Function
 *
 * Receives DocuSign Connect webhook events.
 * On envelope completion:
 *   1. Verify HMAC signature
 *   2. Download signed PDF
 *   3. Upload to Supabase Storage (vault bucket)
 *   4. Create document record in vault
 *   5. Update document request status
 *
 * Idempotent processing by envelope ID — duplicate deliveries are safe.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const DOCUSIGN_HMAC_KEY = Deno.env.get("DOCUSIGN_HMAC_KEY") ?? ""
const DOCUSIGN_BASE_URL = Deno.env.get("DOCUSIGN_BASE_URL") ?? "https://demo.docusign.net/restapi"
const DOCUSIGN_ACCOUNT_ID = Deno.env.get("DOCUSIGN_ACCOUNT_ID")!

/** Maps DocuSign envelope statuses to our document_request statuses */
const STATUS_MAP: Record<string, string> = {
  completed: "approved",
  declined: "declined",
  voided: "expired",
  sent: "open",
  delivered: "open",
  created: "open",
}

function mapStatus(docusignStatus: string): string {
  return STATUS_MAP[docusignStatus.toLowerCase()] ?? "open"
}

/** Verify HMAC-SHA256 signature from DocuSign Connect */
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!secret) return true // Skip verification if no key configured (development)

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return computed === signature
}

Deno.serve(async (req: Request) => {
  // DocuSign webhooks are always POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const rawBody = await req.text()

    // ── 1. Verify HMAC signature ───────────────────────────────────────────
    const signature = req.headers.get("x-docusign-signature-1") ?? ""
    if (DOCUSIGN_HMAC_KEY) {
      const valid = await verifySignature(rawBody, signature, DOCUSIGN_HMAC_KEY)
      if (!valid) {
        console.error("Invalid DocuSign webhook signature")
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }
    }

    const event = JSON.parse(rawBody)
    const envelopeId = event.data?.envelopeId ?? event.envelopeId
    const envelopeStatus =
      event.data?.envelopeSummary?.status ?? event.status ?? ""

    if (!envelopeId) {
      return new Response(JSON.stringify({ error: "Missing envelope ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // ── 2. Find the document request by envelope ID ────────────────────────
    const { data: docRequest } = await supabase
      .from("document_requests")
      .select("*, org_id")
      .eq("docusign_envelope_id", envelopeId)
      .maybeSingle()

    if (!docRequest) {
      // Not found — could be a duplicate or envelope we don't track
      console.warn(`No document request found for envelope ${envelopeId}`)
      return new Response(
        JSON.stringify({ received: true, message: "No matching document request" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Idempotent check: if already processed to the same status, skip
    const mappedStatus = mapStatus(envelopeStatus)
    if (docRequest.status === mappedStatus && mappedStatus === "approved") {
      return new Response(
        JSON.stringify({ received: true, message: "Already processed" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // ── 3. Update document request status ──────────────────────────────────
    await supabase
      .from("document_requests")
      .update({
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", docRequest.id)

    // ── 4. On completion: download signed PDF and auto-file to vault ──────
    if (envelopeStatus.toLowerCase() === "completed") {
      // Get DocuSign credentials from the org's integration
      const { data: integration } = await supabase
        .from("integrations")
        .select("vault_secret_id")
        .eq("org_id", docRequest.org_id)
        .eq("provider", "docusign")
        .eq("status", "connected")
        .maybeSingle()

      let accessToken: string | null = null
      if (integration?.vault_secret_id) {
        const { data: vaultSecret } = await supabase.rpc("vault_read_secret", {
          secret_id: integration.vault_secret_id,
        })
        const creds = typeof vaultSecret === "string" ? JSON.parse(vaultSecret) : vaultSecret
        accessToken = creds?.access_token ?? null
      }

      if (accessToken) {
        try {
          // Download the signed document
          const docRes = await fetch(
            `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/documents/combined`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          )

          if (docRes.ok) {
            const pdfBuffer = await docRes.arrayBuffer()
            const fileName = `signed_${docRequest.title?.replace(/[^a-zA-Z0-9-_]/g, "_") ?? "document"}_${envelopeId.slice(0, 8)}.pdf`
            const storagePath = `${docRequest.org_id}/signed/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from("documents")
              .upload(storagePath, pdfBuffer, {
                contentType: "application/pdf",
                upsert: true,
              })

            if (!uploadError) {
              // Create document record in vault
              await supabase.from("documents").insert({
                org_id: docRequest.org_id,
                client_id: docRequest.client_id,
                entity_id: docRequest.entity_id,
                asset_id: docRequest.asset_id,
                name: fileName,
                mime_type: "application/pdf",
                file_size: pdfBuffer.byteLength.toString(),
                storage_path: storagePath,
                folder: "Signed Documents",
                status: "verified",
                tags: ["signed", "docusign", envelopeId],
                uploaded_by: "docusign-webhook",
                metadata: {
                  docusign_envelope_id: envelopeId,
                  document_request_id: docRequest.id,
                  signed_at: new Date().toISOString(),
                },
              })
            } else {
              console.error("Failed to upload signed PDF:", uploadError)
            }
          }
        } catch (downloadErr) {
          console.error("Failed to download signed document:", downloadErr)
          // Don't fail the webhook — status update already done
        }
      }
    }

    // ── 5. Ledger event ────────────────────────────────────────────────────
    await supabase.from("ledger_events").insert({
      org_id: docRequest.org_id,
      actor_user_id: docRequest.assigned_to ?? docRequest.requested_by ?? "system",
      action: mappedStatus === "approved" ? "document_verified" : "updated",
      target_type: "document",
      target_id: docRequest.id,
      payload: {
        action: "docusign_webhook",
        envelopeId,
        envelopeStatus,
        mappedStatus,
      },
    })

    return new Response(
      JSON.stringify({ received: true, status: mappedStatus }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("docusign-webhook error:", error)
    // Always return 200 to DocuSign to prevent retries on our errors
    return new Response(
      JSON.stringify({ received: true, error: "Processing error" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }
})
