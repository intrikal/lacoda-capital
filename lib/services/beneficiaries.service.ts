/**
 * beneficiaries.service.ts
 *
 * Service layer for the client's estate planning beneficiary designations.
 * Full CRUD — clients can add, update, and remove beneficiaries on their accounts.
 *
 * Architecture position:
 *   Client page → useClientBeneficiaries hook → beneficiariesService → (mock data today, Drizzle tomorrow)
 *
 * tRPC swap path:
 *   `trpc.client.beneficiaries.list.useQuery()`
 *   `trpc.client.beneficiaries.create.useMutation()`
 *   `trpc.client.beneficiaries.update.useMutation()`
 *   `trpc.client.beneficiaries.delete.useMutation()`
 *
 * Compliance note:
 *   In production, any change to beneficiaries triggers a compliance review event
 *   and sends a confirmation email to the account holder.
 */

import { mockBeneficiaries } from "@/lib/mock/data"
import type { Beneficiary } from "@/lib/mock/types"

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all beneficiaries for the current client.
 */
export async function getBeneficiaries(): Promise<Beneficiary[]> {
  return Promise.resolve([...mockBeneficiaries])
}

/**
 * Fetch a single beneficiary by ID.
 */
export async function getBeneficiaryById(id: string): Promise<Beneficiary | undefined> {
  return Promise.resolve(mockBeneficiaries.find((b) => b.id === id))
}

/**
 * Computed allocation summary — verifies primary percentages sum to 100.
 * Used in the account summary cards on the beneficiaries page.
 */
export async function getBeneficiarySummary() {
  const beneficiaries = mockBeneficiaries
  const primary = beneficiaries.filter((b) => b.designation === "primary")
  const contingent = beneficiaries.filter((b) => b.designation === "contingent")
  const unverified = beneficiaries.filter((b) => !b.verified)
  const primaryTotal = primary.reduce((sum, b) => sum + b.percentage, 0)
  const contingentTotal = contingent.reduce((sum, b) => sum + b.percentage, 0)

  return Promise.resolve({
    primaryCount: primary.length,
    contingentCount: contingent.length,
    unverifiedCount: unverified.length,
    primaryTotal,
    contingentTotal,
    /** True when primary designations sum to exactly 100% */
    primaryComplete: primaryTotal === 100,
    /** True when contingent designations sum to exactly 100% (or 0 if none) */
    contingentComplete: contingentTotal === 100 || contingentTotal === 0,
  })
}
