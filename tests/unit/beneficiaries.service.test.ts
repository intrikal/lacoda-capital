/**
 * ============================================================================
 * TEST FILE: beneficiaries.service.test.ts
 * ============================================================================
 *
 * Kevin, this tests the beneficiaries service. The service now queries the
 * beneficiaries table in the database, so we mock the db to control what
 * rows are returned.
 *
 * RELATED FILES:
 *   lib/services/beneficiaries.service.ts  — service under test
 *   app/db/schema/beneficiaries.ts         — table definition
 *   lib/types/mock.ts                      — Beneficiary type
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ��── Mock the database ────────────────────────────────────────────────────
vi.mock("@/app/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  }
  return {
    db: {
      select: vi.fn(() => selectChain),
    },
  }
})

import { db } from "@/app/db"
import {
  getBeneficiaries,
  getBeneficiaryById,
  getBeneficiarySummary,
} from "@/lib/services/beneficiaries.service"

// ============================================================================
// FIXTURES — sample beneficiary DB rows
// ============================================================================

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ben-uuid-001",
    orgId: "org-uuid-001",
    clientId: "client-uuid-001",
    name: "Margaret Blackwood",
    relationship: "Spouse",
    designation: "primary",
    percentage: 60,
    accounts: ["Investment Account", "Retirement IRA"],
    ssnLast4: "4521",
    dateOfBirth: "1975-03-12",
    phone: "+1-212-555-1001",
    email: "margaret@blackwood.com",
    verified: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  }
}

/** Four beneficiary rows matching the old seed data's variety. */
const seedRows = [
  makeDbRow({
    id: "ben-uuid-001",
    name: "Margaret Blackwood",
    relationship: "Spouse",
    designation: "primary",
    percentage: 60,
    accounts: ["Investment Account", "Retirement IRA"],
    ssnLast4: "4521",
    dateOfBirth: "1975-03-12",
    phone: "+1-212-555-1001",
    email: "margaret@blackwood.com",
    verified: true,
  }),
  makeDbRow({
    id: "ben-uuid-002",
    name: "James Blackwood Jr.",
    relationship: "Child",
    designation: "primary",
    percentage: 20,
    accounts: ["Investment Account"],
    ssnLast4: "7834",
    dateOfBirth: "2001-07-22",
    phone: null,
    email: "james.jr@blackwood.com",
    verified: true,
  }),
  makeDbRow({
    id: "ben-uuid-003",
    name: "Sophie Blackwood",
    relationship: "Child",
    designation: "primary",
    percentage: 20,
    accounts: ["Investment Account"],
    ssnLast4: "9102",
    dateOfBirth: "2004-11-05",
    phone: null,
    email: null,
    verified: false,
  }),
  makeDbRow({
    id: "ben-uuid-004",
    name: "Blackwood Family Trust",
    relationship: "Trust",
    designation: "contingent",
    percentage: 100,
    accounts: ["Investment Account", "Retirement IRA"],
    ssnLast4: null,
    dateOfBirth: null,
    phone: null,
    email: null,
    verified: true,
  }),
]

// ============================================================================
// HELPER — drill into the mocked select chain
// ============================================================================

function getSelectChain() {
  return (db.select as ReturnType<typeof vi.fn>)()
}

// ============================================================================
// 1. getBeneficiaries — full list
// ============================================================================

describe("getBeneficiaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns all 4 beneficiaries", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const list = await getBeneficiaries()
    expect(list).toHaveLength(4)
  })

  it("every beneficiary has the required shape fields", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const list = await getBeneficiaries()
    for (const b of list) {
      expect(b.id).toBeDefined()
      expect(b.name).toBeDefined()
      expect(b.relationship).toBeDefined()
      expect(b.designation).toMatch(/^(primary|contingent)$/)
      expect(typeof b.percentage).toBe("number")
      expect(typeof b.verified).toBe("boolean")
    }
  })

  it("returns a copy of the data (not the same reference)", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const a = await getBeneficiaries()
    getSelectChain().where.mockResolvedValue(seedRows)
    const b = await getBeneficiaries()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it("contains both primary and contingent designations", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const list = await getBeneficiaries()
    const designations = new Set(list.map((b) => b.designation))
    expect(designations.has("primary")).toBe(true)
    expect(designations.has("contingent")).toBe(true)
  })

  it("returns empty array when no beneficiaries exist", async () => {
    getSelectChain().where.mockResolvedValue([])
    const list = await getBeneficiaries()
    expect(list).toEqual([])
  })
})

// ============================================================================
// 2. getBeneficiaryById — lookup by ID
// ============================================================================

describe("getBeneficiaryById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the correct beneficiary for a known id", async () => {
    getSelectChain().where.mockResolvedValue([seedRows[0]])
    const b = await getBeneficiaryById("ben-uuid-001")
    expect(b).toBeDefined()
    expect(b!.name).toBe("Margaret Blackwood")
  })

  it("returns undefined for an unknown id", async () => {
    getSelectChain().where.mockResolvedValue([])
    const b = await getBeneficiaryById("does-not-exist")
    expect(b).toBeUndefined()
  })

  it("returns the contingent beneficiary by id", async () => {
    getSelectChain().where.mockResolvedValue([seedRows[3]])
    const b = await getBeneficiaryById("ben-uuid-004")
    expect(b).toBeDefined()
    expect(b!.designation).toBe("contingent")
  })

  it("returns the correct beneficiary for each seed id", async () => {
    for (const row of seedRows) {
      getSelectChain().where.mockResolvedValue([row])
      const found = await getBeneficiaryById(row.id as string)
      expect(found).toBeDefined()
      expect(found!.id).toBe(row.id)
    }
  })
})

// ============================================================================
// 3. getBeneficiarySummary — computed aggregations
// ============================================================================

describe("getBeneficiarySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("primaryCount matches number of primary beneficiaries", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const list = await getBeneficiaries()
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getBeneficiarySummary()
    expect(summary.primaryCount).toBe(list.filter((b) => b.designation === "primary").length)
  })

  it("contingentCount matches number of contingent beneficiaries", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const list = await getBeneficiaries()
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getBeneficiarySummary()
    expect(summary.contingentCount).toBe(list.filter((b) => b.designation === "contingent").length)
  })

  it("unverifiedCount matches number of unverified beneficiaries", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const list = await getBeneficiaries()
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getBeneficiarySummary()
    expect(summary.unverifiedCount).toBe(list.filter((b) => !b.verified).length)
  })

  it("primaryTotal is the sum of primary percentages (should be 100)", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getBeneficiarySummary()
    expect(summary.primaryTotal).toBe(100)
  })

  it("primaryComplete is true when primary percentages sum to exactly 100", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getBeneficiarySummary()
    expect(summary.primaryComplete).toBe(true)
  })

  it("contingentTotal is the sum of contingent percentages", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const list = await getBeneficiaries()
    const expected = list
      .filter((b) => b.designation === "contingent")
      .reduce((sum, b) => sum + b.percentage, 0)
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getBeneficiarySummary()
    expect(summary.contingentTotal).toBe(expected)
  })

  it("contingentComplete is true when contingent percentages sum to 100 or 0", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getBeneficiarySummary()
    const isValid = summary.contingentTotal === 100 || summary.contingentTotal === 0
    expect(summary.contingentComplete).toBe(isValid)
  })

  it("all numeric summary fields are non-negative", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const summary = await getBeneficiarySummary()
    expect(summary.primaryCount).toBeGreaterThanOrEqual(0)
    expect(summary.contingentCount).toBeGreaterThanOrEqual(0)
    expect(summary.unverifiedCount).toBeGreaterThanOrEqual(0)
    expect(summary.primaryTotal).toBeGreaterThanOrEqual(0)
    expect(summary.contingentTotal).toBeGreaterThanOrEqual(0)
  })

  it("returns all-zero summary when no beneficiaries exist", async () => {
    getSelectChain().where.mockResolvedValue([])
    const summary = await getBeneficiarySummary()
    expect(summary.primaryCount).toBe(0)
    expect(summary.contingentCount).toBe(0)
    expect(summary.primaryTotal).toBe(0)
    expect(summary.primaryComplete).toBe(false)
  })
})

// ============================================================================
// 4. Error handling — database failures
// ============================================================================

describe("beneficiaries service — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getBeneficiaries propagates database errors", async () => {
    getSelectChain().where.mockRejectedValue(new Error("Connection refused"))
    await expect(getBeneficiaries()).rejects.toThrow("Connection refused")
  })
})
