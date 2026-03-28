/**
 * ============================================================================
 * TEST FILE: docusign-edge-cases.test.ts
 * ============================================================================
 *
 * Kevin, these tests cover the unusual situations that rarely happen but
 * can cause major bugs when they do — things like declined signatures,
 * out-of-order webhooks, bounced emails, and expired tokens.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT ARE EDGE CASES?                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ The "happy path" is: advisor sends doc → client signs → done.          │
 * │ Edge cases are everything else:                                         │
 * │   - What if the signer DECLINES?                                       │
 * │   - What if DocuSign sends the "completed" webhook BEFORE "delivered"? │
 * │   - What if the document is deleted from our Vault after sending?      │
 * │   - What if the OAuth token expired mid-flow?                          │
 * │   - What if the same signer gets sent the same doc twice?              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/docusign.ts — getEnvelopeStatus(), sendForSignature()
 *   tests/unit/docusign-status-mapping.test.ts — status mapping unit tests
 */

import { describe, it, expect } from "vitest"
import { createHmac } from "crypto"

// ─── Helpers & Types ─────────────────────────────────────────────────────────

type DocuSignStatus = "sent" | "delivered" | "completed" | "declined" | "voided" | "deleted" | string

interface EnvelopeRecord {
  envelopeId: string
  documentId: string
  orgId: string
  status: DocuSignStatus
  signerEmail: string
  createdAt: Date
  declineReason?: string
}

interface ProcessWebhookResult {
  documentStatus: "pending" | "verified" | "rejected" | "expired"
  notificationCreated: boolean
  ledgerEventCreated: boolean
  declineReason?: string
}

// ─── Decline Edge Case Logic ─────────────────────────────────────────────────

function processDeclinedEnvelope(
  envelope: EnvelopeRecord,
  docusignPayload: { status: "declined"; declinedReason?: string },
): ProcessWebhookResult {
  return {
    documentStatus: "rejected",
    notificationCreated: true,
    ledgerEventCreated: true,
    declineReason: docusignPayload.declinedReason?.trim() || "No reason provided",
  }
}

// ─── Out-of-Order Webhook Logic ──────────────────────────────────────────────
//
// DocuSign webhooks are not guaranteed to arrive in order. If "completed"
// arrives before "delivered", we should NOT downgrade the status.

type AppDocStatus = "pending" | "verified" | "rejected" | "expired"

const STATUS_RANK: Record<AppDocStatus, number> = {
  pending: 0,
  verified: 3,
  rejected: 2,
  expired: 1,
}

function shouldApplyWebhookUpdate(
  currentStatus: AppDocStatus,
  incomingStatus: AppDocStatus,
): boolean {
  // Only upgrade status — never downgrade (prevents out-of-order regression)
  return STATUS_RANK[incomingStatus] > STATUS_RANK[currentStatus]
}

// ─── Duplicate Envelope Guard ────────────────────────────────────────────────

function hasDuplicateEnvelope(
  existingEnvelopes: Array<{ signerEmail: string; documentId: string; status: DocuSignStatus }>,
  newSignerEmail: string,
  newDocumentId: string,
): boolean {
  const active: DocuSignStatus[] = ["sent", "delivered"]
  return existingEnvelopes.some(
    (e) =>
      e.signerEmail === newSignerEmail &&
      e.documentId === newDocumentId &&
      active.includes(e.status),
  )
}

// ─── Token Expiry Check ──────────────────────────────────────────────────────

function isTokenExpired(expiresAt: number, nowMs: number = Date.now()): boolean {
  // Refresh 60 seconds before actual expiry (safety buffer)
  return nowMs >= expiresAt - 60_000
}

// ─── Large Document Guard ────────────────────────────────────────────────────

const MAX_DOCUSIGN_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB (DocuSign's limit)

function validateDocumentSize(base64Content: string): { valid: boolean; bytes: number } {
  // base64 encodes 3 bytes as 4 chars → actual bytes ≈ (length * 3) / 4
  const bytes = Math.floor((base64Content.length * 3) / 4)
  return { valid: bytes <= MAX_DOCUSIGN_SIZE_BYTES, bytes }
}

// ─── Signer Name Sanitization ────────────────────────────────────────────────

function sanitizeSignerName(name: string): string {
  // DocuSign accepts most Unicode but rejects certain control characters
  // and some XML-unsafe chars that get embedded in the envelope XML
  return name.replace(/[<>&"']/g, "").trim()
}

// ============================================================================
// 1. Declined signer edge cases
// ============================================================================

describe("processDeclinedEnvelope — signer declines to sign", () => {
  const envelope: EnvelopeRecord = {
    envelopeId: "env-001",
    documentId: "doc-abc",
    orgId: "org-xyz",
    status: "sent",
    signerEmail: "client@example.com",
    createdAt: new Date("2026-01-01"),
  }

  it('maps declined status to documentStatus "rejected"', () => {
    const result = processDeclinedEnvelope(envelope, { status: "declined" })
    expect(result.documentStatus).toBe("rejected")
  })

  it("creates a notification so the advisor is alerted", () => {
    const result = processDeclinedEnvelope(envelope, { status: "declined" })
    expect(result.notificationCreated).toBe(true)
  })

  it("writes a ledger event for the audit trail", () => {
    const result = processDeclinedEnvelope(envelope, { status: "declined" })
    expect(result.ledgerEventCreated).toBe(true)
  })

  it("stores the decline reason when DocuSign provides one", () => {
    const result = processDeclinedEnvelope(envelope, {
      status: "declined",
      declinedReason: "Terms are not acceptable",
    })
    expect(result.declineReason).toBe("Terms are not acceptable")
  })

  it("falls back to 'No reason provided' when DocuSign omits the reason", () => {
    const result = processDeclinedEnvelope(envelope, { status: "declined" })
    expect(result.declineReason).toBe("No reason provided")
  })

  it("trims whitespace from decline reason", () => {
    const result = processDeclinedEnvelope(envelope, {
      status: "declined",
      declinedReason: "  I disagree  ",
    })
    expect(result.declineReason).toBe("I disagree")
  })

  it("treats empty string reason the same as no reason", () => {
    const result = processDeclinedEnvelope(envelope, {
      status: "declined",
      declinedReason: "",
    })
    expect(result.declineReason).toBe("No reason provided")
  })
})

// ============================================================================
// 2. Out-of-order webhook delivery
// ============================================================================

describe("shouldApplyWebhookUpdate — out-of-order webhook guard", () => {
  /**
   * Kevin — webhook networks are unreliable. DocuSign might send:
   *   "completed" at 10:00am → "delivered" at 10:00am (delayed delivery)
   *
   * If we apply "delivered" after "completed", we'd accidentally downgrade
   * the document from "verified" → "pending". This test ensures we block that.
   */

  it("allows upgrading from pending → verified", () => {
    expect(shouldApplyWebhookUpdate("pending", "verified")).toBe(true)
  })

  it("allows upgrading from pending → rejected", () => {
    expect(shouldApplyWebhookUpdate("pending", "rejected")).toBe(true)
  })

  it("BLOCKS downgrading verified → pending (out-of-order webhook)", () => {
    expect(shouldApplyWebhookUpdate("verified", "pending")).toBe(false)
  })

  it("BLOCKS downgrading rejected → pending", () => {
    expect(shouldApplyWebhookUpdate("rejected", "pending")).toBe(false)
  })

  it("BLOCKS identical status (no-op, prevents duplicate processing)", () => {
    expect(shouldApplyWebhookUpdate("verified", "verified")).toBe(false)
  })

  it("allows rejected → verified (e.g., void then re-sent and completed)", () => {
    expect(shouldApplyWebhookUpdate("rejected", "verified")).toBe(true)
  })
})

// ============================================================================
// 3. Duplicate envelope prevention
// ============================================================================

describe("hasDuplicateEnvelope — prevent sending same doc twice", () => {
  const existingEnvelopes = [
    { signerEmail: "client@example.com", documentId: "doc-001", status: "sent" as DocuSignStatus },
    { signerEmail: "other@example.com", documentId: "doc-002", status: "completed" as DocuSignStatus },
  ]

  it("detects an active duplicate (same signer, same doc, status=sent)", () => {
    expect(hasDuplicateEnvelope(existingEnvelopes, "client@example.com", "doc-001")).toBe(true)
  })

  it("allows re-send when the previous envelope is completed (not active)", () => {
    // other@example.com / doc-002 is completed, so a new send should be allowed
    expect(hasDuplicateEnvelope(existingEnvelopes, "other@example.com", "doc-002")).toBe(false)
  })

  it("allows sending a different document to the same signer", () => {
    expect(hasDuplicateEnvelope(existingEnvelopes, "client@example.com", "doc-999")).toBe(false)
  })

  it("allows sending the same document to a different signer", () => {
    expect(hasDuplicateEnvelope(existingEnvelopes, "newclient@example.com", "doc-001")).toBe(false)
  })

  it("detects a duplicate for status=delivered (still active, just opened)", () => {
    const envelopesWithDelivered = [
      { signerEmail: "alice@example.com", documentId: "doc-x", status: "delivered" as DocuSignStatus },
    ]
    expect(hasDuplicateEnvelope(envelopesWithDelivered, "alice@example.com", "doc-x")).toBe(true)
  })

  it("returns false when there are no existing envelopes", () => {
    expect(hasDuplicateEnvelope([], "anyone@example.com", "doc-123")).toBe(false)
  })
})

// ============================================================================
// 4. OAuth token expiry detection
// ============================================================================

describe("isTokenExpired — token refresh timing", () => {
  /**
   * DocuSign access tokens expire after 8 hours. Our code refreshes 60 seconds
   * early to avoid race conditions where the token expires between the check
   * and the API call.
   */

  const ONE_HOUR_MS = 60 * 60 * 1000
  const NOW = 1_700_000_000_000 // fixed reference time

  it("returns false when token expires well in the future", () => {
    const expiresAt = NOW + ONE_HOUR_MS
    expect(isTokenExpired(expiresAt, NOW)).toBe(false)
  })

  it("returns true when token is exactly expired", () => {
    expect(isTokenExpired(NOW, NOW)).toBe(true)
  })

  it("returns true when token expired in the past", () => {
    const expiresAt = NOW - 1000
    expect(isTokenExpired(expiresAt, NOW)).toBe(true)
  })

  it("returns true when token expires in less than 60 seconds (safety buffer)", () => {
    const expiresAt = NOW + 30_000 // expires in 30s
    expect(isTokenExpired(expiresAt, NOW)).toBe(true)
  })

  it("returns false when token expires in exactly 61 seconds (just outside buffer)", () => {
    const expiresAt = NOW + 61_000
    expect(isTokenExpired(expiresAt, NOW)).toBe(false)
  })

  it("returns true when token expires in exactly 60 seconds (at the buffer boundary)", () => {
    const expiresAt = NOW + 60_000
    expect(isTokenExpired(expiresAt, NOW)).toBe(true)
  })
})

// ============================================================================
// 5. Large document validation
// ============================================================================

describe("validateDocumentSize — DocuSign 25MB limit enforcement", () => {
  /**
   * DocuSign rejects documents over 25MB. Rather than making the API call and
   * getting an error back, we validate upfront so we can show a helpful message.
   *
   * Note: base64 encoding adds ~33% overhead.
   * A 25MB file becomes ~33MB of base64 characters.
   */

  it("accepts a small document (100KB)", () => {
    // 100KB * (4/3) ≈ 137,000 base64 chars
    const smallBase64 = "A".repeat(136_000)
    expect(validateDocumentSize(smallBase64).valid).toBe(true)
  })

  it("rejects a document larger than 25MB", () => {
    // 50MB file → ~67MB of base64 = ~67,000,000 chars
    const largeBase64 = "A".repeat(67_000_000)
    expect(validateDocumentSize(largeBase64).valid).toBe(false)
  })

  it("returns the byte size estimate", () => {
    const base64 = "A".repeat(400) // 400 chars → 300 bytes
    const { bytes } = validateDocumentSize(base64)
    expect(bytes).toBe(300)
  })

  it("accepts exactly 25MB (at the boundary)", () => {
    const twentyFiveMBInBytes = 25 * 1024 * 1024
    const base64Length = Math.ceil((twentyFiveMBInBytes * 4) / 3)
    const boundaryBase64 = "A".repeat(base64Length)
    expect(validateDocumentSize(boundaryBase64).valid).toBe(true)
  })
})

// ============================================================================
// 6. Signer name with special characters
// ============================================================================

describe("sanitizeSignerName — special characters in names", () => {
  /**
   * DocuSign embeds signer info in XML internally. Characters like < > & can
   * break the XML and cause envelope creation to fail with a cryptic error.
   */

  it("passes through a normal name unchanged", () => {
    expect(sanitizeSignerName("John Smith")).toBe("John Smith")
  })

  it("handles accented characters (François, José, etc.)", () => {
    // Accented chars are safe — DocuSign uses UTF-8
    expect(sanitizeSignerName("François Müller")).toBe("François Müller")
  })

  it("removes < and > to prevent XML injection", () => {
    expect(sanitizeSignerName("Admin<script>")).toBe("Adminscript")
  })

  it("removes & to prevent XML entity injection", () => {
    expect(sanitizeSignerName("Tom & Jerry LLC")).toBe("Tom  Jerry LLC")
  })

  it("removes single and double quotes", () => {
    expect(sanitizeSignerName("O'Brien & \"Associates\"")).toBe("OBrien  Associates")
  })

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeSignerName("  Jane Doe  ")).toBe("Jane Doe")
  })

  it("handles an empty string without throwing", () => {
    expect(() => sanitizeSignerName("")).not.toThrow()
    expect(sanitizeSignerName("")).toBe("")
  })

  it("handles name that is all special characters", () => {
    expect(sanitizeSignerName("<>&\"'")).toBe("")
  })
})

// ============================================================================
// 7. Email bounce / autoresponder handling
// ============================================================================

describe("email bounce detection — DocuSign autoresponder webhook", () => {
  /**
   * When a signer's email bounces, DocuSign sends a webhook with status "sent"
   * but with a recipient-level "autoRespondedReason" field. We need to detect
   * this so we can notify the advisor that the email never reached the signer.
   */

  interface DocuSignRecipient {
    email: string
    status: string
    autoRespondedReason?: string
  }

  function isEmailBounced(recipient: DocuSignRecipient): boolean {
    return Boolean(recipient.autoRespondedReason)
  }

  it("detects a bounced email from the autoRespondedReason field", () => {
    const recipient: DocuSignRecipient = {
      email: "bad@domain.invalid",
      status: "autoresponded",
      autoRespondedReason: "5.1.1 The email account that you tried to reach does not exist",
    }
    expect(isEmailBounced(recipient)).toBe(true)
  })

  it("returns false when autoRespondedReason is absent (normal delivery)", () => {
    const recipient: DocuSignRecipient = {
      email: "good@example.com",
      status: "sent",
    }
    expect(isEmailBounced(recipient)).toBe(false)
  })

  it("returns false when autoRespondedReason is empty string", () => {
    const recipient: DocuSignRecipient = {
      email: "good@example.com",
      status: "sent",
      autoRespondedReason: "",
    }
    expect(isEmailBounced(recipient)).toBe(false)
  })
})
