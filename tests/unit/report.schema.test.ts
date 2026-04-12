import { describe, it, expect } from "vitest"
import {
  createReportSchema,
  updateReportSchema,
  reportTypeEnum,
  reportStatusEnum,
} from "@/lib/validations/report.schema"

// ============================================================================
// createReportSchema
// ============================================================================

describe("createReportSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts a valid complete payload", () => {
    const result = createReportSchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Q4 2024 Portfolio Summary",
      description: "End of year portfolio overview for all managed accounts",
      reportType: "portfolio_summary",
      parameters: { year: 2024, quarter: 4, includeCharts: true },
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal payload (only required fields)", () => {
    const result = createReportSchema.safeParse({
      name: "Annual Performance Report",
      reportType: "performance",
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid report types", () => {
    const reportTypes = [
      "portfolio_summary",
      "asset_allocation",
      "performance",
      "tax_summary",
      "compliance",
      "client_statement",
      "custom",
    ]
    for (const reportType of reportTypes) {
      const result = createReportSchema.safeParse({
        name: "Test Report",
        reportType,
      })
      expect(result.success).toBe(true)
    }
  })

  // ── Missing required fields ────────────────────────────────────────────────

  it("rejects missing name", () => {
    const result = createReportSchema.safeParse({
      reportType: "performance",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing reportType", () => {
    const result = createReportSchema.safeParse({
      name: "Annual Performance Report",
    })
    expect(result.success).toBe(false)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects invalid reportType", () => {
    const result = createReportSchema.safeParse({
      name: "Test Report",
      reportType: "profit_loss",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-UUID clientId", () => {
    const result = createReportSchema.safeParse({
      clientId: "not-a-uuid",
      name: "Client Report",
      reportType: "client_statement",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-string name", () => {
    const result = createReportSchema.safeParse({
      name: 42,
      reportType: "performance",
    })
    expect(result.success).toBe(false)
  })

  // ── Boundary values ────────────────────────────────────────────────────────

  it("rejects empty string name", () => {
    const result = createReportSchema.safeParse({
      name: "",
      reportType: "performance",
    })
    expect(result.success).toBe(false)
  })

  it("rejects name over 255 characters", () => {
    const result = createReportSchema.safeParse({
      name: "A".repeat(256),
      reportType: "performance",
    })
    expect(result.success).toBe(false)
  })

  it("rejects description over 1000 characters", () => {
    const result = createReportSchema.safeParse({
      name: "Test Report",
      reportType: "performance",
      description: "A".repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace from name", () => {
    const result = createReportSchema.safeParse({
      name: "  Q4 Report  ",
      reportType: "portfolio_summary",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Q4 Report")
    }
  })

  it("allows null clientId", () => {
    const result = createReportSchema.safeParse({
      clientId: null,
      name: "Firm-wide Report",
      reportType: "compliance",
    })
    expect(result.success).toBe(true)
  })

  it("allows null description", () => {
    const result = createReportSchema.safeParse({
      name: "Tax Summary",
      reportType: "tax_summary",
      description: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts parameters as a record of unknown values", () => {
    const result = createReportSchema.safeParse({
      name: "Custom Report",
      reportType: "custom",
      parameters: {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        metrics: ["irr", "tvpi", "dpi"],
        threshold: 0.15,
      },
    })
    expect(result.success).toBe(true)
  })

  it("optional fields can be omitted", () => {
    const result = createReportSchema.safeParse({
      name: "Simple Report",
      reportType: "asset_allocation",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clientId).toBeUndefined()
      expect(result.data.description).toBeUndefined()
      expect(result.data.parameters).toBeUndefined()
    }
  })
})

// ============================================================================
// updateReportSchema
// ============================================================================

describe("updateReportSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts an empty object (all fields optional)", () => {
    const result = updateReportSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with name only", () => {
    const result = updateReportSchema.safeParse({
      name: "Updated Report Name",
    })
    expect(result.success).toBe(true)
  })

  it("accepts partial update with status only", () => {
    const result = updateReportSchema.safeParse({
      status: "published",
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid statuses", () => {
    const statuses = ["draft", "published", "archived"]
    for (const status of statuses) {
      const result = updateReportSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it("accepts a complete update payload", () => {
    const result = updateReportSchema.safeParse({
      name: "Updated Q4 Report",
      description: "Updated description for Q4 portfolio",
      status: "published",
      parameters: { revised: true },
    })
    expect(result.success).toBe(true)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects invalid status", () => {
    const result = updateReportSchema.safeParse({
      status: "active",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string name", () => {
    const result = updateReportSchema.safeParse({
      name: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects name over 255 characters", () => {
    const result = updateReportSchema.safeParse({
      name: "A".repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it("rejects description over 1000 characters", () => {
    const result = updateReportSchema.safeParse({
      description: "A".repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it("allows null description", () => {
    const result = updateReportSchema.safeParse({
      description: null,
    })
    expect(result.success).toBe(true)
  })

  it("trims whitespace from name", () => {
    const result = updateReportSchema.safeParse({
      name: "  Trimmed Name  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Trimmed Name")
    }
  })
})

// ============================================================================
// Enum validators
// ============================================================================

describe("reportTypeEnum", () => {
  it("accepts all valid report types", () => {
    const types = [
      "portfolio_summary", "asset_allocation", "performance",
      "tax_summary", "compliance", "client_statement", "custom",
    ]
    for (const t of types) {
      expect(reportTypeEnum.safeParse(t).success).toBe(true)
    }
  })

  it("rejects unknown report type", () => {
    expect(reportTypeEnum.safeParse("profit_loss").success).toBe(false)
  })
})

describe("reportStatusEnum", () => {
  it("accepts all valid statuses", () => {
    const statuses = ["draft", "published", "archived"]
    for (const status of statuses) {
      expect(reportStatusEnum.safeParse(status).success).toBe(true)
    }
  })

  it("rejects unknown status", () => {
    expect(reportStatusEnum.safeParse("active").success).toBe(false)
  })
})
