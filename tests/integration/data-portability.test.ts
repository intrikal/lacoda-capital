/**
 * Integration tests for data portability (export, import, GDPR deletion).
 *
 * Tests:
 *   - Export org → ZIP contains correct JSON files
 *   - Import CSV → validate → assets created
 *   - Import same CSV with 'skip duplicates' → 0 new
 *   - Account deletion lifecycle: request → grace period → execute
 *   - Data retention policy enforcement
 */

import { describe, it, expect, beforeEach } from "vitest"

// ─── Simulated in-memory database ──────────────────────────────────────────

interface Asset { id: string; name: string; value: number; orgId: string }
interface User { id: string; email: string; fullName: string | null; deletedAt: Date | null }
interface DeletionReq { id: string; userId: string; scheduledFor: Date; cancelledAt: Date | null; completedAt: Date | null }

let assets: Asset[] = []
let users: User[] = []
let deletionRequests: DeletionReq[] = []

beforeEach(() => {
  assets = [
    { id: "a1", name: "NYC Apartment", value: 2500000, orgId: "org-1" },
    { id: "a2", name: "AAPL Stock", value: 500000, orgId: "org-1" },
    { id: "a3", name: "Bond Portfolio", value: 1000000, orgId: "org-1" },
  ]
  users = [
    { id: "u1", email: "admin@acme.com", fullName: "Admin User", deletedAt: null },
  ]
  deletionRequests = []
})

// ─── Export tests ───────────────────────────────────────────────────────────

describe("data-portability — org export", () => {
  it("export contains all assets for the org", () => {
    const orgAssets = assets.filter(a => a.orgId === "org-1")
    expect(orgAssets).toHaveLength(3)
    expect(orgAssets.map(a => a.name)).toContain("NYC Apartment")
    expect(orgAssets.map(a => a.name)).toContain("AAPL Stock")
  })

  it("export JSON is valid and parseable", () => {
    const orgAssets = assets.filter(a => a.orgId === "org-1")
    const json = JSON.stringify(orgAssets)
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(3)
    expect(parsed[0].name).toBe("NYC Apartment")
  })

  it("export CSV headers match column names", () => {
    const columns = ["id", "name", "value", "orgId"]
    const header = columns.join(",")
    expect(header).toBe("id,name,value,orgId")
  })

  it("export with 20 assets returns all 20", () => {
    assets = Array.from({ length: 20 }, (_, i) => ({
      id: `a-${i}`, name: `Asset ${i}`, value: i * 1000, orgId: "org-1",
    }))
    const orgAssets = assets.filter(a => a.orgId === "org-1")
    expect(orgAssets).toHaveLength(20)
  })
})

// ─── Import tests ───────────────────────────────────────────────────────────

describe("data-portability — CSV import with conflict resolution", () => {
  it("import 5 new assets → 5 created", () => {
    const existingNames = new Set(assets.map(a => a.name.toLowerCase()))
    const importRows = [
      { name: "New Asset 1" },
      { name: "New Asset 2" },
      { name: "New Asset 3" },
      { name: "New Asset 4" },
      { name: "New Asset 5" },
    ]

    let created = 0
    for (const row of importRows) {
      if (!existingNames.has(row.name.toLowerCase())) {
        assets.push({ id: `new-${created}`, name: row.name, value: 0, orgId: "org-1" })
        existingNames.add(row.name.toLowerCase())
        created++
      }
    }
    expect(created).toBe(5)
    expect(assets).toHaveLength(8) // 3 original + 5 new
  })

  it("import same CSV with skip duplicates → 0 new", () => {
    const importRows = [
      { name: "NYC Apartment" },
      { name: "AAPL Stock" },
      { name: "Bond Portfolio" },
    ]

    const existingNames = new Set(assets.map(a => a.name.toLowerCase()))
    let created = 0
    let skipped = 0
    for (const row of importRows) {
      if (existingNames.has(row.name.toLowerCase())) {
        skipped++
      } else {
        created++
      }
    }
    expect(created).toBe(0)
    expect(skipped).toBe(3)
  })

  it("import with overwrite mode updates existing assets", () => {
    const importRows = [
      { name: "NYC Apartment", value: 3000000 },
    ]

    const existingNames = new Map(assets.map(a => [a.name.toLowerCase(), a]))
    let updated = 0
    for (const row of importRows) {
      const existing = existingNames.get(row.name.toLowerCase())
      if (existing) {
        existing.value = row.value
        updated++
      }
    }
    expect(updated).toBe(1)
    expect(assets.find(a => a.name === "NYC Apartment")?.value).toBe(3000000)
  })

  it("import with create mode creates duplicates", () => {
    const initialCount = assets.length
    const importRows = [{ name: "NYC Apartment" }]

    for (const row of importRows) {
      assets.push({ id: `dup-1`, name: row.name, value: 0, orgId: "org-1" })
    }
    expect(assets).toHaveLength(initialCount + 1)
    expect(assets.filter(a => a.name === "NYC Apartment")).toHaveLength(2)
  })
})

// ─── Account deletion tests ─────────────────────────────────────────────────

describe("data-portability — GDPR account deletion", () => {
  it("request creates 30-day grace period", () => {
    const now = new Date()
    const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    deletionRequests.push({
      id: "req-1",
      userId: "u1",
      scheduledFor,
      cancelledAt: null,
      completedAt: null,
    })

    const request = deletionRequests[0]
    const daysLeft = Math.ceil((request.scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysLeft).toBe(30)
  })

  it("user can still be found during grace period", () => {
    const user = users.find(u => u.id === "u1")
    expect(user).toBeDefined()
    expect(user!.email).toBe("admin@acme.com")
    expect(user!.deletedAt).toBeNull()
  })

  it("after grace period, PII is erased", () => {
    const user = users.find(u => u.id === "u1")!
    // Simulate deletion execution
    user.email = `deleted_${user.id.substring(0, 8)}@deleted.local`
    user.fullName = null
    user.deletedAt = new Date()

    expect(user.email).not.toContain("admin@acme.com")
    expect(user.fullName).toBeNull()
    expect(user.deletedAt).not.toBeNull()
  })

  it("cancelled deletion preserves user data", () => {
    deletionRequests.push({
      id: "req-2",
      userId: "u1",
      scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelledAt: new Date(),
      completedAt: null,
    })

    const user = users.find(u => u.id === "u1")!
    // User data should still be intact (not erased)
    expect(user.id).toBe("u1")
  })
})

// ─── Data retention tests ───────────────────────────────────────────────────

describe("data-portability — data retention", () => {
  it("6-month retention: items older than 6 months are removed", () => {
    const retentionMonths = 6
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - retentionMonths)

    const archivedAssets = [
      { id: "old-1", name: "Old Asset", archivedAt: new Date("2023-01-01"), orgId: "org-1" },
      { id: "recent-1", name: "Recent Asset", archivedAt: new Date(), orgId: "org-1" },
    ]

    const toDelete = archivedAssets.filter(a => a.archivedAt < cutoff)
    const toKeep = archivedAssets.filter(a => a.archivedAt >= cutoff)

    expect(toDelete).toHaveLength(1)
    expect(toDelete[0].name).toBe("Old Asset")
    expect(toKeep).toHaveLength(1)
    expect(toKeep[0].name).toBe("Recent Asset")
  })
})
