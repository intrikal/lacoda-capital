"use server"

/**
 * DocuSign Integration — Electronic Signatures
 *
 * DocuSign handles:
 * - Sending documents for e-signature (client onboarding, agreements, etc.)
 * - Tracking signature status (sent, viewed, signed, declined)
 * - Downloading signed documents
 *
 * FLOW:
 *   1. Advisor clicks "Send for Signature" on a document
 *   2. Server creates a DocuSign envelope with the document
 *   3. Client receives email from DocuSign → signs electronically
 *   4. DocuSign sends webhook → document status updated to "verified"
 *   5. Server downloads signed PDF → stores in Supabase Storage
 *
 * REQUIRED ENV VARS:
 *   DOCUSIGN_INTEGRATION_KEY  — from https://admindemo.docusign.com/apps-and-keys
 *   DOCUSIGN_SECRET_KEY       — from the same page
 *   DOCUSIGN_ACCOUNT_ID       — your DocuSign account/API Account ID
 *   DOCUSIGN_BASE_URL         — "https://demo.docusign.net" (sandbox) or "https://na1.docusign.net" (production)
 *   DOCUSIGN_WEBHOOK_SECRET   — HMAC key for webhook verification
 */

import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq } from "drizzle-orm"

// ─── Configuration ──────────────────────────────────────────────────────────

const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY ?? ""
const DOCUSIGN_SECRET_KEY = process.env.DOCUSIGN_SECRET_KEY ?? ""
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID ?? ""
const DOCUSIGN_BASE_URL = process.env.DOCUSIGN_BASE_URL ?? "https://demo.docusign.net"

export function isDocuSignConfigured(): boolean {
  return Boolean(DOCUSIGN_INTEGRATION_KEY && DOCUSIGN_SECRET_KEY && DOCUSIGN_ACCOUNT_ID)
}

// ─── OAuth Token Management ─────────────────────────────────────────────────

interface DocuSignToken {
  access_token: string
  refresh_token: string
  expires_in: number
}

/**
 * Get OAuth authorization URL for DocuSign consent flow.
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const authServer = DOCUSIGN_BASE_URL.includes("demo")
    ? "https://account-d.docusign.com"
    : "https://account.docusign.com"

  const params = new URLSearchParams({
    response_type: "code",
    scope: "signature",
    client_id: DOCUSIGN_INTEGRATION_KEY,
    redirect_uri: redirectUri,
    state,
  })

  return `${authServer}/oauth/auth?${params.toString()}`
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeAuthCode(code: string, redirectUri: string): Promise<DocuSignToken> {
  const authServer = DOCUSIGN_BASE_URL.includes("demo")
    ? "https://account-d.docusign.com"
    : "https://account.docusign.com"

  const credentials = Buffer.from(`${DOCUSIGN_INTEGRATION_KEY}:${DOCUSIGN_SECRET_KEY}`).toString("base64")

  const res = await fetch(`${authServer}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`DocuSign token exchange failed: ${error}`)
  }

  return res.json() as Promise<DocuSignToken>
}

// ─── DocuSign API Helpers ───────────────────────────────────────────────────

async function docusignRequest<T>(
  endpoint: string,
  accessToken: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(
    `${DOCUSIGN_BASE_URL}/restapi/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}${endpoint}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  )

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`DocuSign ${endpoint}: ${error}`)
  }

  return res.json() as Promise<T>
}

// ─── Envelope Management ────────────────────────────────────────────────────

interface DocuSignEnvelope {
  envelopeId: string
  status: string
  uri: string
}

/**
 * Send a document for e-signature.
 *
 * @param accessToken     - DocuSign access token (from integration settings)
 * @param documentBase64  - Base64-encoded document content
 * @param documentName    - Filename (e.g., "Operating_Agreement.pdf")
 * @param signerEmail     - Recipient's email
 * @param signerName      - Recipient's display name
 * @param subject         - Email subject line
 */
export async function sendForSignature(
  accessToken: string,
  documentBase64: string,
  documentName: string,
  signerEmail: string,
  signerName: string,
  subject: string,
): Promise<{ envelopeId: string }> {
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/docusign`

  const envelope = await docusignRequest<DocuSignEnvelope>(
    "/envelopes",
    accessToken,
    "POST",
    {
      emailSubject: subject,
      documents: [
        {
          documentBase64,
          name: documentName,
          fileExtension: documentName.split(".").pop() ?? "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers: [
          {
            email: signerEmail,
            name: signerName,
            recipientId: "1",
            routingOrder: "1",
            tabs: {
              signHereTabs: [
                {
                  anchorString: "/sig1/",
                  anchorUnits: "pixels",
                  anchorXOffset: "0",
                  anchorYOffset: "0",
                },
              ],
              dateSignedTabs: [
                {
                  anchorString: "/date1/",
                  anchorUnits: "pixels",
                  anchorXOffset: "0",
                  anchorYOffset: "0",
                },
              ],
            },
          },
        ],
      },
      eventNotification: {
        url: webhookUrl,
        loggingEnabled: "true",
        requireAcknowledgment: "true",
        envelopeEvents: [
          { envelopeEventStatusCode: "completed" },
          { envelopeEventStatusCode: "declined" },
          { envelopeEventStatusCode: "voided" },
        ],
      },
      status: "sent",
    },
  )

  return { envelopeId: envelope.envelopeId }
}

/**
 * Get the status of an envelope.
 */
export async function getEnvelopeStatus(
  accessToken: string,
  envelopeId: string,
): Promise<{ status: string; completedDateTime: string | null }> {
  const data = await docusignRequest<{
    status: string
    completedDateTime: string | null
  }>(`/envelopes/${envelopeId}`, accessToken)

  return { status: data.status, completedDateTime: data.completedDateTime }
}

/**
 * Download the signed document from a completed envelope.
 * Returns the document as a Buffer (for storing in Supabase Storage).
 */
export async function downloadSignedDocument(
  accessToken: string,
  envelopeId: string,
  documentId: string = "combined",
): Promise<ArrayBuffer> {
  const res = await fetch(
    `${DOCUSIGN_BASE_URL}/restapi/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/documents/${documentId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!res.ok) throw new Error(`Failed to download document: ${res.statusText}`)

  return res.arrayBuffer()
}

// ─── Connection Management ──────────────────────────────────────────────────

/**
 * Store DocuSign connection after OAuth flow completes.
 */
export async function connectDocuSign(
  orgId: string,
  connectedBy: string,
  tokens: DocuSignToken,
): Promise<string> {
  const [integration] = await db
    .insert(integrations)
    .values({
      orgId,
      provider: "docusign",
      name: "DocuSign",
      status: "connected",
      connectedBy,
      connectedAt: new Date(),
      settings: {
        // In production, store tokens in Supabase Vault
        _access_token: tokens.access_token,
        _refresh_token: tokens.refresh_token,
        expires_at: Date.now() + tokens.expires_in * 1000,
        environment: DOCUSIGN_BASE_URL.includes("demo") ? "sandbox" : "production",
      },
    })
    .returning()

  return integration.id
}

/**
 * Get the access token for a DocuSign integration, refreshing if expired.
 */
export async function getAccessToken(integrationId: string): Promise<string> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "docusign") {
    throw new Error("DocuSign integration not found")
  }

  const settings = integration.settings as Record<string, unknown>
  const expiresAt = settings.expires_at as number
  const accessToken = settings._access_token as string
  const refreshToken = settings._refresh_token as string

  // If token hasn't expired, return it
  if (Date.now() < expiresAt - 60_000) {
    return accessToken
  }

  // Refresh the token
  const authServer = DOCUSIGN_BASE_URL.includes("demo")
    ? "https://account-d.docusign.com"
    : "https://account.docusign.com"

  const credentials = Buffer.from(`${DOCUSIGN_INTEGRATION_KEY}:${DOCUSIGN_SECRET_KEY}`).toString("base64")

  const res = await fetch(`${authServer}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!res.ok) {
    // Mark integration as errored
    await db
      .update(integrations)
      .set({ status: "error", statusMessage: "Token refresh failed — please reconnect" })
      .where(eq(integrations.id, integrationId))
    throw new Error("DocuSign token refresh failed")
  }

  const tokens: DocuSignToken = await res.json()

  // Update stored tokens
  await db
    .update(integrations)
    .set({
      settings: {
        ...settings,
        _access_token: tokens.access_token,
        _refresh_token: tokens.refresh_token,
        expires_at: Date.now() + tokens.expires_in * 1000,
      },
    })
    .where(eq(integrations.id, integrationId))

  return tokens.access_token
}
