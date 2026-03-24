import { z } from "zod"

// ─── Create Envelope ───────────────────────────────────────────────────────

export const createEnvelopeSchema = z.object({
  documentRequestId: z.string().uuid("Invalid document request ID"),
  signerEmail: z.string().email("Valid email required"),
  signerName: z.string().min(1, "Signer name is required"),
  documentName: z.string().min(1, "Document name is required"),
  /** Base64-encoded document content, or a storage path to fetch */
  documentBase64: z.string().optional(),
  documentStoragePath: z.string().optional(),
})

export type CreateEnvelopeInput = z.infer<typeof createEnvelopeSchema>

// ─── Webhook Event ─────────────────────────────────────────────────────────

export const docusignWebhookSchema = z.object({
  event: z.string(),
  apiVersion: z.string().optional(),
  uri: z.string().optional(),
  retryCount: z.number().optional(),
  configurationId: z.string().optional(),
  generatedDateTime: z.string().optional(),
  data: z.object({
    accountId: z.string().optional(),
    userId: z.string().optional(),
    envelopeId: z.string(),
    envelopeSummary: z
      .object({
        status: z.string(),
        emailSubject: z.string().optional(),
        sentDateTime: z.string().optional(),
        completedDateTime: z.string().optional(),
        declinedDateTime: z.string().optional(),
        voidedDateTime: z.string().optional(),
        recipients: z.unknown().optional(),
        envelopeDocuments: z
          .array(
            z.object({
              documentId: z.string(),
              name: z.string().optional(),
              uri: z.string().optional(),
            })
          )
          .optional(),
      })
      .optional(),
  }),
})

export type DocuSignWebhookEvent = z.infer<typeof docusignWebhookSchema>

// ─── Envelope Status Mapping ───────────────────────────────────────────────

/** Maps DocuSign envelope statuses to our document_request statuses */
export const DOCUSIGN_STATUS_MAP: Record<string, string> = {
  completed: "approved",
  declined: "declined",
  voided: "expired",
  sent: "open",
  delivered: "open",
  created: "open",
}

/** Map a DocuSign envelope status to our document request status */
export function mapEnvelopeStatus(docusignStatus: string): string {
  return DOCUSIGN_STATUS_MAP[docusignStatus.toLowerCase()] ?? "open"
}

// ─── HMAC Signature Verification ───────────────────────────────────────────

/**
 * Verify DocuSign Connect webhook HMAC signature.
 *
 * DocuSign sends an x-docusign-signature-1 header containing
 * an HMAC-SHA256 of the request body, base64-encoded.
 */
export async function verifyDocuSignSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
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
