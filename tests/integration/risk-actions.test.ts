/**
 * ============================================================================
 * INTEGRATION TESTS: risk-actions.test.ts
 * ============================================================================
 *
 * Tests risk profile server actions with mocked DB and auth.
 *
 * Coverage:
 *   - listRiskProfiles: returns all profiles for org, ordered by alert status
 *   - getRiskProfile: returns profile for client, null when not found
 *   - upsertRiskProfile: insert on first call, update on conflict
 *   - updateRiskMetrics: live metric updates, alert escalation
 *   - Ledger events created on mutations
 *   - Org isolation (cannot access another org's profiles)
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
      riskProfiles: { findFirst: (...a: unknown[]) => mockFindFirst(...a) },
    },
  },
}))

vi.mock("@/app/db/schema", () => ({
  riskProfiles: {
    id: "id", orgId: "org_id", clientId: "client_id",
    alertStatus: "alert_status", reviewedBy: "reviewed_by",
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => `eq(${val})`),
  and: vi.fn((...args) => `and(${args.join(",")})`),
}))

const mockSession = vi.hoisted(() => ({
  userId: "advisor-001",
  orgId: "org-001",
  memberId: "member-001",
  role: "admin" as const,
  email: "advisor@firm.com",
}))

vi.mock("@/lib/auth", () => ({ requireAdvisor: vi.fn().mockResolvedValue(mockSession) }))

const mockCreateLedgerEvent = vi.fn().mockResolvedValue(undefined)
const mockCaptureEvent = vi.fn()

vi.mock("@/lib/actions/ledger", () => ({ createLedgerEvent: (...a: unknown[]) => mockCreateLedgerEvent(...a) }))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: (...a: unknown[]) => mockCaptureEvent(...a) }))

import {
  listRiskProfiles,
  getRiskProfile,
  upsertRiskProfile,
  updateRiskMetrics,
} from "@/lib/actions/risk.actions"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROFILE = {
  id: "rp-001",
  orgId: "org-001",
  clientId: "client-001",
  reviewedBy: "advisor-001",
  riskTolerance: "moderate" as const,
  investmentHorizon: "10–15 years",
  maxDrawdown: "15.00",
  alertDrawdown: "12.00",
  currentDrawdown: "5.00",
  targetVolatility: "10.00",
  maxVolatility: "14.00",
  currentVolatility: "8.00",
  hedgeRatio: "25.00",
  hedgingInstruments: ["S&P 500 Put Options"],
  varConfidenceLevel: "95.00",
  varAmount: "82000.00",
  varHorizonDays: 1,
  alertStatus: "normal" as const,
  alertNotes: null,
  lastReviewedAt: new Date("2024-10-15"),
  nextReviewDue: new Date("2025-04-15"),
  notes: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockReturning.mockResolvedValue([PROFILE])
  mockOrderBy.mockResolvedValue([PROFILE])
  mockFindFirst.mockResolvedValue(PROFILE)
})

afterEach(() => vi.clearAllMocks())

// ─── listRiskProfiles ─────────────────────────────────────────────────────────

describe("listRiskProfiles", () => {
  it("queries profiles filtered by orgId", async () => {
    await listRiskProfiles()
    const { eq } = await import("drizzle-orm")
    expect(eq).toHaveBeenCalledWith(expect.anything(), "org-001")
  })

  it("orders by alertStatus so breaches appear first", async () => {
    await listRiskProfiles()
    await import("drizzle-orm")
    expect(mockOrderBy).toHaveBeenCalled()
  })

  it("returns the profiles list", async () => {
    const results = await listRiskProfiles()
    expect(results).toEqual([PROFILE])
  })
})

// ─── getRiskProfile ───────────────────────────────────────────────────────────

describe("getRiskProfile", () => {
  it("returns the profile for a known client", async () => {
    const result = await getRiskProfile("client-001")
    expect(result).toEqual(PROFILE)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    )
  })

  it("returns null when no profile exists", async () => {
    mockFindFirst.mockResolvedValueOnce(undefined)
    const result = await getRiskProfile("unknown-client")
    expect(result).toBeNull()
  })

  it("filters by both orgId and clientId", async () => {
    await getRiskProfile("client-001")
    const { and } = await import("drizzle-orm")
    expect(and).toHaveBeenCalled()
  })
})

// ─── upsertRiskProfile ────────────────────────────────────────────────────────

describe("upsertRiskProfile", () => {
  const input = {
    clientId: "client-001",
    reviewedBy: "advisor-001" as string | null,
    riskTolerance: "moderate" as const,
    investmentHorizon: "10–15 years" as string | null,
    maxDrawdown: "15.00" as string | null,
    alertDrawdown: "12.00" as string | null,
    currentDrawdown: null as string | null,
    targetVolatility: "10.00" as string | null,
    maxVolatility: "14.00" as string | null,
    currentVolatility: null as string | null,
    hedgeRatio: "25.00" as string | null,
    hedgingInstruments: null,
    varConfidenceLevel: "95.00" as string | null,
    varAmount: "82000.00" as string | null,
    varHorizonDays: 1 as number | null,
    alertStatus: "normal" as const,
    alertNotes: null as string | null,
    lastReviewedAt: null as Date | null,
    nextReviewDue: null as Date | null,
    notes: null as string | null,
    metadata: null,
  }

  it("inserts a new profile with orgId from session", async () => {
    await upsertRiskProfile(input)

    expect(mockInsert).toHaveBeenCalled()
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-001", clientId: "client-001" })
    )
  })

  it("uses onConflictDoUpdate (upsert) to prevent duplicates", async () => {
    await upsertRiskProfile(input)
    expect(mockOnConflict).toHaveBeenCalled()
  })

  it("creates a ledger event", async () => {
    await upsertRiskProfile(input)
    expect(mockCreateLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-001",
        action: "updated",
        targetType: "client",
        targetId: "client-001",
      })
    )
  })

  it("captures analytics event", async () => {
    await upsertRiskProfile(input)
    expect(mockCaptureEvent).toHaveBeenCalledWith(
      "advisor-001",
      "risk_profile.upserted",
      expect.objectContaining({ org_id: "org-001", client_id: "client-001" })
    )
  })

  it("returns the upserted profile", async () => {
    const result = await upsertRiskProfile(input)
    expect(result).toEqual(PROFILE)
  })
})

// ─── updateRiskMetrics ────────────────────────────────────────────────────────

describe("updateRiskMetrics", () => {
  it("updates currentDrawdown and alertStatus", async () => {
    mockReturning.mockResolvedValueOnce([{ ...PROFILE, currentDrawdown: "16.4", alertStatus: "breach" }])

    const result = await updateRiskMetrics("client-001", {
      currentDrawdown: "16.4",
      alertStatus: "breach",
    })

    expect(mockUpdate).toHaveBeenCalled()
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        currentDrawdown: "16.4",
        alertStatus: "breach",
        updatedAt: expect.any(Date),
      })
    )
    expect(result.currentDrawdown).toBe("16.4")
  })

  it("creates a ledger event when alertStatus is not 'normal'", async () => {
    mockReturning.mockResolvedValueOnce([{ ...PROFILE, alertStatus: "breach" }])

    await updateRiskMetrics("client-001", {
      alertStatus: "breach",
      currentDrawdown: "16.4",
    })

    expect(mockCreateLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ type: "risk_alert", alertStatus: "breach" }),
      })
    )
  })

  it("does NOT create a ledger event when alertStatus is 'normal'", async () => {
    mockReturning.mockResolvedValueOnce([{ ...PROFILE, alertStatus: "normal" }])

    await updateRiskMetrics("client-001", {
      alertStatus: "normal",
      currentDrawdown: "5.0",
    })

    expect(mockCreateLedgerEvent).not.toHaveBeenCalled()
  })

  it("throws when profile not found (empty returning)", async () => {
    mockReturning.mockResolvedValueOnce([])

    await expect(
      updateRiskMetrics("nonexistent-client", { currentDrawdown: "10.0" })
    ).rejects.toThrow("Risk profile not found")
  })

  it("filters update by orgId for tenant isolation", async () => {
    await updateRiskMetrics("client-001", { currentVolatility: "11.0" })
    const { eq } = await import("drizzle-orm")
    expect(eq).toHaveBeenCalledWith(expect.anything(), "org-001")
  })

  it("updates only currentVolatility without triggering alert event", async () => {
    mockReturning.mockResolvedValueOnce([{ ...PROFILE, currentVolatility: "11.5" }])

    await updateRiskMetrics("client-001", { currentVolatility: "11.5" })

    // No alertStatus provided — no ledger event
    expect(mockCreateLedgerEvent).not.toHaveBeenCalled()
  })
})
