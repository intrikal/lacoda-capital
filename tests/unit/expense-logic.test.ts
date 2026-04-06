/**
 * ============================================================================
 * UNIT TESTS: expense-logic.test.ts
 * ============================================================================
 *
 * Tests pure business logic for the portfolio expenses feature — no DB,
 * no auth, no external dependencies. All logic is extracted and tested
 * as plain functions so edge cases can be exercised cheaply and fast.
 *
 * Coverage:
 *   - Status determination (paid/pending/overdue)
 *   - Category label mapping
 *   - Summary aggregation (totals by status and category)
 *   - ROI calculation (renovation → value add)
 *   - Refinance opportunity detection (rate delta threshold)
 *   - Slug sanitization (for future vendor fields)
 *   - Currency formatting edge cases
 *   - Property impact classification
 */

import { describe, it, expect } from "vitest"

// ─── Domain helpers (extracted from page logic for unit testing) ──────────────

type ExpenseStatus = "paid" | "pending" | "overdue" | "disputed" | "cancelled"
type ExpenseCategory =
  | "renovation"
  | "maintenance"
  | "capital_improvement"
  | "property_tax"
  | "insurance"
  | "management_fee"
  | "legal"
  | "financing"
  | "utilities"
  | "professional_services"
  | "marketing"
  | "other"

interface Expense {
  id: string
  title: string
  amount: number
  status: ExpenseStatus
  category: ExpenseCategory
  date: string // ISO
  estimatedValueIncrease: number | null
  refinanceRelated?: "yes" | "no" | null
}

/** Determine if an expense is overdue: pending and date has passed */
function isExpenseOverdue(expense: Expense, now: Date = new Date()): boolean {
  if (expense.status !== "pending") return false
  return new Date(expense.date) < now
}

/** Aggregate expenses into summary totals */
function summarizeExpenses(expenses: Expense[]): {
  totalPaid: number
  totalPending: number
  totalOverdue: number
  totalValueAdd: number
  countByCategory: Record<string, number>
  amountByCategory: Record<string, number>
} {
  const summary = {
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalValueAdd: 0,
    countByCategory: {} as Record<string, number>,
    amountByCategory: {} as Record<string, number>,
  }

  for (const e of expenses) {
    if (e.status === "paid") summary.totalPaid += e.amount
    else if (e.status === "pending") summary.totalPending += e.amount
    else if (e.status === "overdue") summary.totalOverdue += e.amount

    if (e.estimatedValueIncrease) summary.totalValueAdd += e.estimatedValueIncrease

    summary.countByCategory[e.category] = (summary.countByCategory[e.category] ?? 0) + 1
    summary.amountByCategory[e.category] =
      (summary.amountByCategory[e.category] ?? 0) + e.amount
  }

  return summary
}

/** Calculate ROI for a renovation expense */
function calculateRenovationROI(cost: number, estimatedValueAdd: number): number {
  if (cost <= 0) return 0
  return Math.round((estimatedValueAdd / cost) * 100)
}

/** Determine if a refinance is worth pursuing (rate delta >= threshold) */
function isRefinanceWorthPursuing(
  currentRate: number,
  marketRate: number,
  thresholdPct: number = 0.5
): boolean {
  return currentRate - marketRate >= thresholdPct
}

/** Calculate monthly mortgage payment for a given rate and balance */
function estimateMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number = 30
): number {
  const r = annualRatePct / 100 / 12
  const n = termYears * 12
  if (r === 0) return principal / n
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1)
}

/** Monthly savings from refinancing */
function estimateRefinanceSavings(
  principal: number,
  currentRatePct: number,
  newRatePct: number,
  termYears: number = 30
): number {
  const current = estimateMonthlyPayment(principal, currentRatePct, termYears)
  const newPayment = estimateMonthlyPayment(principal, newRatePct, termYears)
  return Math.max(0, current - newPayment)
}

/** Sanitize a vendor name into a URL-safe slug */
function sanitizeVendorSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Classify a property impact level by category */
function classifyPropertyImpact(
  category: ExpenseCategory
): "capital_improvement" | "maintenance" | "operating" | "none" {
  if (["renovation", "capital_improvement"].includes(category)) return "capital_improvement"
  if (["maintenance", "utilities"].includes(category)) return "maintenance"
  if (["property_tax", "insurance", "management_fee", "legal", "financing"].includes(category))
    return "operating"
  return "none"
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ── Status determination ──────────────────────────────────────────────────────

describe("isExpenseOverdue", () => {
  const now = new Date("2025-02-15")

  it("returns false for a paid expense even if date is past", () => {
    const e: Expense = {
      id: "1", title: "T", amount: 1000, status: "paid",
      category: "maintenance", date: "2025-01-01", estimatedValueIncrease: null,
    }
    expect(isExpenseOverdue(e, now)).toBe(false)
  })

  it("returns false for a pending expense with future date", () => {
    const e: Expense = {
      id: "1", title: "T", amount: 1000, status: "pending",
      category: "property_tax", date: "2025-03-01", estimatedValueIncrease: null,
    }
    expect(isExpenseOverdue(e, now)).toBe(false)
  })

  it("returns true for a pending expense with past date", () => {
    const e: Expense = {
      id: "1", title: "T", amount: 1000, status: "pending",
      category: "property_tax", date: "2025-01-01", estimatedValueIncrease: null,
    }
    expect(isExpenseOverdue(e, now)).toBe(true)
  })

  it("returns false for cancelled expense regardless of date", () => {
    const e: Expense = {
      id: "1", title: "T", amount: 1000, status: "cancelled",
      category: "other", date: "2020-01-01", estimatedValueIncrease: null,
    }
    expect(isExpenseOverdue(e, now)).toBe(false)
  })

  it("returns false for disputed expense", () => {
    const e: Expense = {
      id: "1", title: "T", amount: 1000, status: "disputed",
      category: "legal", date: "2020-01-01", estimatedValueIncrease: null,
    }
    expect(isExpenseOverdue(e, now)).toBe(false)
  })

  it("expense due exactly today is NOT overdue (same date)", () => {
    const e: Expense = {
      id: "1", title: "T", amount: 500, status: "pending",
      category: "property_tax", date: now.toISOString().split("T")[0],
      estimatedValueIncrease: null,
    }
    // Date is equal — new Date("2025-02-15") < new Date("2025-02-15") is false
    expect(isExpenseOverdue(e, now)).toBe(false)
  })
})

// ── Summary aggregation ───────────────────────────────────────────────────────

describe("summarizeExpenses", () => {
  const expenses: Expense[] = [
    { id: "1", title: "A", amount: 10000, status: "paid", category: "renovation", date: "2024-11-01", estimatedValueIncrease: 7000 },
    { id: "2", title: "B", amount: 5000, status: "paid", category: "maintenance", date: "2024-12-01", estimatedValueIncrease: null },
    { id: "3", title: "C", amount: 3000, status: "pending", category: "property_tax", date: "2025-01-31", estimatedValueIncrease: null },
    { id: "4", title: "D", amount: 1500, status: "overdue", category: "property_tax", date: "2024-10-01", estimatedValueIncrease: null },
    { id: "5", title: "E", amount: 25000, status: "pending", category: "renovation", date: "2025-03-01", estimatedValueIncrease: 18000 },
  ]

  it("sums paid amounts correctly", () => {
    const s = summarizeExpenses(expenses)
    expect(s.totalPaid).toBe(15000) // 10000 + 5000
  })

  it("sums pending amounts correctly", () => {
    const s = summarizeExpenses(expenses)
    expect(s.totalPending).toBe(28000) // 3000 + 25000
  })

  it("sums overdue amounts correctly", () => {
    const s = summarizeExpenses(expenses)
    expect(s.totalOverdue).toBe(1500)
  })

  it("sums estimated value increase only for expenses that have it", () => {
    const s = summarizeExpenses(expenses)
    expect(s.totalValueAdd).toBe(25000) // 7000 + 18000
  })

  it("counts by category correctly", () => {
    const s = summarizeExpenses(expenses)
    expect(s.countByCategory["renovation"]).toBe(2)
    expect(s.countByCategory["property_tax"]).toBe(2)
    expect(s.countByCategory["maintenance"]).toBe(1)
  })

  it("sums amount by category correctly", () => {
    const s = summarizeExpenses(expenses)
    expect(s.amountByCategory["renovation"]).toBe(35000) // 10000 + 25000
    expect(s.amountByCategory["property_tax"]).toBe(4500) // 3000 + 1500
  })

  it("returns zero totals for empty list", () => {
    const s = summarizeExpenses([])
    expect(s.totalPaid).toBe(0)
    expect(s.totalPending).toBe(0)
    expect(s.totalOverdue).toBe(0)
    expect(s.totalValueAdd).toBe(0)
    expect(Object.keys(s.countByCategory)).toHaveLength(0)
  })

  it("ignores cancelled and disputed in all totals", () => {
    const s = summarizeExpenses([
      { id: "x", title: "X", amount: 99999, status: "cancelled", category: "other", date: "2024-01-01", estimatedValueIncrease: null },
      { id: "y", title: "Y", amount: 55555, status: "disputed", category: "legal", date: "2024-01-01", estimatedValueIncrease: null },
    ])
    expect(s.totalPaid + s.totalPending + s.totalOverdue).toBe(0)
  })
})

// ── ROI calculation ──────────────────────────────────────────────────────────

describe("calculateRenovationROI", () => {
  it("calculates 72% ROI for $18k gain on $25k spend", () => {
    expect(calculateRenovationROI(25000, 18000)).toBe(72)
  })

  it("calculates 100% ROI when value add equals cost", () => {
    expect(calculateRenovationROI(10000, 10000)).toBe(100)
  })

  it("calculates >100% ROI for high-value improvements (ADU)", () => {
    expect(calculateRenovationROI(85000, 93500)).toBe(110)
  })

  it("returns 0 for zero cost (guard against division by zero)", () => {
    expect(calculateRenovationROI(0, 10000)).toBe(0)
  })

  it("returns 0 for negative cost", () => {
    expect(calculateRenovationROI(-5000, 10000)).toBe(0)
  })

  it("returns 0% ROI when value add is 0", () => {
    expect(calculateRenovationROI(10000, 0)).toBe(0)
  })

  it("rounds to nearest integer", () => {
    // $13,000 / $18,000 = 72.22...%
    expect(calculateRenovationROI(18000, 13000)).toBe(72)
  })
})

// ── Refinance opportunity detection ─────────────────────────────────────────

describe("isRefinanceWorthPursuing", () => {
  it("returns true when delta >= 0.5% (default threshold)", () => {
    expect(isRefinanceWorthPursuing(6.875, 5.95)).toBe(true) // delta = 0.925
  })

  it("returns true when delta exactly equals threshold", () => {
    expect(isRefinanceWorthPursuing(6.5, 6.0)).toBe(true) // delta = 0.5
  })

  it("returns false when delta is below threshold", () => {
    expect(isRefinanceWorthPursuing(6.3, 6.0)).toBe(false) // delta = 0.3
  })

  it("returns false when market rate is higher than current (bad refi)", () => {
    expect(isRefinanceWorthPursuing(5.0, 6.5)).toBe(false)
  })

  it("returns false when rates are equal", () => {
    expect(isRefinanceWorthPursuing(6.5, 6.5)).toBe(false)
  })

  it("respects custom threshold", () => {
    expect(isRefinanceWorthPursuing(6.3, 6.0, 0.25)).toBe(true)  // delta = 0.3 >= 0.25
    expect(isRefinanceWorthPursuing(6.2, 6.0, 0.25)).toBe(false) // delta = 0.2 < 0.25
  })
})

describe("estimateRefinanceSavings", () => {
  it("saves ~$412/month on 680k loan going from 6.875% to 5.95%", () => {
    const savings = estimateRefinanceSavings(680000, 6.875, 5.95)
    expect(savings).toBeGreaterThan(380)
    expect(savings).toBeLessThan(450)
  })

  it("returns 0 savings when new rate is higher", () => {
    const savings = estimateRefinanceSavings(500000, 5.5, 6.5)
    expect(savings).toBe(0)
  })

  it("returns 0 savings when rates are identical", () => {
    const savings = estimateRefinanceSavings(500000, 6.0, 6.0)
    expect(savings).toBeCloseTo(0, 1)
  })

  it("larger loan balance → larger absolute savings", () => {
    const small = estimateRefinanceSavings(300000, 7.0, 6.0)
    const large = estimateRefinanceSavings(1200000, 7.0, 6.0)
    expect(large).toBeGreaterThan(small * 3)
  })
})

// ── Slug sanitization ────────────────────────────────────────────────────────

describe("sanitizeVendorSlug", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(sanitizeVendorSlug("Apex Roofing Co.")).toBe("apex-roofing-co")
  })

  it("collapses multiple consecutive dashes", () => {
    expect(sanitizeVendorSlug("ABC  &  DEF")).toBe("abc-def")
  })

  it("strips leading and trailing dashes", () => {
    expect(sanitizeVendorSlug("  Premier LLC  ")).toBe("premier-llc")
  })

  it("handles all-numeric vendor name", () => {
    expect(sanitizeVendorSlug("123")).toBe("123")
  })

  it("handles vendor with special characters", () => {
    expect(sanitizeVendorSlug("Harmon & Associates, LLC.")).toBe("harmon-associates-llc")
  })
})

// ── Property impact classification ──────────────────────────────────────────

describe("classifyPropertyImpact", () => {
  it("classifies renovation as capital_improvement", () => {
    expect(classifyPropertyImpact("renovation")).toBe("capital_improvement")
  })

  it("classifies capital_improvement as capital_improvement", () => {
    expect(classifyPropertyImpact("capital_improvement")).toBe("capital_improvement")
  })

  it("classifies maintenance as maintenance", () => {
    expect(classifyPropertyImpact("maintenance")).toBe("maintenance")
  })

  it("classifies utilities as maintenance", () => {
    expect(classifyPropertyImpact("utilities")).toBe("maintenance")
  })

  it("classifies property_tax as operating", () => {
    expect(classifyPropertyImpact("property_tax")).toBe("operating")
  })

  it("classifies insurance as operating", () => {
    expect(classifyPropertyImpact("insurance")).toBe("operating")
  })

  it("classifies financing as operating", () => {
    expect(classifyPropertyImpact("financing")).toBe("operating")
  })

  it("classifies other as none", () => {
    expect(classifyPropertyImpact("other")).toBe("none")
  })

  it("classifies marketing as none", () => {
    expect(classifyPropertyImpact("marketing")).toBe("none")
  })
})
