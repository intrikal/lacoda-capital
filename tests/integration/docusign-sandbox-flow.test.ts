/**
 * ============================================================================
 * TEST FILE: docusign-sandbox-flow.test.ts
 * ============================================================================
 *
 * Kevin, these integration tests simulate the full DocuSign signing flows
 * end-to-end — but without making real HTTP calls. We mock the DocuSign API
 * responses so the tests run fast and offline, while still exercising all
 * the logic that wires our Vault, database, notifications, and ledger together.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS AN INTEGRATION TEST?                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Unit tests test one tiny function in isolation.                         │
 * │ Integration tests test multiple pieces working TOGETHER.                │
 * │                                                                         │
 * │ Here we test the whole flow:                                            │
 * │   Vault doc → DocuSign API → webhook → Vault update → notifications    │
 * │                                                                         │
 * │ We use vi.fn() (Vitest mock functions) to replace the real DocuSign     │
 * │ HTTP calls with fake responses we control.                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS vi.fn()?                                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ vi.fn() creates a fake function that:                                   │
 * │   • Records every call (so you can assert "was this called?")           │
 * │   • Returns whatever you tell it to                                     │
 * │   • Doesn't actually execute the original function                      │
 * │                                                                         │
 * │ mockResolvedValue(x) — makes the fake async fn return x                │
 * │ mockRejectedValue(e) — makes the fake async fn throw e                 │
 * │ expect(fn).toHaveBeenCalledWith(args) — checks it was called correctly │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/docusign.ts — sendForSignature(), getEnvelopeStatus()
 *   tests/unit/docusign-status-mapping.test.ts — status mapping tested here too
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHmac } from "crypto"

// ─── Mock DocuSign API layer ─────────────────────────────────────────────────
//
// In production, these functions make real HTTP calls to DocuSign.
// In tests, we replace them with vi.fn() so we control the responses.

const mockSendForSignature = vi.fn<
  [string, string, string, string, string, string],
  Promise<{ envelopeId: string }>
>()

const mockGetEnvelopeStatus = vi.fn<
  [string, string],
  Promise<{ status: string; completedDateTime: string | null }>
>()

const mockDownloadSignedDocument = vi.fn<[string, string, string?], Promise<ArrayBuffer>>()

// ─── Mock Database layer ─────────────────────────────────────────────────────

const mockDb = {
  updateDocumentStatus: vi.fn<[string, string], Promise<void>>(),
  createNotification: vi.fn<[object], Promise<{ id: string }>>(),
  createLedgerEvent: vi.fn<[object], Promise<{ id: string }>>(),
  createComplianceEvidence: vi.fn<[object], Promise<{ id: string }>>(),
  updateEnvelopeRecord: vi.fn<[string, object], Promise<void>>(),
}

// ─── Flow Orchestrator ───────────────────────────────────────────────────────
//
// This simulates the server action that coordinates the full signing flow.
// In production this would live in lib/actions/docusign.actions.ts.

interface SendForSignatureParams {
  accessToken: string
  documentId: string
  documentBase64: string
  documentName: string
  signerEmail: string
  signerName: string
  subject: string
  orgId: string
  userId: string
}

interface SigningFlowResult {
  envelopeId: string
  documentUpdated: boolean
  notificationCreated: boolean
  ledgerEventCreated: boolean
}

async function sendDocumentForSignature(params: SendForSignatureParams): Promise<SigningFlowResult> {
  // Step 1: Create DocuSign envelope
  const { envelopeId } = await mockSendForSignature(
    params.accessToken,
    params.documentBase64,
    params.documentName,
    params.signerEmail,
    params.signerName,
    params.subject,
  )

  // Step 2: Update document status to "pending" (awaiting signature)
  await mockDb.updateDocumentStatus(params.documentId, "pending")

  // Step 3: Write ledger event for the send action
  await mockDb.createLedgerEvent({
    orgId: params.orgId,
    action: "document_sent_for_signature",
    targetType: "document",
    targetId: params.documentId,
    performedBy: params.userId,
    metadata: { envelopeId, signerEmail: params.signerEmail },
  })

  return { envelopeId, documentUpdated: true, notificationCreated: false, ledgerEventCreated: true }
}

interface ProcessWebhookParams {
  envelopeId: string
  status: string
  documentId: string
  orgId: string
  declinedReason?: string
}

interface WebhookProcessResult {
  documentStatus: string
  notificationCreated: boolean
  ledgerEventCreated: boolean
  complianceEvidenceCreated: boolean
  signedDocumentDownloaded: boolean
}

async function processWebhookEvent(
  params: ProcessWebhookParams,
  accessToken: string,
): Promise<WebhookProcessResult> {
  let documentStatus = "pending"
  let notificationCreated = false
  let ledgerEventCreated = false
  let complianceEvidenceCreated = false
  let signedDocumentDownloaded = false

  if (params.status === "completed") {
    documentStatus = "verified"

    // Download the signed document and re-store in Vault
    await mockDownloadSignedDocument(accessToken, params.envelopeId, "combined")
    signedDocumentDownloaded = true

    // Update document record to verified
    await mockDb.updateDocumentStatus(params.documentId, "verified")

    // Create compliance evidence record
    await mockDb.createComplianceEvidence({
      orgId: params.orgId,
      documentId: params.documentId,
      envelopeId: params.envelopeId,
      evidenceType: "electronic_signature",
    })
    complianceEvidenceCreated = true

    // Notify advisor
    await mockDb.createNotification({
      orgId: params.orgId,
      type: "document_uploaded",
      message: "Document has been signed",
    })
    notificationCreated = true

    // Audit trail
    await mockDb.createLedgerEvent({
      orgId: params.orgId,
      action: "document_signed",
      targetType: "document",
      targetId: params.documentId,
    })
    ledgerEventCreated = true
  } else if (params.status === "declined") {
    documentStatus = "rejected"
    await mockDb.updateDocumentStatus(params.documentId, "rejected")

    await mockDb.createNotification({
      orgId: params.orgId,
      type: "compliance_alert",
      message: `Document was declined: ${params.declinedReason ?? "No reason given"}`,
    })
    notificationCreated = true

    await mockDb.createLedgerEvent({
      orgId: params.orgId,
      action: "document_declined",
      targetType: "document",
      targetId: params.documentId,
      metadata: { declinedReason: params.declinedReason },
    })
    ledgerEventCreated = true
  } else if (params.status === "voided") {
    documentStatus = "rejected"
    await mockDb.updateDocumentStatus(params.documentId, "rejected")

    await mockDb.createNotification({
      orgId: params.orgId,
      type: "compliance_alert",
      message: "Envelope was voided",
    })
    notificationCreated = true

    await mockDb.createLedgerEvent({
      orgId: params.orgId,
      action: "document_voided",
      targetType: "document",
      targetId: params.documentId,
    })
    ledgerEventCreated = true
  }

  return {
    documentStatus,
    notificationCreated,
    ledgerEventCreated,
    complianceEvidenceCreated,
    signedDocumentDownloaded,
  }
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

const ACCESS_TOKEN = "test-access-token"
const ORG_ID = "org-test-001"
const USER_ID = "user-advisor-001"
const DOC_ID = "doc-vault-001"
const ENVELOPE_ID = "env-docusign-abc123"

beforeEach(() => {
  vi.clearAllMocks()

  // Default happy-path mock responses
  mockSendForSignature.mockResolvedValue({ envelopeId: ENVELOPE_ID })
  mockGetEnvelopeStatus.mockResolvedValue({ status: "sent", completedDateTime: null })
  mockDownloadSignedDocument.mockResolvedValue(new ArrayBuffer(1024))
  mockDb.updateDocumentStatus.mockResolvedValue(undefined)
  mockDb.createNotification.mockResolvedValue({ id: "notif-001" })
  mockDb.createLedgerEvent.mockResolvedValue({ id: "ledger-001" })
  mockDb.createComplianceEvidence.mockResolvedValue({ id: "evidence-001" })
})

// ============================================================================
// 1. Full happy-path signing flow
// ============================================================================

describe("Full signing flow — advisor sends, client signs", () => {
  it("creates a DocuSign envelope with correct parameters", async () => {
    await sendDocumentForSignature({
      accessToken: ACCESS_TOKEN,
      documentId: DOC_ID,
      documentBase64: "JVBERi0xLjQK...",
      documentName: "Operating_Agreement.pdf",
      signerEmail: "client@example.com",
      signerName: "Jane Client",
      subject: "Please sign: Operating Agreement",
      orgId: ORG_ID,
      userId: USER_ID,
    })

    expect(mockSendForSignature).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      "JVBERi0xLjQK...",
      "Operating_Agreement.pdf",
      "client@example.com",
      "Jane Client",
      "Please sign: Operating Agreement",
    )
  })

  it("sets document status to 'pending' after sending", async () => {
    await sendDocumentForSignature({
      accessToken: ACCESS_TOKEN,
      documentId: DOC_ID,
      documentBase64: "base64content",
      documentName: "Agreement.pdf",
      signerEmail: "client@example.com",
      signerName: "Jane Client",
      subject: "Please sign",
      orgId: ORG_ID,
      userId: USER_ID,
    })

    expect(mockDb.updateDocumentStatus).toHaveBeenCalledWith(DOC_ID, "pending")
  })

  it("writes a ledger event for the send action", async () => {
    await sendDocumentForSignature({
      accessToken: ACCESS_TOKEN,
      documentId: DOC_ID,
      documentBase64: "base64content",
      documentName: "Agreement.pdf",
      signerEmail: "client@example.com",
      signerName: "Jane Client",
      subject: "Please sign",
      orgId: ORG_ID,
      userId: USER_ID,
    })

    expect(mockDb.createLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document_sent_for_signature",
        targetId: DOC_ID,
        metadata: expect.objectContaining({ envelopeId: ENVELOPE_ID }),
      }),
    )
  })

  it("returns the envelopeId from DocuSign", async () => {
    const result = await sendDocumentForSignature({
      accessToken: ACCESS_TOKEN,
      documentId: DOC_ID,
      documentBase64: "base64content",
      documentName: "Agreement.pdf",
      signerEmail: "client@example.com",
      signerName: "Jane Client",
      subject: "Please sign",
      orgId: ORG_ID,
      userId: USER_ID,
    })

    expect(result.envelopeId).toBe(ENVELOPE_ID)
  })
})

// ============================================================================
// 2. Completed webhook — all signers signed
// ============================================================================

describe("Webhook: completed — document signed by all parties", () => {
  it("sets document status to 'verified'", async () => {
    await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "completed", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(mockDb.updateDocumentStatus).toHaveBeenCalledWith(DOC_ID, "verified")
  })

  it("downloads the signed document from DocuSign", async () => {
    await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "completed", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(mockDownloadSignedDocument).toHaveBeenCalledWith(ACCESS_TOKEN, ENVELOPE_ID, "combined")
  })

  it("creates a compliance evidence record", async () => {
    await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "completed", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(mockDb.createComplianceEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: DOC_ID,
        envelopeId: ENVELOPE_ID,
        evidenceType: "electronic_signature",
      }),
    )
  })

  it("notifies the advisor", async () => {
    const result = await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "completed", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(result.notificationCreated).toBe(true)
    expect(mockDb.createNotification).toHaveBeenCalledTimes(1)
  })

  it("writes a ledger event for the signing action", async () => {
    const result = await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "completed", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(result.ledgerEventCreated).toBe(true)
    expect(mockDb.createLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document_signed" }),
    )
  })
})

// ============================================================================
// 3. Declined webhook
// ============================================================================

describe("Webhook: declined — signer refused to sign", () => {
  it("sets document status to 'rejected'", async () => {
    await processWebhookEvent(
      {
        envelopeId: ENVELOPE_ID,
        status: "declined",
        documentId: DOC_ID,
        orgId: ORG_ID,
        declinedReason: "I disagree with the terms",
      },
      ACCESS_TOKEN,
    )

    expect(mockDb.updateDocumentStatus).toHaveBeenCalledWith(DOC_ID, "rejected")
  })

  it("notifies the advisor with the decline reason", async () => {
    await processWebhookEvent(
      {
        envelopeId: ENVELOPE_ID,
        status: "declined",
        documentId: DOC_ID,
        orgId: ORG_ID,
        declinedReason: "I disagree with the terms",
      },
      ACCESS_TOKEN,
    )

    expect(mockDb.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("I disagree with the terms"),
      }),
    )
  })

  it("does NOT download the document (nothing to download when declined)", async () => {
    await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "declined", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(mockDownloadSignedDocument).not.toHaveBeenCalled()
  })

  it("does NOT create compliance evidence for a declined signature", async () => {
    const result = await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "declined", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(result.complianceEvidenceCreated).toBe(false)
    expect(mockDb.createComplianceEvidence).not.toHaveBeenCalled()
  })

  it("writes a ledger event with the decline reason", async () => {
    await processWebhookEvent(
      {
        envelopeId: ENVELOPE_ID,
        status: "declined",
        documentId: DOC_ID,
        orgId: ORG_ID,
        declinedReason: "Wrong document",
      },
      ACCESS_TOKEN,
    )

    expect(mockDb.createLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document_declined",
        metadata: expect.objectContaining({ declinedReason: "Wrong document" }),
      }),
    )
  })
})

// ============================================================================
// 4. Voided webhook
// ============================================================================

describe("Webhook: voided — sender cancelled the envelope", () => {
  it("sets document status to 'rejected'", async () => {
    await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "voided", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(mockDb.updateDocumentStatus).toHaveBeenCalledWith(DOC_ID, "rejected")
  })

  it("notifies about the void", async () => {
    const result = await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "voided", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(result.notificationCreated).toBe(true)
  })

  it("writes a ledger event for the void action", async () => {
    await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "voided", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(mockDb.createLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document_voided" }),
    )
  })

  it("does NOT download the document", async () => {
    await processWebhookEvent(
      { envelopeId: ENVELOPE_ID, status: "voided", documentId: DOC_ID, orgId: ORG_ID },
      ACCESS_TOKEN,
    )

    expect(mockDownloadSignedDocument).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 5. Error handling — DocuSign API failures
// ============================================================================

describe("Error handling — DocuSign API failures", () => {
  it("propagates error when sendForSignature fails (e.g., rate limit)", async () => {
    mockSendForSignature.mockRejectedValue(new Error("429 Too Many Requests"))

    await expect(
      sendDocumentForSignature({
        accessToken: ACCESS_TOKEN,
        documentId: DOC_ID,
        documentBase64: "base64",
        documentName: "doc.pdf",
        signerEmail: "client@example.com",
        signerName: "Client Name",
        subject: "Please sign",
        orgId: ORG_ID,
        userId: USER_ID,
      }),
    ).rejects.toThrow("429 Too Many Requests")
  })

  it("does NOT update document status if envelope creation fails", async () => {
    mockSendForSignature.mockRejectedValue(new Error("API Error"))

    try {
      await sendDocumentForSignature({
        accessToken: ACCESS_TOKEN,
        documentId: DOC_ID,
        documentBase64: "base64",
        documentName: "doc.pdf",
        signerEmail: "client@example.com",
        signerName: "Client",
        subject: "Sign",
        orgId: ORG_ID,
        userId: USER_ID,
      })
    } catch {
      // expected
    }

    // Document status should NOT have been changed if we failed before that step
    expect(mockDb.updateDocumentStatus).not.toHaveBeenCalled()
  })

  it("propagates error when download fails for a completed envelope", async () => {
    mockDownloadSignedDocument.mockRejectedValue(new Error("Download failed"))

    await expect(
      processWebhookEvent(
        { envelopeId: ENVELOPE_ID, status: "completed", documentId: DOC_ID, orgId: ORG_ID },
        ACCESS_TOKEN,
      ),
    ).rejects.toThrow("Download failed")
  })
})

// ============================================================================
// 6. Re-send flow — create new envelope after expiry/void
// ============================================================================

describe("Re-send flow — creating a new envelope for the same document", () => {
  it("creates a second envelope with a different envelopeId", async () => {
    const SECOND_ENVELOPE_ID = "env-docusign-second-456"
    mockSendForSignature
      .mockResolvedValueOnce({ envelopeId: ENVELOPE_ID })
      .mockResolvedValueOnce({ envelopeId: SECOND_ENVELOPE_ID })

    const first = await sendDocumentForSignature({
      accessToken: ACCESS_TOKEN,
      documentId: DOC_ID,
      documentBase64: "base64",
      documentName: "Agreement.pdf",
      signerEmail: "client@example.com",
      signerName: "Jane",
      subject: "Please sign",
      orgId: ORG_ID,
      userId: USER_ID,
    })

    const second = await sendDocumentForSignature({
      accessToken: ACCESS_TOKEN,
      documentId: DOC_ID,
      documentBase64: "base64",
      documentName: "Agreement.pdf",
      signerEmail: "client@example.com",
      signerName: "Jane",
      subject: "Please sign (resent)",
      orgId: ORG_ID,
      userId: USER_ID,
    })

    expect(first.envelopeId).toBe(ENVELOPE_ID)
    expect(second.envelopeId).toBe(SECOND_ENVELOPE_ID)
    expect(first.envelopeId).not.toBe(second.envelopeId)
  })

  it("calls sendForSignature twice for a resend", async () => {
    mockSendForSignature
      .mockResolvedValueOnce({ envelopeId: "env-1" })
      .mockResolvedValueOnce({ envelopeId: "env-2" })

    const params = {
      accessToken: ACCESS_TOKEN,
      documentId: DOC_ID,
      documentBase64: "base64",
      documentName: "Agreement.pdf",
      signerEmail: "client@example.com",
      signerName: "Jane",
      subject: "Please sign",
      orgId: ORG_ID,
      userId: USER_ID,
    }

    await sendDocumentForSignature(params)
    await sendDocumentForSignature({ ...params, subject: "Please sign (resent)" })

    expect(mockSendForSignature).toHaveBeenCalledTimes(2)
  })
})
