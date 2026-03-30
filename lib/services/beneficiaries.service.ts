"use server"

/**
 * beneficiaries.service.ts
 *
 * Service layer for the client's estate planning beneficiary designations.
 * Queries the beneficiaries table via Drizzle ORM.
 */

import { db } from "@/app/db"
import { beneficiaries } from "@/app/db/schema"
import { eq, isNull } from "drizzle-orm"
import type { Beneficiary } from "@/lib/types/mock"

/** Map a DB beneficiaries row to the Beneficiary mock type shape. */
function toBeneficiary(row: typeof beneficiaries.$inferSelect): Beneficiary {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    designation: row.designation as Beneficiary["designation"],
    percentage: row.percentage,
    accounts: (row.accounts ?? []) as string[],
    ssnLast4: row.ssnLast4 ?? undefined,
    dateOfBirth: row.dateOfBirth ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    verified: row.verified,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all beneficiaries for the current client.
 */
export async function getBeneficiaries(): Promise<Beneficiary[]> {
  const rows = await db
    .select()
    .from(beneficiaries)
    .where(isNull(beneficiaries.deletedAt))
  return rows.map(toBeneficiary)
}

/**
 * Fetch a single beneficiary by ID.
 */
export async function getBeneficiaryById(id: string): Promise<Beneficiary | undefined> {
  const rows = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.id, id))
  return rows[0] ? toBeneficiary(rows[0]) : undefined
}

/**
 * Computed allocation summary — verifies primary percentages sum to 100.
 */
export async function getBeneficiarySummary() {
  const all = await getBeneficiaries()
  const primary = all.filter((b) => b.designation === "primary")
  const contingent = all.filter((b) => b.designation === "contingent")
  const unverified = all.filter((b) => !b.verified)
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
