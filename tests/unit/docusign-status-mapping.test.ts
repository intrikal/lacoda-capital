/**
 * ============================================================================
 * TEST FILE: docusign-status-mapping.test.ts
 * ============================================================================
 *
 * Kevin, these tests cover how we translate DocuSign's envelope status strings
 * into states that make sense in our app (Vault document status, notifications,
 * ledger events, etc.).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHY STATUS MAPPING MATTERS                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ DocuSign uses its own status vocabulary:                                │
 * │   "sent"      — envelope created and emailed to signer                 │
 * │   "delivered" — signer OPENED the email/document (not yet signed!)     │
 * │   "completed" — every signer has signed                                │
 * │   "declined"  — a signer clicked "Decline to Sign"                     │
 * │   "voided"    — the sender cancelled the envelope                      │
 * │   "deleted"   — envelope removed from DocuSign UI                      │
 * │                                                                         │
 * │ Our app has its own document statuses in 00_enums.ts:                  │
 * │   "pending"   — uploaded, not yet reviewed                             │
 * │   "verified"  — signed/approved                                        │
 * │   "expired"   — past expiry date                                       │
 * │   "rejected"  — explicitly rejected                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/docusign.ts    — source of getEnvelopeStatus()
 *   app/db/schema/00_enums.ts       — documentStatusEnum
 */

import { describe, it, expect } from "vitest"

// ─── Status Mapping Logic ────────────────────────────────────────────────────
//
// This is the pure function we're testing. It converts a raw DocuSign envelope
// status string into our internal app vocabulary.
//
// In production this lives (or will live) in lib/integrations/docusign.ts.
// We define it inline here so the test file is self-contained and the mapping
// logic is crystal clear.

type DocuSignEnvelopeStatus =
  | "sent"
  | "delivered"
  | "completed"
  | "declined"
  | "voided"
  | "deleted"
  | string // catch-all for unknown future statuses

type AppDocumentStatus = "pending" | "verified" | "rejected" | "expired"

interface StatusMappingResult {
  /** Our internal document status */
  documentStatus: AppDocumentStatus
  /** Human-readable label shown in the UI */
  label: string
  /** Should we create a notification for this status change? */
  shouldNotify: boolean
  /** Should we write a ledger event? */
  shouldAudit: boolean
}

function mapDocuSignStatus(docusignStatus: DocuSignEnvelopeStatus): StatusMappingResult {
  switch (docusignStatus) {
    case "sent":
      return {
        documentStatus: "pending",
        label: "Awaiting Signature",
        shouldNotify: false,
        shouldAudit: true,
      }

    case "delivered":
      // "delivered" means the signer OPENED the document — not signed yet.
      // This is a common misconception: delivered ≠ signed.
      return {
        documentStatus: "pending",
        label: "Opened by Signer",
        shouldNotify: false,
        shouldAudit: false,
      }

    case "completed":
      // Every signer has signed — the document is now legally executed.
      return {
        documentStatus: "verified",
        label: "Signed",
        shouldNotify: true,
        shouldAudit: true,
      }

    case "declined":
      return {
        documentStatus: "rejected",
        label: "Declined to Sign",
        shouldNotify: true,
        shouldAudit: true,
      }

    case "voided":
      // Sender cancelled the envelope before all signers completed.
      return {
        documentStatus: "rejected",
        label: "Voided by Sender",
        shouldNotify: true,
        shouldAudit: true,
      }

    case "deleted":
      // Envelope deleted from DocuSign — rare, treat like voided.
      return {
        documentStatus: "rejected",
        label: "Deleted",
        shouldNotify: false,
        shouldAudit: true,
      }

    default:
      // DocuSign occasionally adds new statuses. Fail safe: keep as pending
      // so an advisor can manually review rather than silently lose data.
      return {
        documentStatus: "pending",
        label: `Unknown (${docusignStatus})`,
        shouldNotify: false,
        shouldAudit: true,
      }
  }
}

// ============================================================================
// 1. "sent" — envelope created, email dispatched to signer
// ============================================================================

describe('mapDocuSignStatus("sent")', () => {
  it('maps to documentStatus "pending"', () => {
    const result = mapDocuSignStatus("sent")
    expect(result.documentStatus).toBe("pending")
  })

  it('uses label "Awaiting Signature"', () => {
    const result = mapDocuSignStatus("sent")
    expect(result.label).toBe("Awaiting Signature")
  })

  it("does NOT trigger a notification (signer hasn't acted yet)", () => {
    const result = mapDocuSignStatus("sent")
    expect(result.shouldNotify).toBe(false)
  })

  it("DOES write a ledger event (audit trail for send action)", () => {
    const result = mapDocuSignStatus("sent")
    expect(result.shouldAudit).toBe(true)
  })
})

// ============================================================================
// 2. "delivered" — signer opened the document (NOT yet signed)
// ============================================================================

describe('mapDocuSignStatus("delivered")', () => {
  /**
   * Kevin — "delivered" is the most misunderstood DocuSign status.
   * It means the signer OPENED the email link and viewed the document.
   * It does NOT mean they signed it. Think of it like "read receipt" in email.
   */
  it('maps to documentStatus "pending" (still waiting for signature)', () => {
    const result = mapDocuSignStatus("delivered")
    expect(result.documentStatus).toBe("pending")
  })

  it('uses label "Opened by Signer"', () => {
    const result = mapDocuSignStatus("delivered")
    expect(result.label).toBe("Opened by Signer")
  })

  it("does NOT trigger a notification (intermediate state, not actionable)", () => {
    const result = mapDocuSignStatus("delivered")
    expect(result.shouldNotify).toBe(false)
  })

  it("does NOT write a ledger event (too noisy for intermediate states)", () => {
    const result = mapDocuSignStatus("delivered")
    expect(result.shouldAudit).toBe(false)
  })

  it("is DIFFERENT from completed (delivered ≠ signed)", () => {
    const delivered = mapDocuSignStatus("delivered")
    const completed = mapDocuSignStatus("completed")
    expect(delivered.documentStatus).not.toBe(completed.documentStatus)
  })
})

// ============================================================================
// 3. "completed" — all signers have signed
// ============================================================================

describe('mapDocuSignStatus("completed")', () => {
  it('maps to documentStatus "verified"', () => {
    const result = mapDocuSignStatus("completed")
    expect(result.documentStatus).toBe("verified")
  })

  it('uses label "Signed"', () => {
    const result = mapDocuSignStatus("completed")
    expect(result.label).toBe("Signed")
  })

  it("DOES trigger a notification (advisor needs to know it's signed)", () => {
    const result = mapDocuSignStatus("completed")
    expect(result.shouldNotify).toBe(true)
  })

  it("DOES write a ledger event (compliance audit trail)", () => {
    const result = mapDocuSignStatus("completed")
    expect(result.shouldAudit).toBe(true)
  })
})

// ============================================================================
// 4. "declined" — signer clicked "Decline to Sign"
// ============================================================================

describe('mapDocuSignStatus("declined")', () => {
  /**
   * A signer can actively refuse to sign. This is a deliberate action, not an
   * error. The advisor should be notified so they can follow up with the client.
   */
  it('maps to documentStatus "rejected"', () => {
    const result = mapDocuSignStatus("declined")
    expect(result.documentStatus).toBe("rejected")
  })

  it('uses label "Declined to Sign"', () => {
    const result = mapDocuSignStatus("declined")
    expect(result.label).toBe("Declined to Sign")
  })

  it("DOES trigger a notification (advisor must follow up)", () => {
    const result = mapDocuSignStatus("declined")
    expect(result.shouldNotify).toBe(true)
  })

  it("DOES write a ledger event", () => {
    const result = mapDocuSignStatus("declined")
    expect(result.shouldAudit).toBe(true)
  })
})

// ============================================================================
// 5. "voided" — sender cancelled the envelope
// ============================================================================

describe('mapDocuSignStatus("voided")', () => {
  /**
   * The person who SENT the envelope cancelled it. Common reasons:
   * - Wrong document sent
   * - Wrong signer email
   * - Deal fell through
   */
  it('maps to documentStatus "rejected"', () => {
    const result = mapDocuSignStatus("voided")
    expect(result.documentStatus).toBe("rejected")
  })

  it('uses label "Voided by Sender"', () => {
    const result = mapDocuSignStatus("voided")
    expect(result.label).toBe("Voided by Sender")
  })

  it("DOES trigger a notification", () => {
    const result = mapDocuSignStatus("voided")
    expect(result.shouldNotify).toBe(true)
  })

  it("DOES write a ledger event", () => {
    const result = mapDocuSignStatus("voided")
    expect(result.shouldAudit).toBe(true)
  })
})

// ============================================================================
// 6. "deleted" — envelope removed from DocuSign UI
// ============================================================================

describe('mapDocuSignStatus("deleted")', () => {
  /**
   * Deletion is unusual — advisors rarely delete envelopes. When it happens
   * via API or the DocuSign web UI, we treat it like a void.
   *
   * We do NOT send a notification because deletion often happens silently
   * during cleanup, not as a meaningful business event.
   */
  it('maps to documentStatus "rejected"', () => {
    const result = mapDocuSignStatus("deleted")
    expect(result.documentStatus).toBe("rejected")
  })

  it("does NOT trigger a notification (silent cleanup action)", () => {
    const result = mapDocuSignStatus("deleted")
    expect(result.shouldNotify).toBe(false)
  })

  it("DOES write a ledger event (we still need the audit trail)", () => {
    const result = mapDocuSignStatus("deleted")
    expect(result.shouldAudit).toBe(true)
  })
})

// ============================================================================
// 7. Unknown / future statuses
// ============================================================================

describe("mapDocuSignStatus — unknown status strings", () => {
  /**
   * DocuSign occasionally adds new envelope statuses. Rather than crashing
   * or silently ignoring them, we map unknowns to "pending" so an advisor
   * can review the document manually.
   */
  it('maps an unknown status to documentStatus "pending" (fail safe)', () => {
    const result = mapDocuSignStatus("processing")
    expect(result.documentStatus).toBe("pending")
  })

  it("includes the raw unknown status in the label for debugging", () => {
    const result = mapDocuSignStatus("processing")
    expect(result.label).toContain("processing")
  })

  it("does NOT notify for unknown statuses", () => {
    const result = mapDocuSignStatus("processing")
    expect(result.shouldNotify).toBe(false)
  })

  it("DOES audit unknown statuses (so we can investigate them later)", () => {
    const result = mapDocuSignStatus("processing")
    expect(result.shouldAudit).toBe(true)
  })

  it("handles empty string without throwing", () => {
    expect(() => mapDocuSignStatus("")).not.toThrow()
  })

  it("handles a completely random string without throwing", () => {
    expect(() => mapDocuSignStatus("banana")).not.toThrow()
  })

  it("maps each valid DocuSign terminal state to a non-pending status", () => {
    // Terminal statuses should never sit at "pending" — they are resolved
    const terminalStatuses = ["completed", "declined", "voided"] as const
    for (const status of terminalStatuses) {
      expect(mapDocuSignStatus(status).documentStatus).not.toBe("pending")
    }
  })
})
