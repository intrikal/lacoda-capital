/**
 * Unit tests for privacy / account deletion server actions.
 *
 * Tests:
 *   - requestAccountDeletion → creates deletion_request with 30-day scheduledFor
 *   - requestAccountDeletion when pending request exists → returns existing request
 *   - cancelAccountDeletion → sets cancelledAt
 *   - cancelAccountDeletion with no pending request → throws
 *   - getDeletionRequestStatus → returns current request info with daysRemaining
 *   - getDeletionRequestStatus with no request → returns null
 *   - getRetentionSettings → returns org retention config
 *   - updateRetentionSettings → updates org settings
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock auth ────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: "user-123", orgId: "org-456" }),
  requireRole: vi.fn().mockResolvedValue({ userId: "user-123", orgId: "org-456" }),
}))

// ─── Mock analytics ───────────────────────────────────────────────────────────

vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: vi.fn(),
}))

// ─── Mock ledger ──────────────────────────────────────────────────────────────

vi.mock("@/lib/actions/ledger", () => ({
  createLedgerEvent: vi.fn().mockResolvedValue(undefined),
}))

// ─── Mock DB ─────────────────────────────────────────────────────────────────

const mockFindFirst = vi.fn()
const mockInsertReturning = vi.fn()
const mockUpdate = vi.fn()

vi.mock("@/app/db", () => ({
  db: {
    query: {
      deletionRequests: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      orgs: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
    insert: () => ({
      values: () => ({
        returning: mockInsertReturning,
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockUpdate,
      }),
    }),
  },
}))

vi.mock("@/app/db/schema", () => ({
  users: {},
  orgMembers: {},
  deletionRequests: { userId: "userId", cancelledAt: "cancelledAt", completedAt: "completedAt", id: "id", scheduledFor: "scheduledFor" },
  orgs: { id: "id" },
}))

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionRequestStatus,
  getRetentionSettings,
  updateRetentionSettings,
} from "@/lib/actions/privacy.actions"

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("requestAccountDeletion", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a deletion request with 30-day scheduledFor", async () => {
    mockFindFirst.mockResolvedValueOnce(null) // no existing request

    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const newRequest = {
      id: "req-new",
      userId: "user-123",
      requestedAt: new Date(),
      scheduledFor,
    }
    mockInsertReturning.mockResolvedValueOnce([newRequest])
    mockUpdate.mockResolvedValueOnce([]) // ledger event update

    const result = await requestAccountDeletion()

    expect(result.id).toBe("req-new")
    expect(result.daysRemaining).toBe(30)
    expect(result.cancelledAt).toBeNull()
    expect(result.completedAt).toBeNull()
    expect(new Date(result.scheduledFor).getTime()).toBeGreaterThan(Date.now())
  })

  it("returns existing request when one is already pending", async () => {
    const existingScheduledFor = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
    mockFindFirst.mockResolvedValueOnce({
      id: "req-existing",
      userId: "user-123",
      requestedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      scheduledFor: existingScheduledFor,
      cancelledAt: null,
      completedAt: null,
    })

    const result = await requestAccountDeletion()

    expect(result.id).toBe("req-existing")
    expect(result.daysRemaining).toBeGreaterThanOrEqual(19)
    expect(result.daysRemaining).toBeLessThanOrEqual(21)
    expect(mockInsertReturning).not.toHaveBeenCalled()
  })
})

describe("cancelAccountDeletion", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sets cancelledAt on the pending request", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "req-1",
      userId: "user-123",
      scheduledFor: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      cancelledAt: null,
      completedAt: null,
    })
    mockUpdate.mockResolvedValueOnce([])

    const result = await cancelAccountDeletion()
    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("throws when no pending request exists", async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    await expect(cancelAccountDeletion()).rejects.toThrow("No pending deletion request found")
  })
})

describe("getDeletionRequestStatus", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns request info with daysRemaining when pending request exists", async () => {
    const scheduledFor = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    mockFindFirst.mockResolvedValueOnce({
      id: "req-1",
      requestedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      scheduledFor,
      cancelledAt: null,
      completedAt: null,
    })

    const result = await getDeletionRequestStatus()

    expect(result).not.toBeNull()
    expect(result!.id).toBe("req-1")
    expect(result!.daysRemaining).toBeGreaterThanOrEqual(14)
    expect(result!.daysRemaining).toBeLessThanOrEqual(16)
  })

  it("returns null when no pending request exists", async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    const result = await getDeletionRequestStatus()
    expect(result).toBeNull()
  })

  it("daysRemaining is 0 when grace period has passed", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "req-1",
      requestedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      scheduledFor: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      cancelledAt: null,
      completedAt: null,
    })

    const result = await getDeletionRequestStatus()
    expect(result!.daysRemaining).toBe(0)
  })
})

describe("getRetentionSettings", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns null values when org has no retention settings", async () => {
    mockFindFirst.mockResolvedValueOnce({ id: "org-456", settings: {} })

    const result = await getRetentionSettings()
    expect(result).toEqual({
      archiveRetentionMonths: null,
      deletedItemRetentionMonths: null,
    })
  })

  it("returns configured retention values from org settings", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "org-456",
      settings: {
        retention: {
          archiveRetentionMonths: 24,
          deletedItemRetentionMonths: 12,
        },
      },
    })

    const result = await getRetentionSettings()
    expect(result).toEqual({
      archiveRetentionMonths: 24,
      deletedItemRetentionMonths: 12,
    })
  })

  it("returns null values when no orgId on session", async () => {
    const { requireAuth } = await import("@/lib/auth")
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: "user-123", orgId: null })

    const result = await getRetentionSettings()
    expect(result).toEqual({
      archiveRetentionMonths: null,
      deletedItemRetentionMonths: null,
    })
  })
})

describe("updateRetentionSettings", () => {
  beforeEach(() => vi.clearAllMocks())

  it("updates org settings and returns success", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "org-456",
      settings: { someOtherSetting: true },
    })
    mockUpdate.mockResolvedValueOnce([]) // db update
    mockUpdate.mockResolvedValueOnce([]) // ledger event update

    const result = await updateRetentionSettings({
      archiveRetentionMonths: 36,
      deletedItemRetentionMonths: 18,
    })

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("throws when no orgId on session", async () => {
    const { requireAuth } = await import("@/lib/auth")
    vi.mocked(requireAuth).mockResolvedValueOnce({ userId: "user-123", orgId: null })

    await expect(
      updateRetentionSettings({ archiveRetentionMonths: 12, deletedItemRetentionMonths: 6 })
    ).rejects.toThrow("No org found")
  })
})
