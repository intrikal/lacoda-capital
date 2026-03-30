import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Integration tests for audit logging from non-user actors.
 *
 * Tests that API key requests and portal token accesses produce ledger events
 * with the correct actorType in metadata, and that the null-actorId guard works.
 */

const mockInsert = vi.fn()

vi.mock("@/app/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: mockInsert,
    })),
  },
}))

vi.mock("@/app/db/schema", () => ({
  ledgerEvents: {},
}))

// Import after mocks are registered
import { createLedgerEvent } from "@/lib/actions/ledger"

const BASE = {
  orgId: "org-123",
  targetId: "target-456",
} as const

beforeEach(() => {
  mockInsert.mockResolvedValue([])
})

// ── API key actor ─────────────────────────────────────────────────────────────

describe("API key audit logging", () => {
  it("inserts a ledger event with actorType 'api_key' in the payload", async () => {
    await createLedgerEvent({
      ...BASE,
      actorId: null,
      action: "created",
      targetType: "asset",
      metadata: {
        actorType: "api_key",
        keyId: "key-abc",
        keyName: "My Integration Key",
      },
      ipAddress: "1.2.3.4",
    })

    expect(mockInsert).toHaveBeenCalledOnce()
    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.actorUserId).toBeNull()
    expect(inserted.payload).toMatchObject({
      actorType: "api_key",
      keyId: "key-abc",
      keyName: "My Integration Key",
    })
    expect(inserted.action).toBe("created")
    expect(inserted.targetType).toBe("asset")
    expect(inserted.ipAddress).toBe("1.2.3.4")
  })

  it("logs api_read events for financial data reads via API key", async () => {
    await createLedgerEvent({
      ...BASE,
      actorId: null,
      action: "api_read",
      targetType: "asset",
      metadata: {
        actorType: "api_key",
        keyId: "key-abc",
        keyName: "Reporting Key",
      },
    })

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.action).toBe("api_read")
    expect(inserted.payload).toMatchObject({ actorType: "api_key" })
  })
})

// ── Portal token actor ────────────────────────────────────────────────────────

describe("portal token audit logging", () => {
  it("inserts a ledger event with actorType 'portal_token' in the payload", async () => {
    await createLedgerEvent({
      ...BASE,
      actorId: null,
      action: "portal_accessed",
      targetType: "stakeholder_portal",
      metadata: {
        actorType: "portal_token",
        accessedBy: "investor@example.com",
      },
      ipAddress: "5.6.7.8",
    })

    expect(mockInsert).toHaveBeenCalledOnce()
    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.actorUserId).toBeNull()
    expect(inserted.payload).toMatchObject({
      actorType: "portal_token",
      accessedBy: "investor@example.com",
    })
    expect(inserted.action).toBe("portal_accessed")
    expect(inserted.targetType).toBe("stakeholder_portal")
    expect(inserted.ipAddress).toBe("5.6.7.8")
  })
})

// ── Normal user actor (regression) ───────────────────────────────────────────

describe("normal user actor (regression)", () => {
  it("inserts a ledger event with actorUserId when actorId is a string", async () => {
    await createLedgerEvent({
      ...BASE,
      actorId: "user-789",
      action: "created",
      targetType: "asset",
      metadata: { source: "ui" },
    })

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.actorUserId).toBe("user-789")
    expect(inserted.action).toBe("created")
  })

  it("strips sensitive keys from metadata", async () => {
    await createLedgerEvent({
      ...BASE,
      actorId: "user-789",
      action: "updated",
      targetType: "asset",
      metadata: { label: "update", token: "should-be-stripped", secret: "also-stripped" },
    })

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.payload).not.toHaveProperty("token")
    expect(inserted.payload).not.toHaveProperty("secret")
    expect(inserted.payload).toHaveProperty("label", "update")
  })
})

// ── Guard: null actorId without actorType ─────────────────────────────────────

describe("null actorId guard", () => {
  it("throws when actorId is null and metadata.actorType is missing", async () => {
    await expect(
      createLedgerEvent({
        ...BASE,
        actorId: null,
        action: "created",
        targetType: "asset",
        // no metadata
      })
    ).rejects.toThrow("actorId or metadata.actorType is required")
  })

  it("throws when actorId is null and metadata exists but actorType is absent", async () => {
    await expect(
      createLedgerEvent({
        ...BASE,
        actorId: null,
        action: "created",
        targetType: "asset",
        metadata: { someOtherKey: "value" },
      })
    ).rejects.toThrow("actorId or metadata.actorType is required")
  })

  it("does not throw when actorId is null and metadata.actorType is set", async () => {
    await expect(
      createLedgerEvent({
        ...BASE,
        actorId: null,
        action: "created",
        targetType: "asset",
        metadata: { actorType: "api_key", keyId: "k1", keyName: "k" },
      })
    ).resolves.not.toThrow()
  })
})
