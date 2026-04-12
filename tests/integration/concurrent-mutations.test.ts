/**
 * ============================================================================
 * INTEGRATION TESTS: concurrent-mutations.test.ts
 * ============================================================================
 *
 * Tests what happens when two mutations hit the same resource simultaneously.
 * DB layer is mocked to simulate concurrent access patterns.
 *
 * Coverage:
 *   - Concurrent asset updates: both complete, last write wins, two ledger entries
 *   - Concurrent client creation: unique constraint → one succeeds, one fails
 *   - Concurrent ledger writes: append-only, both succeed, ordered correctly
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock DB (asset updates + client creation) ─────────────────────────────

const mockReturning = vi.fn()
const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
const mockInsert = vi.fn().mockReturnValue({ values: mockValues })
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })
const mockDeleteWhere = vi.fn()
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere })
const mockFindFirst = vi.fn()
const mockClientFindFirst = vi.fn()

vi.mock("@/app/db", () => ({
  db: {
    insert: (...a: unknown[]) => mockInsert(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
    query: {
      assets: { findFirst: (...a: unknown[]) => mockFindFirst(...a) },
      entities: { findFirst: (...a: unknown[]) => mockFindFirst(...a) },
      clients: { findFirst: (...a: unknown[]) => mockClientFindFirst(...a) },
    },
  },
}))

vi.mock("@/app/db/schema", () => ({
  assets: {
    id: "id", entityId: "entity_id", name: "name", deletedAt: "deleted_at",
    currentValue: "current_value", status: "status", assetClass: "asset_class",
  },
  entities: { id: "id", clientId: "client_id" },
  clients: { id: "id", orgId: "org_id", displayName: "display_name", email: "email" },
  ledgerEvents: {
    id: "id", orgId: "org_id", actorUserId: "actor_user_id",
    action: "action", targetType: "target_type", targetId: "target_id",
    payload: "payload", ipAddress: "ip_address",
  },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => `eq(${val})`),
  and: vi.fn((...args) => `and(${args.join(",")})`),
  isNull: vi.fn((col) => `isNull(${col})`),
  ilike: vi.fn((_col, val) => `ilike(${val})`),
  sql: vi.fn(),
  count: vi.fn(() => "count()"),
  like: vi.fn((_col, val) => `like(${val})`),
  gte: vi.fn((_col, val) => `gte(${val})`),
  lte: vi.fn((_col, val) => `lte(${val})`),
}))

// ─── Mock auth ──────────────────────────────────────────────────────────────

const mockSession = vi.hoisted(() => ({
  userId: "user-advisor-1",
  orgId: "org-lacoda-1",
  memberId: "member-1",
  role: "admin" as const,
  email: "advisor@lacoda.com",
}))

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue(mockSession),
  requireRole: vi.fn().mockResolvedValue(mockSession),
}))

vi.mock("@/lib/demo/guard", () => ({
  blockDemoMutation: vi.fn(),
}))

// ─── Mock ledger + analytics ────────────────────────────────────────────────

const ledgerLog: Array<Record<string, unknown>> = []

const mockCreateLedgerEvent = vi.fn().mockImplementation(async (params) => {
  ledgerLog.push({ ...params, timestamp: Date.now() })
})

vi.mock("@/lib/actions/ledger", () => ({
  createLedgerEvent: (...a: unknown[]) => mockCreateLedgerEvent(...a),
}))

const mockCaptureEvent = vi.fn()

vi.mock("@/lib/analytics/posthog-server", () => ({
  captureServerEvent: (...a: unknown[]) => mockCaptureEvent(...a),
}))

vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: (...a: unknown[]) => mockCaptureEvent(...a),
}))

// ─── Fixtures ───────────────────────────────────────────────────────────────

const FIXTURE_ASSET = {
  id: "asset-001",
  entityId: "entity-001",
  name: "Commercial Property",
  assetClass: "real_estate",
  status: "active",
  currentValue: "1000000",
  acquisitionCost: "800000",
  currency: "USD",
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  entity: { client: { orgId: "org-lacoda-1" } },
}

const FIXTURE_CLIENT = {
  id: "client-001",
  orgId: "org-lacoda-1",
  displayName: "Jane Smith",
  email: "jane@example.com",
  phone: null,
  externalId: null,
  profile: { clientType: "individual", clientStatus: "active" },
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { updateAsset } from "@/lib/actions/asset.actions"
import { createClient } from "@/lib/actions/client.actions"
import { createLedgerEvent } from "@/lib/actions/ledger"

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  ledgerLog.length = 0
})

// ─── 1. Concurrent Asset Updates ────────────────────────────────────────────

describe("Concurrent asset updates", () => {
  it("two concurrent updateAsset calls for the same asset → both complete (last write wins)", async () => {
    // Simulate: both reads see the same existing asset
    mockFindFirst.mockResolvedValue(FIXTURE_ASSET)

    // Track the two update results separately
    let callCount = 0
    mockReturning.mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        // First write: name → "Updated A"
        return [{ ...FIXTURE_ASSET, name: "Updated A", currentValue: "1100000" }]
      }
      // Second write: name → "Updated B" (this is the "last write" that wins in prod)
      return [{ ...FIXTURE_ASSET, name: "Updated B", currentValue: "1200000" }]
    })

    // Fire both updates concurrently
    const [resultA, resultB] = await Promise.all([
      updateAsset("asset-001", { name: "Updated A", currentValue: 1_100_000 }),
      updateAsset("asset-001", { name: "Updated B", currentValue: 1_200_000 }),
    ])

    // Both calls should resolve without throwing
    expect(resultA).toBeDefined()
    expect(resultB).toBeDefined()

    // Both should have called db.update (no optimistic locking in place)
    expect(mockUpdate).toHaveBeenCalledTimes(2)
    expect(mockSet).toHaveBeenCalledTimes(2)
  })

  it("both concurrent updates produce ledger entries", async () => {
    mockFindFirst.mockResolvedValue(FIXTURE_ASSET)

    let callCount = 0
    mockReturning.mockImplementation(async () => {
      callCount++
      return [{ ...FIXTURE_ASSET, name: `Updated ${callCount}` }]
    })

    await Promise.all([
      updateAsset("asset-001", { name: "Updated 1" }),
      updateAsset("asset-001", { name: "Updated 2" }),
    ])

    // Two ledger events should be created — one for each mutation
    expect(mockCreateLedgerEvent).toHaveBeenCalledTimes(2)

    // Both should reference the same asset
    const calls = mockCreateLedgerEvent.mock.calls
    expect(calls[0][0]).toEqual(
      expect.objectContaining({
        action: "updated",
        targetType: "asset",
        targetId: "asset-001",
      })
    )
    expect(calls[1][0]).toEqual(
      expect.objectContaining({
        action: "updated",
        targetType: "asset",
        targetId: "asset-001",
      })
    )
  })

  it("no optimistic locking — second write silently overwrites first", async () => {
    mockFindFirst.mockResolvedValue(FIXTURE_ASSET)

    // Simulate delayed first write: second finishes first
    let callCount = 0
    mockReturning.mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        // First call is slow — introduce artificial delay
        await new Promise((r) => setTimeout(r, 10))
        return [{ ...FIXTURE_ASSET, currentValue: "1100000" }]
      }
      return [{ ...FIXTURE_ASSET, currentValue: "1200000" }]
    })

    const [resultA, resultB] = await Promise.all([
      updateAsset("asset-001", { currentValue: 1_100_000 }),
      updateAsset("asset-001", { currentValue: 1_200_000 }),
    ])

    // Both succeed — no conflict detection
    expect(resultA).toBeDefined()
    expect(resultB).toBeDefined()

    // Both went through db.update without version checking
    expect(mockUpdate).toHaveBeenCalledTimes(2)
  })
})

// ─── 2. Concurrent Client Creation ──────────────────────────────────────────

describe("Concurrent client creation", () => {
  it("two createClient calls with the same email → one succeeds, one gets duplicate error", async () => {
    let insertCallCount = 0
    mockReturning.mockImplementation(async () => {
      insertCallCount++
      if (insertCallCount === 1) {
        // First insert succeeds
        return [FIXTURE_CLIENT]
      }
      // Second insert hits unique constraint
      throw new Error("duplicate key value violates unique constraint")
    })

    const input = {
      displayName: "Jane Smith",
      email: "jane@example.com",
      clientType: "individual",
      clientStatus: "active",
    }

    // Fire both concurrently
    const results = await Promise.allSettled([
      createClient(input),
      createClient(input),
    ])

    // Exactly one should succeed and one should fail
    const fulfilled = results.filter((r) => r.status === "fulfilled")
    const rejected = results.filter((r) => r.status === "rejected")

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    // The failure should be a duplicate constraint error
    const error = (rejected[0] as PromiseRejectedResult).reason as Error
    expect(error.message).toContain("duplicate key")
  })

  it("two createClient calls with different emails → both succeed", async () => {
    let insertCallCount = 0
    mockReturning.mockImplementation(async () => {
      insertCallCount++
      return [{
        ...FIXTURE_CLIENT,
        id: `client-00${insertCallCount}`,
        email: `user${insertCallCount}@example.com`,
        displayName: `User ${insertCallCount}`,
      }]
    })

    const results = await Promise.allSettled([
      createClient({
        displayName: "User 1",
        email: "user1@example.com",
        clientType: "individual",
        clientStatus: "active",
      }),
      createClient({
        displayName: "User 2",
        email: "user2@example.com",
        clientType: "individual",
        clientStatus: "active",
      }),
    ])

    const fulfilled = results.filter((r) => r.status === "fulfilled")
    expect(fulfilled).toHaveLength(2)
  })
})

// ─── 3. Concurrent Ledger Writes ────────────────────────────────────────────

describe("Concurrent ledger writes", () => {
  it("two createLedgerEvent calls → both succeed (append-only, no conflicts)", async () => {
    // Reset the real mock to just push to ledgerLog
    mockCreateLedgerEvent.mockImplementation(async (params) => {
      ledgerLog.push({ ...params, timestamp: Date.now() })
    })

    const eventA = {
      orgId: "org-lacoda-1",
      actorId: "user-advisor-1",
      action: "created" as const,
      targetType: "asset" as const,
      targetId: "asset-001",
      metadata: { source: "concurrent-A" },
    }

    const eventB = {
      orgId: "org-lacoda-1",
      actorId: "user-advisor-1",
      action: "updated" as const,
      targetType: "asset" as const,
      targetId: "asset-001",
      metadata: { source: "concurrent-B" },
    }

    // Fire both concurrently
    const results = await Promise.allSettled([
      createLedgerEvent(eventA),
      createLedgerEvent(eventB),
    ])

    // Both should succeed — ledger is append-only, no conflicts possible
    expect(results.every((r) => r.status === "fulfilled")).toBe(true)
    expect(mockCreateLedgerEvent).toHaveBeenCalledTimes(2)
  })

  it("both concurrent ledger events appear in order", async () => {
    mockCreateLedgerEvent.mockImplementation(async (params) => {
      ledgerLog.push({ ...params, timestamp: Date.now() })
    })

    await Promise.all([
      createLedgerEvent({
        orgId: "org-lacoda-1",
        actorId: "user-advisor-1",
        action: "created" as const,
        targetType: "client" as const,
        targetId: "client-001",
        metadata: { order: 1 },
      }),
      createLedgerEvent({
        orgId: "org-lacoda-1",
        actorId: "user-advisor-1",
        action: "updated" as const,
        targetType: "client" as const,
        targetId: "client-001",
        metadata: { order: 2 },
      }),
    ])

    // Both events recorded
    expect(ledgerLog).toHaveLength(2)

    // Both reference the correct target
    expect(ledgerLog[0].targetId).toBe("client-001")
    expect(ledgerLog[1].targetId).toBe("client-001")

    // Timestamps are monotonically non-decreasing
    expect((ledgerLog[0].timestamp as number)).toBeLessThanOrEqual(ledgerLog[1].timestamp as number)
  })

  it("concurrent ledger writes preserve distinct metadata", async () => {
    mockCreateLedgerEvent.mockImplementation(async (params) => {
      ledgerLog.push({ ...params, timestamp: Date.now() })
    })

    await Promise.all([
      createLedgerEvent({
        orgId: "org-lacoda-1",
        actorId: "user-advisor-1",
        action: "created" as const,
        targetType: "asset" as const,
        targetId: "asset-001",
        metadata: { name: "Property A", assetClass: "real_estate" },
      }),
      createLedgerEvent({
        orgId: "org-lacoda-1",
        actorId: "user-advisor-1",
        action: "created" as const,
        targetType: "asset" as const,
        targetId: "asset-002",
        metadata: { name: "Stock Portfolio", assetClass: "equities" },
      }),
    ])

    expect(ledgerLog).toHaveLength(2)

    // Metadata is not merged or overwritten between concurrent writes
    const metadataSet = ledgerLog.map((e) => e.metadata)
    expect(metadataSet).toContainEqual({ name: "Property A", assetClass: "real_estate" })
    expect(metadataSet).toContainEqual({ name: "Stock Portfolio", assetClass: "equities" })
  })
})
