/**
 * docusign-create-envelope — Supabase Edge Function
 *
 * Creates a DocuSign envelope for embedded signing.
 * Flow: user clicks 'Send for Signature' → this function creates the envelope →
 * returns a signing URL for embedded signing → recipient signs → webhook fires.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const DOCUSIGN_BASE_URL = Deno.env.get("DOCUSIGN_BASE_URL") ?? "https://demo.docusign.net/restapi"
const DOCUSIGN_ACCOUNT_ID = Deno.env.get("DOCUSIGN_ACCOUNT_ID")!

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const {
      documentRequestId,
      orgId,
      signerEmail,
      signerName,
      documentName,
      documentBase64,
      returnUrl,
    } = body

    if (!documentRequestId || !signerEmail || !signerName || !documentName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // ── 1. Get DocuSign access token from Vault ────────────────────────────
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: docusignIntegration } = await serviceClient
      .from("integrations")
      .select("*")
      .eq("org_id", orgId)
      .eq("provider", "docusign")
      .eq("status", "connected")
      .maybeSingle()

    if (!docusignIntegration?.vault_secret_id) {
      return new Response(
        JSON.stringify({ error: "DocuSign not connected. Please connect DocuSign first." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const { data: vaultSecret } = await serviceClient.rpc("vault_read_secret", {
      secret_id: docusignIntegration.vault_secret_id,
    })

    const credentials = typeof vaultSecret === "string" ? JSON.parse(vaultSecret) : vaultSecret
    const accessToken = credentials?.access_token

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "DocuSign credentials expired. Please reconnect." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // ── 2. Create the DocuSign envelope ────────────────────────────────────
    // Use a placeholder document if none provided
    const docContent = documentBase64 ?? btoa("Document pending upload — please sign below.")
    const clientUserId = user.id // Marks as embedded signing

    const envelopeDefinition = {
      emailSubject: `Please sign: ${documentName}`,
      documents: [
        {
          documentBase64: docContent,
          name: documentName,
          fileExtension: "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers: [
          {
            email: signerEmail,
            name: signerName,
            recipientId: "1",
            clientUserId, // Required for embedded signing
            routingOrder: "1",
            tabs: {
              signHereTabs: [
                {
                  documentId: "1",
                  pageNumber: "1",
                  xPosition: "200",
                  yPosition: "600",
                },
              ],
              dateSignedTabs: [
                {
                  documentId: "1",
                  pageNumber: "1",
                  xPosition: "200",
                  yPosition: "650",
                },
              ],
            },
          },
        ],
      },
      status: "sent",
    }

    const envelopeRes = await fetch(
      `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(envelopeDefinition),
      }
    )

    if (!envelopeRes.ok) {
      const err = await envelopeRes.json()
      console.error("DocuSign envelope creation error:", err)
      return new Response(
        JSON.stringify({ error: "Failed to create envelope", details: err.message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      )
    }

    const envelopeData = await envelopeRes.json()
    const envelopeId = envelopeData.envelopeId

    // ── 3. Create embedded signing URL ─────────────────────────────────────
    const recipientViewRes = await fetch(
      `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/views/recipient`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          returnUrl: returnUrl ?? `${Deno.env.get("APP_URL") ?? "http://localhost:3000"}/app/vault?signed=true`,
          authenticationMethod: "none",
          email: signerEmail,
          userName: signerName,
          clientUserId,
        }),
      }
    )

    let signingUrl = null
    if (recipientViewRes.ok) {
      const viewData = await recipientViewRes.json()
      signingUrl = viewData.url
    }

    // ── 4. Update document request with envelope ID ────────────────────────
    await serviceClient
      .from("document_requests")
      .update({
        docusign_envelope_id: envelopeId,
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentRequestId)

    // ── 5. Ledger event ────────────────────────────────────────────────────
    await serviceClient.from("ledger_events").insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: "created",
      target_type: "document",
      target_id: documentRequestId,
      payload: {
        action: "docusign_envelope_created",
        envelopeId,
        signerEmail,
        documentName,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        envelopeId,
        signingUrl,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (error) {
    console.error("docusign-create-envelope error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
