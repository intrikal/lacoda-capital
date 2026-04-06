/**
 * ============================================================================
 * INTEGRATION TESTS: kyc-actions.test.ts
 * ============================================================================
 *
 * Tests KYC/AML server actions with mocked DB and auth.
 *
 * Coverage:
 *   - listKycRecords: all records for org, ordered by status + nextReviewDue
 *   - getKycRecord: by clientId, null when not found
 *   - getOverdueKycReviews: only records past nextReviewDue
 *   - upsertKycRecord: insert + onConflictDoUpdate
 *   - completeKycReview: sets lastReviewedAt + nextReviewDue, schedules renewal
 *   - recordAmlScreening: updates AML fields, creates ledger event when flagged
 *   - Org isolation, ledger events, idempotency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mock DB ─────────────────────────────────────────────────────────────────

const mockReturning = vi.fn()
const mockOnConflict = vi.fn().mockReturnValue({ returning: mockReturning })
const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict })
const mockInsert = vi.fn().mockReturnValue({ values: mockValues })
const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })
const mockOrderBy = vi.fn()
const mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere })
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom })
const mockFindFirst = vi.fn()

vi.mock("@/app/db", () => ({
  db: {
    insert: (...a: unknown[]) => mockInsert(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    select: (...a: unknown[]) => mockSelect(...a),
    query: {
      kycRecords: { findFirst: (...a: unknown[]) => mockFindFirst(...a) },
    },
  },
}))

vi.mock("@/app/db/schema", () => ({
  kycRecords: {
    id: "id", orgId: "org_id", clientId: "client_id",
    status: "status", amlStatus: "aml_status",
    nextReviewDue: "next_review_due", assignedTo: "assigned_to",
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => `eq(${val})`),
  and: vi.fn((...args) => `and(${args.join(",")})`),
  lte: vi.fn((_col, val) => `lte(${val})`),
  isNull: vi.fn(() => "isNull"),
}))

const mockSession = vi.hoisted(() => ({
  userId: "compliance-officer-1",
  orgId: "org-001",
  memberId: "member-001",
  role: "admin" as const,
  email: "compliance@firm.com",
}))

vi.mock("@/lib/auth", () => ({ requireAdvisor: vi.fn().mockResolvedValue(mockSession) }))

const mockCreateLedgerEvent = vi.fn().mockResolvedValue(undefined)
const mockCaptureEvent = vi.fn()

vi.mock("@/lib/actions/ledger", () => ({ createLedgerEvent: (...a: unknown[]) => mockCreateLedgerEvent(...a) }))
vi.mock("@/lib/analytics/server", () => ({ captureServerEvent: (...a: unknown[]) => mockCaptureEvent(...a) }))

import {
  listKycRecords,
  getKycRecord,
  getOverdueKycReviews,
  upsertKycRecord,
  completeKycReview,
  recordAmlScreening,
} from "@/lib/actions/kyc.actions"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const KYC_RECORD = {
  id: "kyc-001",
  orgId: "org-001",
  clientId: "client-001",
  assignedTo: "compliance-officer-1",
  status: "approved" as const,
  tier: "standard" as const,
  identityVerified: true,
  identityVerifiedAt: new Date("2024-06-01"),
  identityDocumentType: "passport",
  identityDocumentExpiry: new Date("2029-06-01"),
  beneficialOwnershipVerified: true,
  beneficialOwnershipNotes: null,
  sourceOfFundsVerified: true,
  sourceOfFundsDescription: "Employment income",
  amlStatus: "clear" as const,
  amlScreenedAt: new Date("2024-06-01"),
  amlRiskScore: 12,
  pepStatus: false,
  sanctionsMatch: false,
  adverseMediaFlag: false,
  lastReviewedAt: new Date("2024-10-15"),
  nextReviewDue: new Date("2025-10-15"),
  reviewFrequencyDays: 365,
  notes: null,
  metadata: null,
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-10-15"),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockReturning.mockResolvedValue([KYC_RECORD])
  mockOrderBy.mockResolvedValue([KYC_RECORD])
  mockFindFirst.mockResolvedValue(KYC_RECORD)
})

afterEach(() => vi.clearAllMocks())

// ─── listKycRecords ───────────────────────────────────────────────────────────

describe("listKycRecords", () => {
  it("queries by orgId for tenant isolation", async () => {
    await listKycRecords()
    const { eq } = await import("drizzle-orm")
    expect(eq).toHaveBeenCalledWith(expect.anything(), "org-001")
  })

  it("returns all KYC records", async () => {
    const results = await listKycRecords()
    expect(results).toEqual([KYC_RECORD])
  })

  it("orders results (by status and nextReviewDue)", async () => {
    await listKycRecords()
    expect(mockOrderBy).toHaveBeenCalled()
  })
})

// ─── getKycRecord ─────────────────────────────────────────────────────────────

describe("getKycRecord", () => {
  it("returns the KYC record for a known client", async () => {
    const result = await getKycRecord("client-001")
    expect(result).toEqual(KYC_RECORD)
  })

  it("returns null when no record exists", async () => {
    mockFindFirst.mockResolvedValueOnce(undefined)
    expect(await getKycRecord("unknown-client")).toBeNull()
  })

  it("filters by both orgId and clientId", async () => {
    await getKycRecord("client-001")
    const { and } = await import("drizzle-orm")
    expect(and).toHaveBeenCalled()
  })
})

// ─── getOverdueKycReviews ─────────────────────────────────────────────────────

describe("getOverdueKycReviews", () => {
  it("uses lte to find records where nextReviewDue <= now", async () => {
    await getOverdueKycReviews()
    const { lte } = await import("drizzle-orm")
    expect(lte).toHaveBeenCalledWith(expect.anything(), expect.any(Date))
  })

  it("returns only overdue records", async () => {
    const overdue = { ...KYC_RECORD, nextReviewDue: new Date("2024-01-01") }
    mockOrderBy.mockResolvedValueOnce([overdue])

    const results = await getOverdueKycReviews()
    expect(results).toHaveLength(1)
    expect(results[0].nextReviewDue).toEqual(overdue.nextReviewDue)
  })

  it("returns empty array when no overdue records", async () => {
    mockOrderBy.mockResolvedValueOnce([])
    expect(await getOverdueKycReviews()).toHaveLength(0)
  })
})

// ─── upsertKycRecord ──────────────────────────────────────────────────────────

describe("upsertKycRecord", () => {
  const input = {
    clientId: "client-001",
    assignedTo: "compliance-officer-1" as string | null,
    status: "approved" as const,
    tier: "standard" as const,
    identityVerified: true,
    identityVerifiedAt: new Date("2024-06-01") as Date | null,
    identityDocumentType: "passport" as string | null,
    identityDocumentExpiry: new Date("2029-06-01") as Date | null,
    beneficialOwnershipVerified: true,
    beneficialOwnershipNotes: null as string | null,
    sourceOfFundsVerified: true,
    sourceOfFundsDescription: null as string | null,
    amlStatus: "clear" as const,
    amlScreenedAt: null as Date | null,
    amlRiskScore: 12 as number | null,
    pepStatus: false,
    sanctionsMatch: false,
    adverseMediaFlag: false,
    lastReviewedAt: null as Date | null,
    nextReviewDue: null as Date | null,
    reviewFrequencyDays: 365 as number | null,
    notes: null as string | null,
    metadata: null,
  }

  it("inserts with orgId from session", async () => {
    await upsertKycRecord(input)
    expect(mockInsert).toHaveBeenCalled()
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-001", clientId: "client-001" })
    )
  })

  it("uses onConflictDoUpdate to prevent duplicates", async () => {
    await upsertKycRecord(input)
    expect(mockOnConflict).toHaveBeenCalled()
  })

  it("creates a ledger event", async () => {
    await upsertKycRecord(input)
    expect(mockCreateLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "updated", targetType: "client", targetId: "client-001" })
    )
  })

  it("captures analytics event", async () => {
    await upsertKycRecord(input)
    expect(mockCaptureEvent).toHaveBeenCalledWith(
      "compliance-officer-1",
      "kyc.record_upserted",
      expect.objectContaining({ client_id: "client-001" })
    )
  })
})

// ─── completeKycReview ────────────────────────────────────────────────────────

describe("completeKycReview", () => {
  it("sets lastReviewedAt to now", async () => {
    const before = Date.now()
    await completeKycReview("client-001", { status: "approved" })
    const after = Date.now()

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ lastReviewedAt: expect.any(Date) })
    )

    const setArg = mockSet.mock.calls[0][0]
    expect(setArg.lastReviewedAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(setArg.lastReviewedAt.getTime()).toBeLessThanOrEqual(after)
  })

  it("schedules next review based on default frequency (365 days)", async () => {
    await completeKycReview("client-001", { status: "approved" })

    const setArg = mockSet.mock.calls[0][0]
    const diff = (setArg.nextReviewDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    expect(diff).toBeCloseTo(365, 0)
  })

  it("schedules next review based on custom frequency", async () => {
    await completeKycReview("client-001", { status: "approved", nextReviewDays: 180 })

    const setArg = mockSet.mock.calls[0][0]
    const diff = (setArg.nextReviewDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    expect(diff).toBeCloseTo(180, 0)
  })

  it("assigns reviewer to current user from session", async () => {
    await completeKycReview("client-001", { status: "approved" })
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: "compliance-officer-1" })
    )
  })

  it("throws when KYC record not found", async () => {
    mockReturning.mockResolvedValueOnce([])
    await expect(
      completeKycReview("unknown-client", { status: "approved" })
    ).rejects.toThrow("KYC record not found")
  })

  it("creates a ledger event with review outcome", async () => {
    await completeKycReview("client-001", { status: "approved" })
    expect(mockCreateLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          type: "kyc_review_completed",
          outcome: "approved",
        }),
      })
    )
  })

  it("sets notes when provided", async () => {
    await completeKycReview("client-001", { status: "approved", notes: "All documents verified" })
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "All documents verified" })
    )
  })
})

// ─── recordAmlScreening ───────────────────────────────────────────────────────

describe("recordAmlScreening", () => {
  it("updates AML status and screening timestamp", async () => {
    const before = Date.now()
    await recordAmlScreening("client-001", { amlStatus: "clear", amlRiskScore: 12 })
    const after = Date.now()

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        amlStatus: "clear",
        amlRiskScore: 12,
        amlScreenedAt: expect.any(Date),
      })
    )

    const setArg = mockSet.mock.calls[0][0]
    expect(setArg.amlScreenedAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(setArg.amlScreenedAt.getTime()).toBeLessThanOrEqual(after)
  })

  it("does NOT create a ledger event for a 'clear' result", async () => {
    await recordAmlScreening("client-001", { amlStatus: "clear" })
    expect(mockCreateLedgerEvent).not.toHaveBeenCalled()
  })

  it("creates a ledger event when AML status is 'flagged'", async () => {
    mockReturning.mockResolvedValueOnce([{ ...KYC_RECORD, amlStatus: "flagged" }])
    await recordAmlScreening("client-001", { amlStatus: "flagged", amlRiskScore: 88 })
    expect(mockCreateLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ type: "aml_alert", amlStatus: "flagged" }),
      })
    )
  })

  it("creates a ledger event when sanctions match is found", async () => {
    mockReturning.mockResolvedValueOnce([{ ...KYC_RECORD, sanctionsMatch: true }])
    await recordAmlScreening("client-001", { amlStatus: "clear", sanctionsMatch: true })
    expect(mockCreateLedgerEvent).toHaveBeenCalled()
  })

  it("creates a ledger event when PEP is detected", async () => {
    mockReturning.mockResolvedValueOnce([{ ...KYC_RECORD, pepStatus: true }])
    await recordAmlScreening("client-001", { amlStatus: "review", pepStatus: true })
    expect(mockCreateLedgerEvent).toHaveBeenCalled()
  })

  it("throws when KYC record not found", async () => {
    mockReturning.mockResolvedValueOnce([])
    await expect(
      recordAmlScreening("nonexistent", { amlStatus: "clear" })
    ).rejects.toThrow("KYC record not found")
  })

  it("filters by orgId for tenant isolation", async () => {
    await recordAmlScreening("client-001", { amlStatus: "clear" })
    const { eq } = await import("drizzle-orm")
    expect(eq).toHaveBeenCalledWith(expect.anything(), "org-001")
  })
})
