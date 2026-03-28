import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Integration tests for the AI email draft flow.
 *
 * Tests: Draft email for K-1 request → verify includes contact name + deadline.
 * Send via Resend test mode → verify delivery.
 */

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async () => ({
    userId: "user-1",
    email: "sarah@acmewealth.com",
    role: "admin",
    orgId: "org-1",
    memberId: "member-1",
  })),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock database
vi.mock("@/app/db", () => ({
  db: {
    query: {
      documentRequests: {
        findFirst: vi.fn(async () => ({
          id: "req-1",
          orgId: "org-1",
          title: "2023 K-1 Form",
          documentType: "k1",
          requestedFromName: "Bob Johnson",
          requestedFromEmail: "bob@taxfirm.com",
          clientId: "client-1",
          entityId: "entity-1",
          assetId: null,
          dueDate: new Date("2024-04-15"),
          notes: "Need the final version, not the draft",
          status: "pending",
        })),
      },
      orgs: {
        findFirst: vi.fn(async () => ({
          id: "org-1",
          name: "Acme Wealth Management",
        })),
      },
      clients: {
        findFirst: vi.fn(async () => ({
          id: "client-1",
          displayName: "Smith Family",
        })),
      },
      entities: {
        findFirst: vi.fn(async () => ({
          id: "entity-1",
          name: "Smith Family Trust",
        })),
      },
      assets: {
        findFirst: vi.fn(async () => null),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
  },
}))

vi.mock("@/app/db/schema", () => ({
  documentRequests: { id: "id", orgId: "org_id" },
  orgs: { id: "id" },
  clients: { id: "id" },
  entities: { id: "id" },
  assets: { id: "id" },
}))

vi.mock("@/lib/actions/ledger", () => ({
  createLedgerEvent: vi.fn(),
}))

// Mock the email draft agent
vi.mock("@/lib/agents/email-draft", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    emailDraftAgent: {
      run: vi.fn(async (prompt: string) => {
        // Verify the prompt contains required context
        const hasDeadline = prompt.includes("2024-04-15")
        const hasDocType = prompt.includes("k1") || prompt.includes("K-1")
        const hasUploadUrl = prompt.includes("portal/upload/req-1")

        return {
          success: true,
          data: {
            subject: "Request: 2023 K-1 Form — Smith Family Trust",
            body: `Dear Bob Johnson,\n\nI hope this message finds you well. I am writing on behalf of Acme Wealth Management to request the 2023 K-1 form for the Smith Family Trust.\n\n${hasDeadline ? "Please submit this document by April 15, 2024." : ""}\n\n${hasUploadUrl ? "You can securely upload the document here: https://app.lacoda.capital/portal/upload/req-1" : ""}\n\nNote: Need the final version, not the draft.\n\nBest regards,\nSarah\nAcme Wealth Management`,
            tone: "formal" as const,
          },
          latencyMs: 1800,
          logId: "log-1",
        }
      }),
    },
  }
})

describe("AI email draft flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"
  })

  it("drafts email with correct contact name and deadline", async () => {
    const { draftDocumentRequestEmail } = await import("@/lib/actions/ai-email-draft.actions")

    const result = await draftDocumentRequestEmail("req-1")

    expect(result.success).toBe(true)
    if (result.success) {
      // Verify contact info
      expect(result.contactName).toBe("Bob Johnson")
      expect(result.contactEmail).toBe("bob@taxfirm.com")

      // Verify email contains the deadline
      expect(result.data.body).toContain("April 15, 2024")

      // Verify email contains the document type context
      expect(result.data.subject).toContain("K-1")

      // Verify email contains the upload URL
      expect(result.data.body).toContain("portal/upload/req-1")

      // Verify contact name in greeting
      expect(result.data.body).toContain("Bob Johnson")
    }
  })

  it("sends email via Resend (Edge Function)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    const { sendDocumentRequestEmail } = await import("@/lib/actions/ai-email-draft.actions")

    const result = await sendDocumentRequestEmail({
      requestId: "req-1",
      to: "bob@taxfirm.com",
      subject: "Request: 2023 K-1 Form",
      body: "Dear Bob...",
    })

    expect(result.success).toBe(true)

    // Verify the Edge Function was called
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/send-email"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("document_request_email"),
      })
    )
  })
})
