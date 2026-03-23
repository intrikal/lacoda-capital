"use server"

/**
 * beneficiaries.service.ts
 *
 * Service layer for the client's estate planning beneficiary designations.
 * No beneficiaries table exists in the DB schema. Data is kept as static seed below.
 */

import type { Beneficiary } from "@/lib/types/mock"

const seedBeneficiaries: Beneficiary[] = [
  { id: "ben-001", name: "Margaret Blackwood", relationship: "Spouse", designation: "primary", percentage: 60, accounts: ["Investment Account", "Retirement IRA"], ssnLast4: "4521", dateOfBirth: "1975-03-12", phone: "+1-212-555-1001", email: "margaret@blackwood.com", verified: true },
  { id: "ben-002", name: "James Blackwood Jr.", relationship: "Child", designation: "primary", percentage: 20, accounts: ["Investment Account"], ssnLast4: "7834", dateOfBirth: "2001-07-22", email: "james.jr@blackwood.com", verified: true },
  { id: "ben-003", name: "Sophie Blackwood", relationship: "Child", designation: "primary", percentage: 20, accounts: ["Investment Account"], ssnLast4: "9102", dateOfBirth: "2004-11-05", verified: false },
  { id: "ben-004", name: "Blackwood Family Trust", relationship: "Trust", designation: "contingent", percentage: 100, accounts: ["Investment Account", "Retirement IRA"], verified: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all beneficiaries for the current client.
 */
export async function getBeneficiaries(): Promise<Beneficiary[]> {
  return [...seedBeneficiaries]
}

/**
 * Fetch a single beneficiary by ID.
 */
export async function getBeneficiaryById(id: string): Promise<Beneficiary | undefined> {
  return seedBeneficiaries.find((b) => b.id === id)
}

/**
 * Computed allocation summary — verifies primary percentages sum to 100.
 */
export async function getBeneficiarySummary() {
  const beneficiaries = seedBeneficiaries
  const primary = beneficiaries.filter((b) => b.designation === "primary")
  const contingent = beneficiaries.filter((b) => b.designation === "contingent")
  const unverified = beneficiaries.filter((b) => !b.verified)
  const primaryTotal = primary.reduce((sum, b) => sum + b.percentage, 0)
  const contingentTotal = contingent.reduce((sum, b) => sum + b.percentage, 0)

  return {
    primaryCount: primary.length,
    contingentCount: contingent.length,
    unverifiedCount: unverified.length,
    primaryTotal,
    contingentTotal,
    /** True when primary designations sum to exactly 100% */
    primaryComplete: primaryTotal === 100,
    /** True when contingent designations sum to exactly 100% (or 0 if none) */
    contingentComplete: contingentTotal === 100 || contingentTotal === 0,
  }
}
