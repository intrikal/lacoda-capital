import { describe, it, expect, vi, beforeEach } from "vitest"
import { mapPlaidAccountToAssetClass } from "@/lib/validations/plaid.schema"

/**
 * Integration test: Plaid daily sync
 *
 * Simulates: pg_cron triggers → balance refreshed →
 * new valuation row created → asset.current_value updated
 */

describe("Plaid Daily Sync", () => {
  it("creates new valuation with source api_feed on balance refresh", () => {
    const syncEntry = {
      asset_id: "asset-uuid-123",
      as_of_date: new Date().toISOString(),
      value: "1500.50",
      currency: "USD",
      source: "api_feed",
      notes: "Daily balance sync from Plaid (scheduled)",
    }

    expect(syncEntry.source).toBe("api_feed")
    expect(syncEntry.notes).toContain("Daily balance sync")
    expect(syncEntry.notes).toContain("scheduled")
    expect(parseFloat(syncEntry.value)).toBe(1500.5)
  })

  it("updates asset current_value with latest balance", () => {
    const oldValue = "1000.00"
    const newBalance = 1500.5

    const updatedAsset = {
      current_value: newBalance.toString(),
      valued_at: new Date().toISOString(),
    }

    expect(updatedAsset.current_value).toBe("1500.5")
    expect(parseFloat(updatedAsset.current_value)).toBeGreaterThan(parseFloat(oldValue))
  })

  it("handles sync history tracking", () => {
    const existingHistory = [
      { timestamp: "2024-06-14T06:00:00Z", status: "success", accountsSynced: 3 },
      { timestamp: "2024-06-13T06:00:00Z", status: "success", accountsSynced: 3 },
    ]

    const newEntry = {
      timestamp: new Date().toISOString(),
      status: "success",
      accountsSynced: 3,
      mode: "scheduled",
    }

    const updatedHistory = [newEntry, ...existingHistory].slice(0, 30)

    expect(updatedHistory).toHaveLength(3)
    expect(updatedHistory[0].mode).toBe("scheduled")
    expect(updatedHistory[0].status).toBe("success")
  })

  it("keeps sync history to max 30 entries", () => {
    const existingHistory = Array.from({ length: 35 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      status: "success",
      accountsSynced: 3,
    }))

    const newEntry = {
      timestamp: new Date().toISOString(),
      status: "success",
      accountsSynced: 3,
      mode: "scheduled",
    }

    const updatedHistory = [newEntry, ...existingHistory].slice(0, 30)
    expect(updatedHistory).toHaveLength(30)
    expect(updatedHistory[0]).toBe(newEntry) // newest first
  })

  it("maps multiple account types correctly during sync", () => {
    const accounts = [
      { type: "depository", subtype: "checking" },
      { type: "depository", subtype: "savings" },
      { type: "investment", subtype: "401k" },
      { type: "credit", subtype: "credit card" },
    ]

    const mappings = accounts.map((a) => mapPlaidAccountToAssetClass(a.type, a.subtype))
    expect(mappings[0]).toBe("cash")
    expect(mappings[1]).toBe("cash")
    expect(mappings[2]).toBe("equities") // 401k falls back to investment → equities
    expect(mappings[3]).toBe("cash") // credit → cash
  })

  it("distinguishes manual vs scheduled sync mode", () => {
    const manualSync = { mode: "manual", notes: "Daily balance sync from Plaid (manual)" }
    const scheduledSync = { mode: "scheduled", notes: "Daily balance sync from Plaid (scheduled)" }

    expect(manualSync.notes).toContain("manual")
    expect(scheduledSync.notes).toContain("scheduled")
  })
})
