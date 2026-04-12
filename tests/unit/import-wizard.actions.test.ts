/**
 * Unit tests for import-wizard server actions.
 *
 * Tests:
 *   - validateImportWithDuplicates: valid CSV rows → mapped preview
 *   - validateImportWithDuplicates: missing name column → validation errors
 *   - validateImportWithDuplicates: duplicate asset names → flagged as duplicates
 *   - executeImportWithConflictResolution: creates assets from valid rows
 *   - executeImportWithConflictResolution: duplicate rows with skip mode
 *   - executeImportWithConflictResolution: no entities → returns error
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock auth ────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn().mockResolvedValue({
    userId: "user-123",
    orgId: "org-456",
    role: "assistant",
  }),
  requireAuth: vi.fn().mockResolvedValue({
    userId: "user-123",
    orgId: "org-456",
    role: "assistant",
  }),
}))

// ─── Mock analytics ───────────────────────────────────────────────────────────

vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: vi.fn(),
}))

// ─── Mock ledger ──────────────────────────────────────────────────────────────

vi.mock("@/lib/actions/ledger", () => ({
  createLedgerEvent: vi.fn().mockResolvedValue(undefined),
}))

// ─── Mock DB ─────────────────────────────────────────────────────────────────

// Responses are consumed in the order queries are executed
let selectCallCount = 0
const selectResponses: unknown[][] = []

const mockReturning = vi.fn()

// Each terminal method (.where() when not chained further, or .limit()) pops
// the next response. We track whether .limit() was called on a .where() result
// by making .where() return an object that is BOTH awaitable and has .limit().
function makeTerminalNode() {
  const response = () => {
    const r = selectResponses[selectCallCount] ?? []
    selectCallCount++
    return Promise.resolve(r)
  }
  // Make this object thenable (awaitable) AND support .limit()
  const node = {
    then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
      return response().then(resolve, reject)
    },
    limit: () => response(),
  }
  return node
}

function makeQueryBuilder(): Record<string, unknown> {
  const self: Record<string, unknown> = {}
  self.from = () => self
  self.innerJoin = () => self
  self.where = () => makeTerminalNode()
  self.limit = () => {
    const r = selectResponses[selectCallCount] ?? []
    selectCallCount++
    return Promise.resolve(r)
  }
  return self
}

vi.mock("@/app/db", () => ({
  db: {
    select: () => makeQueryBuilder(),
    insert: () => ({
      values: () => ({
        returning: mockReturning,
      }),
    }),
  },
}))

vi.mock("@/app/db/schema", () => ({
  assets: { id: "id", name: "name", entityId: "entityId" },
  entities: { id: "id", name: "name", clientId: "clientId" },
  clients: { id: "id", orgId: "orgId" },
}))

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import {
  validateImportWithDuplicates,
  executeImportWithConflictResolution,
  type ImportWizardRow,
  type ImportFieldMapping,
} from "@/lib/actions/import-wizard.actions"

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("validateImportWithDuplicates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    selectResponses.length = 0
  })

  it("valid rows → returns mapped preview with correct counts", async () => {
    // First select: existing assets (none)
    selectResponses[0] = []
    // Second select: org entities
    selectResponses[1] = [{ id: "ent-1", name: "Smith Trust" }]

    const rows: ImportWizardRow[] = [
      { "Asset Name": "Apple Stock", "Class": "equities" },
      { "Asset Name": "Main Street Property", "Class": "real_estate" },
    ]

    const mapping: ImportFieldMapping = {
      "Asset Name": "name",
      "Class": "assetClass",
    }

    const result = await validateImportWithDuplicates(rows, mapping)
    expect(result.totalRows).toBe(2)
    expect(result.validRows).toHaveLength(2)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.duplicates).toHaveLength(0)
  })

  it("missing required name column → rows land in invalidRows", async () => {
    selectResponses[0] = []
    selectResponses[1] = []

    const rows: ImportWizardRow[] = [
      { "Value": "100000" }, // no name
    ]

    const mapping: ImportFieldMapping = {
      "Value": "value",
    }

    const result = await validateImportWithDuplicates(rows, mapping)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0].errors).toContain("Name is required")
  })

  it("duplicate asset names → rows land in duplicates with existingId set", async () => {
    selectResponses[0] = [{ id: "asset-existing", name: "Apple Stock" }]
    selectResponses[1] = []

    const rows: ImportWizardRow[] = [
      { "Asset Name": "Apple Stock" },
    ]

    const mapping: ImportFieldMapping = {
      "Asset Name": "name",
    }

    const result = await validateImportWithDuplicates(rows, mapping)
    expect(result.duplicates).toHaveLength(1)
    expect(result.duplicates[0].existingId).toBe("asset-existing")
    expect(result.validRows).toHaveLength(0)
  })

  it("invalid value format → row is invalid with error", async () => {
    selectResponses[0] = []
    selectResponses[1] = []

    const rows: ImportWizardRow[] = [
      { "Asset Name": "Test Asset", "Value": "not-a-number" },
    ]

    const mapping: ImportFieldMapping = {
      "Asset Name": "name",
      "Value": "value",
    }

    const result = await validateImportWithDuplicates(rows, mapping)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.invalidRows[0].errors[0]).toMatch(/invalid value/i)
  })

  it("mixed valid and invalid rows are separated correctly", async () => {
    selectResponses[0] = []
    selectResponses[1] = []

    const rows: ImportWizardRow[] = [
      { "Asset Name": "Valid Asset" },
      { "Other Column": "No name here" },
    ]

    const mapping: ImportFieldMapping = {
      "Asset Name": "name",
    }

    const result = await validateImportWithDuplicates(rows, mapping)
    expect(result.validRows).toHaveLength(1)
    expect(result.invalidRows).toHaveLength(1)
    expect(result.totalRows).toBe(2)
  })
})

describe("executeImportWithConflictResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    selectResponses.length = 0
  })

  it("creates assets from valid rows", async () => {
    // First select (for default entity):
    selectResponses[0] = [{ id: "ent-1" }]
    mockReturning.mockResolvedValue([{ id: "new-asset-1", name: "Apple Stock" }])

    const validRows = [
      {
        rowIndex: 1,
        valid: true,
        isDuplicate: false,
        existingId: null,
        errors: [],
        data: { name: "Apple Stock", assetClass: "equities" },
      },
    ]

    const result = await executeImportWithConflictResolution(validRows, [], "skip")
    expect(result.created).toBe(1)
    expect(result.failed).toBe(0)
    expect(mockReturning).toHaveBeenCalled()
  })

  it("no entities in org → returns error without inserting", async () => {
    selectResponses[0] = [] // no entities

    const validRows = [
      {
        rowIndex: 1,
        valid: true,
        isDuplicate: false,
        existingId: null,
        errors: [],
        data: { name: "Test Asset" },
      },
    ]

    const result = await executeImportWithConflictResolution(validRows, [], "skip")
    expect(result.failed).toBe(1)
    expect(result.errors[0].message).toMatch(/no entities/i)
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it("duplicate rows with skip mode → increments skipped counter", async () => {
    selectResponses[0] = [{ id: "ent-1" }]

    const duplicateRows = [
      {
        rowIndex: 2,
        valid: true,
        isDuplicate: true,
        existingId: "asset-old",
        errors: [],
        data: { name: "Existing Asset" },
      },
    ]

    const result = await executeImportWithConflictResolution([], duplicateRows, "skip")
    expect(result.skipped).toBe(1)
    expect(result.created).toBe(0)
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it("duplicate rows with create mode → creates new asset anyway", async () => {
    selectResponses[0] = [{ id: "ent-1" }]
    mockReturning.mockResolvedValue([{ id: "forced-new", name: "Existing Asset" }])

    const duplicateRows = [
      {
        rowIndex: 2,
        valid: true,
        isDuplicate: true,
        existingId: "asset-old",
        errors: [],
        data: { name: "Existing Asset", assetClass: "equities" },
      },
    ]

    const result = await executeImportWithConflictResolution([], duplicateRows, "create")
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)
  })

  it("DB error during insert → records in failed errors without crashing", async () => {
    selectResponses[0] = [{ id: "ent-1" }]
    mockReturning.mockRejectedValueOnce(new Error("unique constraint violated"))

    const validRows = [
      {
        rowIndex: 1,
        valid: true,
        isDuplicate: false,
        existingId: null,
        errors: [],
        data: { name: "Duplicate Name" },
      },
    ]

    const result = await executeImportWithConflictResolution(validRows, [], "skip")
    expect(result.failed).toBe(1)
    expect(result.errors[0].row).toBe(1)
    expect(result.errors[0].message).toMatch(/unique constraint/i)
  })
})
