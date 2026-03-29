/**
 * ============================================================================
 * TEST FILE: beneficiaries.service.test.ts
 * ============================================================================
 *
 * Kevin, this tests the beneficiaries service. Like the alerts service, it
 * uses a static seed array and makes NO database calls.
 *
 * RELATED FILES:
 *   lib/services/beneficiaries.service.ts  — service under test
 *   lib/types/mock.ts                      — Beneficiary type
 */

import { describe, it, expect } from "vitest"
import {
  getBeneficiaries,
  getBeneficiaryById,
  getBeneficiarySummary,
} from "@/lib/services/beneficiaries.service"

// ============================================================================
// 1. getBeneficiaries — full seed
// ============================================================================

describe("getBeneficiaries", () => {
  it("returns all 4 seed beneficiaries", async () => {
    const list = await getBeneficiaries()
    expect(list).toHaveLength(4)
  })

  it("every beneficiary has the required shape fields", async () => {
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

  it("returns a copy of the array (spread — not the same reference)", async () => {
    const a = await getBeneficiaries()
    const b = await getBeneficiaries()
    expect(a).not.toBe(b)       // different array instances
    expect(a).toEqual(b)         // same content
  })

  it("contains both primary and contingent designations", async () => {
    const list = await getBeneficiaries()
    const designations = new Set(list.map((b) => b.designation))
    expect(designations.has("primary")).toBe(true)
    expect(designations.has("contingent")).toBe(true)
  })
})

// ============================================================================
// 2. getBeneficiaryById — lookup by ID
// ============================================================================

describe("getBeneficiaryById", () => {
  it("returns the correct beneficiary for a known id", async () => {
    const b = await getBeneficiaryById("ben-001")
    expect(b).toBeDefined()
    expect(b!.name).toBe("Margaret Blackwood")
  })

  it("returns undefined for an unknown id", async () => {
    const b = await getBeneficiaryById("does-not-exist")
    expect(b).toBeUndefined()
  })

  it("returns the contingent beneficiary by id", async () => {
    const b = await getBeneficiaryById("ben-004")
    expect(b).toBeDefined()
    expect(b!.designation).toBe("contingent")
  })

  it("returns the correct beneficiary for each seed id", async () => {
    const ids = ["ben-001", "ben-002", "ben-003", "ben-004"]
    const list = await getBeneficiaries()
    for (const id of ids) {
      const found = await getBeneficiaryById(id)
      const expected = list.find((b) => b.id === id)
      expect(found).toEqual(expected)
    }
  })
})

// ============================================================================
// 3. getBeneficiarySummary — computed aggregations
// ============================================================================

describe("getBeneficiarySummary", () => {
  it("primaryCount matches number of primary beneficiaries", async () => {
    const list = await getBeneficiaries()
    const summary = await getBeneficiarySummary()
    expect(summary.primaryCount).toBe(list.filter((b) => b.designation === "primary").length)
  })

  it("contingentCount matches number of contingent beneficiaries", async () => {
    const list = await getBeneficiaries()
    const summary = await getBeneficiarySummary()
    expect(summary.contingentCount).toBe(list.filter((b) => b.designation === "contingent").length)
  })

  it("unverifiedCount matches number of unverified beneficiaries", async () => {
    const list = await getBeneficiaries()
    const summary = await getBeneficiarySummary()
    expect(summary.unverifiedCount).toBe(list.filter((b) => !b.verified).length)
  })

  it("primaryTotal is the sum of primary percentages (should be 100)", async () => {
    const summary = await getBeneficiarySummary()
    expect(summary.primaryTotal).toBe(100)
  })

  it("primaryComplete is true when primary percentages sum to exactly 100", async () => {
    const summary = await getBeneficiarySummary()
    expect(summary.primaryComplete).toBe(true)
  })

  it("contingentTotal is the sum of contingent percentages", async () => {
    const list = await getBeneficiaries()
    const expected = list
      .filter((b) => b.designation === "contingent")
      .reduce((sum, b) => sum + b.percentage, 0)
    const summary = await getBeneficiarySummary()
    expect(summary.contingentTotal).toBe(expected)
  })

  it("contingentComplete is true when contingent percentages sum to 100 or 0", async () => {
    const summary = await getBeneficiarySummary()
    const isValid = summary.contingentTotal === 100 || summary.contingentTotal === 0
    expect(summary.contingentComplete).toBe(isValid)
  })

  it("all numeric summary fields are non-negative", async () => {
    const summary = await getBeneficiarySummary()
    expect(summary.primaryCount).toBeGreaterThanOrEqual(0)
    expect(summary.contingentCount).toBeGreaterThanOrEqual(0)
    expect(summary.unverifiedCount).toBeGreaterThanOrEqual(0)
    expect(summary.primaryTotal).toBeGreaterThanOrEqual(0)
    expect(summary.contingentTotal).toBeGreaterThanOrEqual(0)
  })
})
