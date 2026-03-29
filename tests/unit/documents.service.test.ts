/**
 * ============================================================================
 * TEST FILE: documents.service.test.ts
 * ============================================================================
 *
 * Kevin, this tests the documents service which reads from the `documents` DB
 * table. Notice the mixed chain patterns:
 *
 *   getDocuments          → .from().where(isNull).orderBy(desc)  terminal: orderBy
 *   getDocumentById       → .from().where(eq)                    terminal: where
 *   getDocumentsByAsset   → .from().where(eq)                    terminal: where
 *   getDocumentsByClient  → .from().where(eq)                    terminal: where
 *   getDocumentsByStatus  → .from().where(eq)                    terminal: where
 *   getDocumentStats      → calls getDocuments() internally      terminal: orderBy
 *
 * RELATED FILES:
 *   lib/services/documents.service.ts  — service under test
 *   app/db/schema/documents.ts         — documents table definition
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/app/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/app/db"
import {
  getDocuments,
  getDocumentById,
  getDocumentsByAsset,
  getDocumentsByClient,
  getDocumentsByStatus,
  getDocumentStats,
} from "@/lib/services/documents.service"

// ============================================================================
// HELPERS
// ============================================================================

function makeChain(terminal: string, value: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  chain[terminal] = vi.fn().mockResolvedValue(value)
  return chain
}

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-001",
    name: "Property Insurance Policy",
    mimeType: "application/pdf",
    status: "verified",
    assetId: "asset-001",
    clientId: null,
    uploadedBy: "user-advisor-001",
    createdAt: new Date("2024-01-15T10:00:00Z"),
    expiresAt: new Date("2025-01-15T00:00:00Z"),
    fileSize: "204800",
    tags: ["insurance", "property"],
    folder: "legal",
    deletedAt: null,
    ...overrides,
  }
}

// ============================================================================
// 1. toDocument — DB row to Document mapping (tested via getDocuments)
// ============================================================================

describe("toDocument — DB row to Document mapping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps required fields correctly", async () => {
    const row = makeDbRow()
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    const doc = docs[0]

    expect(doc.id).toBe("doc-001")
    expect(doc.name).toBe("Property Insurance Policy")
    expect(doc.type).toBe("application/pdf")
    expect(doc.status).toBe("verified")
    expect(doc.assetId).toBe("asset-001")
    expect(doc.uploadedBy).toBe("user-advisor-001")
    expect(doc.uploadedAt).toBe("2024-01-15T10:00:00.000Z")
    expect(doc.size).toBe("204800")
    expect(doc.folder).toBe("legal")
  })

  it("maps null mimeType to application/pdf default", async () => {
    const row = makeDbRow({ mimeType: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    expect(docs[0].type).toBe("application/pdf")
  })

  it("maps null status to pending default", async () => {
    const row = makeDbRow({ status: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    expect(docs[0].status).toBe("pending")
  })

  it("maps null assetId to undefined", async () => {
    const row = makeDbRow({ assetId: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    expect(docs[0].assetId).toBeUndefined()
  })

  it("maps null clientId to undefined", async () => {
    const row = makeDbRow({ clientId: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    expect(docs[0].clientId).toBeUndefined()
  })

  it("maps null expiresAt to undefined", async () => {
    const row = makeDbRow({ expiresAt: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    expect(docs[0].expiresAt).toBeUndefined()
  })

  it("converts expiresAt Date to ISO string", async () => {
    const row = makeDbRow({ expiresAt: new Date("2025-01-15T00:00:00Z") })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    expect(docs[0].expiresAt).toBe("2025-01-15T00:00:00.000Z")
  })

  it("maps null tags to empty array", async () => {
    const row = makeDbRow({ tags: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    expect(docs[0].tags).toEqual([])
  })

  it("maps null folder to empty string", async () => {
    const row = makeDbRow({ folder: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const docs = await getDocuments()
    expect(docs[0].folder).toBe("")
  })
})

// ============================================================================
// 2. getDocuments
// ============================================================================

describe("getDocuments", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no documents exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const docs = await getDocuments()
    expect(docs).toEqual([])
  })

  it("returns all rows from the DB", async () => {
    const rows = [makeDbRow({ id: "d1" }), makeDbRow({ id: "d2" }), makeDbRow({ id: "d3" })]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const docs = await getDocuments()
    expect(docs).toHaveLength(3)
  })

  it("applies the deletedAt IS NULL filter (where was called)", async () => {
    const chain = makeChain("orderBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getDocuments()
    expect(chain.where).toHaveBeenCalled()
  })

  it("applies orderBy for sort by createdAt desc", async () => {
    const chain = makeChain("orderBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getDocuments()
    expect(chain.orderBy).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("orderBy", [])
    chain.orderBy.mockRejectedValue(new Error("Connection refused"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getDocuments()).rejects.toThrow("Connection refused")
  })
})

// ============================================================================
// 3. getDocumentById
// ============================================================================

describe("getDocumentById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns mapped Document when found", async () => {
    const row = makeDbRow({ id: "doc-007" })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const doc = await getDocumentById("doc-007")
    expect(doc).toBeDefined()
    expect(doc!.id).toBe("doc-007")
  })

  it("returns undefined when not found", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const doc = await getDocumentById("no-such-doc")
    expect(doc).toBeUndefined()
  })
})

// ============================================================================
// 4. getDocumentsByAsset
// ============================================================================

describe("getDocumentsByAsset", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns documents for the given assetId", async () => {
    const rows = [
      makeDbRow({ id: "d1", assetId: "asset-999" }),
      makeDbRow({ id: "d2", assetId: "asset-999" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const docs = await getDocumentsByAsset("asset-999")
    expect(docs).toHaveLength(2)
  })

  it("returns empty array when asset has no documents", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const docs = await getDocumentsByAsset("asset-empty")
    expect(docs).toEqual([])
  })
})

// ============================================================================
// 5. getDocumentsByClient
// ============================================================================

describe("getDocumentsByClient", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns documents for the given clientId", async () => {
    const rows = [makeDbRow({ id: "d1", clientId: "client-001", assetId: null })]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const docs = await getDocumentsByClient("client-001")
    expect(docs).toHaveLength(1)
    expect(docs[0].clientId).toBe("client-001")
  })

  it("returns empty array when client has no documents", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const docs = await getDocumentsByClient("client-empty")
    expect(docs).toEqual([])
  })
})

// ============================================================================
// 6. getDocumentsByStatus
// ============================================================================

describe("getDocumentsByStatus", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns documents with the given status", async () => {
    const rows = [makeDbRow({ status: "expired" }), makeDbRow({ id: "d2", status: "expired" })]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const docs = await getDocumentsByStatus("expired")
    expect(docs).toHaveLength(2)
    for (const d of docs) {
      expect(d.status).toBe("expired")
    }
  })

  it("returns empty array when no documents have that status", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const docs = await getDocumentsByStatus("missing")
    expect(docs).toEqual([])
  })
})

// ============================================================================
// 7. getDocumentStats — aggregation
// ============================================================================

describe("getDocumentStats", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns all-zero stats when no documents exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const stats = await getDocumentStats()
    expect(stats.total).toBe(0)
    expect(stats.verified).toBe(0)
    expect(stats.pending).toBe(0)
    expect(stats.expired).toBe(0)
    expect(stats.missing).toBe(0)
  })

  it("total equals the number of rows returned", async () => {
    const rows = [makeDbRow({ id: "d1" }), makeDbRow({ id: "d2" }), makeDbRow({ id: "d3" })]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const stats = await getDocumentStats()
    expect(stats.total).toBe(3)
  })

  it("correctly counts each status bucket", async () => {
    const rows = [
      makeDbRow({ id: "d1", status: "verified" }),
      makeDbRow({ id: "d2", status: "verified" }),
      makeDbRow({ id: "d3", status: "pending" }),
      makeDbRow({ id: "d4", status: "expired" }),
      makeDbRow({ id: "d5", status: "missing" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const stats = await getDocumentStats()
    expect(stats.verified).toBe(2)
    expect(stats.pending).toBe(1)
    expect(stats.expired).toBe(1)
    expect(stats.missing).toBe(1)
    expect(stats.total).toBe(5)
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("orderBy", [])
    chain.orderBy.mockRejectedValue(new Error("Database unavailable"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getDocumentStats()).rejects.toThrow("Database unavailable")
  })
})
