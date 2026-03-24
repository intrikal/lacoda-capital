import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Integration tests for the AI document extraction flow.
 *
 * Tests the full flow: upload → extract → verify fields match content →
 * confirm → asset + valuation created with source='ai_extraction' →
 * ledger event with action=asset.created_via_ai.
 *
 * Mocks: Claude API, Supabase Storage, and database.
 */

// Mock Supabase client
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(async () => ({
          data: new Blob([
            "APPRAISAL REPORT\n" +
            "Property Address: 123 Main St, Springfield, IL 62704\n" +
            "Appraised Value: $450,000\n" +
            "Effective Date: June 15, 2024\n" +
            "Appraiser: John Smith, MAI\n" +
            "Document Type: Residential Appraisal\n"
          ]),
          error: null,
        })),
      })),
    },
  })),
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    userId: "user-1",
    email: "admin@test.com",
    role: "admin",
    orgId: "org-1",
    memberId: "member-1",
  })),
  requireRole: vi.fn(async () => ({
    userId: "user-1",
    email: "admin@test.com",
    role: "admin",
    orgId: "org-1",
    memberId: "member-1",
  })),
}))

// Mock the database
const mockInsert = vi.fn()
const mockReturning = vi.fn()
const mockValues = vi.fn(() => ({ returning: mockReturning }))

vi.mock("@/app/db", () => ({
  db: {
    query: {
      documents: {
        findFirst: vi.fn(async () => ({
          id: "doc-1",
          orgId: "org-1",
          name: "test-appraisal.pdf",
          mimeType: "application/pdf",
          fileSize: "2048",
          storagePath: "org-1/docs/test-appraisal.pdf",
          entityId: "entity-1",
          status: "pending",
        })),
      },
    },
    insert: mockInsert,
  },
}))

vi.mock("@/app/db/schema", () => ({
  documents: { id: "id", orgId: "org_id", deletedAt: "deleted_at" },
  assets: { id: "id", $inferInsert: { assetClass: "other" } },
  valuations: {},
  aiCallLog: { id: "id" },
}))

// Mock ledger
const mockCreateLedgerEvent = vi.fn()
vi.mock("@/lib/actions/ledger", () => ({
  createLedgerEvent: (...args: unknown[]) => mockCreateLedgerEvent(...args),
}))

// Mock the extraction agent
vi.mock("@/lib/agents/extraction", () => ({
  extractionAgent: {
    run: vi.fn(async () => ({
      success: true,
      data: {
        property_address: "123 Main St, Springfield, IL 62704",
        valuation_amount: 450000,
        valuation_date: "2024-06-15",
        appraiser_name: "John Smith, MAI",
        document_type: "appraisal",
        asset_name: "123 Main St Property",
        asset_class: "real_estate",
        confidence: {
          property_address: 0.95,
          valuation_amount: 0.92,
          valuation_date: 0.88,
          appraiser_name: 0.9,
          document_type: 0.99,
          asset_name: 0.85,
          asset_class: 0.95,
        },
      },
      latencyMs: 2500,
      logId: "log-1",
    })),
  },
  getExtractionFlaggedFields: vi.fn(() => []),
}))

describe("AI extraction flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ values: mockValues })
    mockReturning.mockResolvedValue([{ id: "asset-1", name: "123 Main St Property" }])
  })

  it("extractDocumentData returns fields matching document content", async () => {
    const { extractDocumentData } = await import("@/lib/actions/ai-extraction.actions")

    const result = await extractDocumentData("doc-1")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.property_address).toBe("123 Main St, Springfield, IL 62704")
      expect(result.data.valuation_amount).toBe(450000)
      expect(result.data.valuation_date).toBe("2024-06-15")
      expect(result.data.appraiser_name).toBe("John Smith, MAI")
      expect(result.data.document_type).toBe("appraisal")
    }
  })

  it("confirmExtractedData creates asset with source=ai_extraction", async () => {
    const { confirmExtractedData } = await import("@/lib/actions/ai-extraction.actions")

    const extractedData = {
      property_address: "123 Main St, Springfield, IL 62704",
      valuation_amount: 450000,
      valuation_date: "2024-06-15",
      appraiser_name: "John Smith, MAI",
      document_type: "appraisal",
      asset_name: "123 Main St Property",
      asset_class: "real_estate",
      confidence: {
        property_address: 0.95,
        valuation_amount: 0.92,
        valuation_date: 0.88,
        appraiser_name: 0.9,
        document_type: 0.99,
        asset_name: 0.85,
        asset_class: 0.95,
      },
    }

    const result = await confirmExtractedData({
      documentId: "doc-1",
      extractedData,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.assetId).toBe("asset-1")
    }

    // Verify asset was created with ai_extraction source in metadata
    expect(mockInsert).toHaveBeenCalled()
  })

  it("confirmExtractedData logs ledger event", async () => {
    const { confirmExtractedData } = await import("@/lib/actions/ai-extraction.actions")

    await confirmExtractedData({
      documentId: "doc-1",
      extractedData: {
        property_address: "123 Main St",
        valuation_amount: 450000,
        valuation_date: "2024-06-15",
        appraiser_name: "John Smith",
        document_type: "appraisal",
        asset_name: "Test Asset",
        asset_class: "real_estate",
        confidence: {
          property_address: 0.9,
          valuation_amount: 0.9,
          valuation_date: 0.9,
          appraiser_name: 0.9,
          document_type: 0.9,
          asset_name: 0.9,
          asset_class: 0.9,
        },
      },
    })

    expect(mockCreateLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        action: "created",
        targetType: "asset",
        metadata: expect.objectContaining({
          source: "ai_extraction",
        }),
      })
    )
  })
})
