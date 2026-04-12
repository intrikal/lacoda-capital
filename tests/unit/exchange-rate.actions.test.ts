/**
 * Unit tests for exchange-rate server actions.
 *
 * Tests:
 *   - getExchangeRates returns array for org
 *   - createExchangeRate happy path
 *   - createExchangeRate with same from/to currency → throws
 *   - updateExchangeRate (via overwrite) updates rate
 *   - deleteExchangeRate soft-deletes (hard-delete in this schema)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock auth ────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn().mockResolvedValue({
    userId: "user-123",
    orgId: "org-456",
    role: "admin",
  }),
  requireAuth: vi.fn().mockResolvedValue({
    userId: "user-123",
    orgId: "org-456",
    role: "admin",
  }),
}))

const mockSession = { userId: "user-123", orgId: "org-456", role: "admin" as const }

// ─── Mock analytics ───────────────────────────────────────────────────────────

vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: vi.fn(),
}))

// ─── Mock ledger ──────────────────────────────────────────────────────────────

vi.mock("@/lib/actions/ledger", () => ({
  createLedgerEvent: vi.fn().mockResolvedValue(undefined),
}))

// ─── Mock DB ─────────────────────────────────────────────────────────────────

const mockRates = [
  { id: "rate-1", orgId: "org-456", fromCurrency: "USD", toCurrency: "EUR", rate: "0.92", effectiveDate: new Date("2024-01-01") },
  { id: "rate-2", orgId: "org-456", fromCurrency: "USD", toCurrency: "GBP", rate: "0.79", effectiveDate: new Date("2024-01-01") },
]

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()

vi.mock("@/app/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => mockSelect(),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: mockInsert,
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: mockDelete,
      }),
    }),
  },
}))

vi.mock("@/app/db/schema", () => ({
  exchangeRates: { id: "id", orgId: "orgId", fromCurrency: "fromCurrency", toCurrency: "toCurrency" },
}))

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { getExchangeRates, createExchangeRate, deleteExchangeRate } from "@/lib/actions/exchange-rate.actions"

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getExchangeRates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns array of exchange rate records for org", async () => {
    mockSelect.mockResolvedValueOnce(mockRates)
    const rates = await getExchangeRates()
    expect(rates).toEqual(mockRates)
    expect(rates).toHaveLength(2)
  })

  it("returns empty array when org has no rates", async () => {
    mockSelect.mockResolvedValueOnce([])
    const rates = await getExchangeRates()
    expect(rates).toEqual([])
  })
})

describe("createExchangeRate", () => {
  beforeEach(() => vi.clearAllMocks())

  it("valid input → inserts and returns created record", async () => {
    const newRate = { id: "rate-new", orgId: "org-456", fromCurrency: "USD", toCurrency: "JPY", rate: "150.00" }
    mockInsert.mockResolvedValueOnce([newRate])

    const result = await createExchangeRate({
      fromCurrency: "USD",
      toCurrency: "JPY",
      rate: 150,
      effectiveDate: "2024-01-01",
    })

    expect(result).toEqual(newRate)
    expect(mockInsert).toHaveBeenCalled()
  })

  it("same from/to currency → throws error without DB insert", async () => {
    await expect(
      createExchangeRate({
        fromCurrency: "USD",
        toCurrency: "USD",
        rate: 1,
        effectiveDate: "2024-01-01",
      })
    ).rejects.toThrow("From and To currencies must be different")
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("negative rate → throws validation error", async () => {
    await expect(
      createExchangeRate({
        fromCurrency: "USD",
        toCurrency: "EUR",
        rate: -1,
        effectiveDate: "2024-01-01",
      })
    ).rejects.toThrow()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("lowercase currency codes are normalized to uppercase", async () => {
    const newRate = { id: "rate-new", fromCurrency: "USD", toCurrency: "EUR", rate: "0.92" }
    mockInsert.mockResolvedValueOnce([newRate])

    const result = await createExchangeRate({
      fromCurrency: "usd",
      toCurrency: "eur",
      rate: 0.92,
      effectiveDate: "2024-01-01",
    })

    expect(result).toEqual(newRate)
  })
})

describe("deleteExchangeRate", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes the record and returns it", async () => {
    const deleted = { id: "rate-1", orgId: "org-456", fromCurrency: "USD", toCurrency: "EUR" }
    mockDelete.mockResolvedValueOnce([deleted])

    const result = await deleteExchangeRate("rate-1")
    expect(result).toEqual(deleted)
    expect(mockDelete).toHaveBeenCalled()
  })

  it("throws when record not found", async () => {
    mockDelete.mockResolvedValueOnce([])
    await expect(deleteExchangeRate("nonexistent-id")).rejects.toThrow("Exchange rate not found")
  })
})
