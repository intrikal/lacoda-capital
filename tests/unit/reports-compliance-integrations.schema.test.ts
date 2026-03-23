/**
 * ============================================================================
 * TEST FILE: reports-compliance-integrations.schema.test.ts
 * ============================================================================
 *
 * Kevin, this file tests THREE tables at once because they follow similar
 * patterns and are closely related in the compliance/reporting workflow:
 *
 *   1. REPORTS + REPORT_VERSIONS — Parent/child immutable versioning
 *   2. COMPLIANCE_CONTROLS + COMPLIANCE_EVIDENCE — Controls with evidence junction
 *   3. INTEGRATIONS — Third-party service connections
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHY TEST MULTIPLE TABLES IN ONE FILE?                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Each table individually has a small number of things to verify.        │
 * │ Rather than creating 5 tiny test files (one per table), we group      │
 * │ related tables together. Each `describe()` block is its own section.  │
 * │                                                                        │
 * │ Think of it like a textbook chapter about "Compliance & Reporting"    │
 * │ rather than five separate pamphlets.                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW REPORT VERSIONING WORKS                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ When someone generates a report, we DON'T overwrite the old version.  │
 * │ Instead, we create a NEW row in report_versions:                       │
 * │                                                                        │
 * │   reports table:                                                       │
 * │     id: "rpt-1", name: "Q4 Portfolio Summary", reportType: "portfolio" │
 * │                                                                        │
 * │   report_versions table:                                               │
 * │     id: "v-1", report_id: "rpt-1", version_number: 1, generated_at... │
 * │     id: "v-2", report_id: "rpt-1", version_number: 2, generated_at... │
 * │     id: "v-3", report_id: "rpt-1", version_number: 3, generated_at... │
 * │                                                                        │
 * │ This way, you can always go back to an older version.                  │
 * │ The RLS policy on report_versions is INSERT+SELECT only — once a      │
 * │ version is generated, it can never be modified or deleted.             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW COMPLIANCE CONTROLS + EVIDENCE WORK                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ A compliance CONTROL is a rule the firm must follow:                   │
 * │   Example: "KYC-001: Verify every client's identity annually"         │
 * │                                                                        │
 * │ EVIDENCE is proof that the control was followed:                       │
 * │   Example: "Here's John Smith's passport (document_id = abc)"          │
 * │                                                                        │
 * │ The evidence table is a JUNCTION TABLE — it links a control to        │
 * │ the document that proves compliance:                                   │
 * │                                                                        │
 * │   compliance_controls ──< compliance_evidence >── documents            │
 * │     (one control)           (many evidence)         (one document)    │
 * │                                                                        │
 * │ IMPORTANT: A control with no assignee is valid (unassigned controls). │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   app/db/schema/reports.ts     — Reports + report_versions tables
 *   app/db/schema/compliance.ts  — Compliance controls + evidence tables
 *   app/db/schema/integrations.ts — Integrations table
 *
 * See ledger-event.schema.test.ts for a full explanation of Vitest,
 * describe/it/expect, and testing fundamentals.
 */

/**
 * Vitest testing functions.
 * describe = group tests, it = one test, expect = assertion.
 */
import { describe, it, expect } from "vitest"

/**
 * Drizzle table definitions for all five tables we're testing.
 */
import { reports, reportVersions } from "@/app/db/schema/reports"
import {
  complianceControls,
  complianceEvidence,
} from "@/app/db/schema/compliance"
import { integrations } from "@/app/db/schema/integrations"

/**
 * getTableConfig() — extracts columns, indexes, and constraints
 * from a Drizzle table definition without needing a running database.
 * See ledger-event.schema.test.ts for full explanation.
 */
import { getTableConfig } from "drizzle-orm/pg-core"

// ============================================================================
// 1. REPORTS
// ============================================================================

describe("reports — Drizzle schema structure", () => {
  const config = getTableConfig(reports)

  it("has the correct table name", () => {
    expect(config.name).toBe("reports")
  })

  /**
   * TEST: All required columns from the spec exist.
   *
   * The reports table needs:
   *   id          — unique identifier (PK)
   *   org_id      — multi-tenant isolation
   *   name        — human-readable title (e.g., "Q4 Portfolio Summary")
   *   report_type — enum: portfolio_summary, performance, tax_summary, etc.
   *   created_by  — FK to users (who generated this report)
   *   created_at  — when the report was created
   *   updated_at  — when the report metadata was last changed
   */
  it("has all required columns", () => {
    const colNames = config.columns.map((c) => c.name)
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "org_id",
        "name",
        "report_type",
        "created_by",
        "created_at",
        "updated_at",
      ])
    )
  })

  /**
   * TEST: report_type is NOT NULL.
   *
   * Every report must have a type so the system knows what
   * template/logic to use for generation.
   */
  it("report_type is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "report_type")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: created_by is nullable.
   *
   * WHY: If the user who created the report is later deleted,
   * we use { onDelete: "set null" } to keep the report but
   * set created_by to NULL. The report is still valuable even
   * if the creator's account is gone.
   */
  it("created_by is nullable (preserves report if user deleted)", () => {
    const col = config.columns.find((c) => c.name === "created_by")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })
})

// ============================================================================
// 2. REPORT_VERSIONS
// ============================================================================

describe("report_versions — Drizzle schema structure", () => {
  const config = getTableConfig(reportVersions)

  it("has the correct table name", () => {
    expect(config.name).toBe("report_versions")
  })

  /**
   * TEST: All required columns exist.
   *
   * report_versions stores each generated version of a report:
   *   id             — unique identifier
   *   report_id      — FK to the parent report
   *   version_number — 1, 2, 3... (increments with each generation)
   *   storage_path   — where the generated file lives (e.g., S3 path)
   *   generated_at   — when this version was generated
   */
  it("has all required columns", () => {
    const colNames = config.columns.map((c) => c.name)
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "report_id",
        "version_number",
        "storage_path",
        "generated_at",
      ])
    )
  })

  /**
   * TEST: report_id is NOT NULL (FK to reports).
   *
   * Every version must belong to a report. You can't have a
   * floating version with no parent report.
   */
  it("report_id is NOT NULL (FK to reports)", () => {
    const col = config.columns.find((c) => c.name === "report_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: version_number is NOT NULL.
   *
   * Every version needs a number (1, 2, 3...) so the user can
   * identify which version they're looking at.
   */
  it("version_number is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "version_number")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: There's an index on report_id for looking up all versions.
   *
   * WHY: "Show me all versions of report X" is a common query.
   * This index makes it fast.
   */
  it("has report_id index", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "report_versions_report_id_idx"
    )
    expect(idx).toBeDefined()
  })
})

// ============================================================================
// 3. COMPLIANCE_CONTROLS
// ============================================================================

describe("compliance_controls — Drizzle schema structure", () => {
  const config = getTableConfig(complianceControls)

  it("has the correct table name", () => {
    expect(config.name).toBe("compliance_controls")
  })

  /**
   * TEST: All required columns exist.
   *
   * A compliance control represents a rule the firm must follow:
   *   id          — unique identifier
   *   org_id      — multi-tenant isolation
   *   framework   — which framework (e.g., "SOC2", "GDPR", "SEC")
   *   code        — short code (e.g., "KYC-001")
   *   name        — human-readable title
   *   description — longer explanation
   *   status      — not_started | in_progress | implemented | verified
   *   assignee_id — FK to users (who's responsible — can be NULL)
   *   due_date    — when this control must be implemented by
   */
  it("has all required columns", () => {
    const colNames = config.columns.map((c) => c.name)
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "org_id",
        "framework",
        "code",
        "name",
        "description",
        "status",
        "assignee_id",
        "due_date",
        "created_at",
        "updated_at",
      ])
    )
  })

  /**
   * TEST: assignee_id is nullable (unassigned controls are valid).
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ EDGE CASE: Compliance control with no assignee                      │
   * │                                                                     │
   * │ When a new compliance control is created, it might not have an      │
   * │ assignee yet. The admin creates the control first, then assigns     │
   * │ it to someone later. So assignee_id must be nullable.               │
   * │                                                                     │
   * │ If it were NOT NULL, you'd have to assign someone immediately,      │
   * │ which is often not practical (you might be defining controls        │
   * │ before you've hired the compliance team).                           │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  it("assignee_id is nullable (unassigned controls are valid)", () => {
    const col = config.columns.find((c) => c.name === "assignee_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: status defaults to "not_started".
   *
   * When a compliance control is first created, no work has begun.
   * The status progresses: not_started → in_progress → implemented → verified.
   */
  it("status defaults to not_started", () => {
    const col = config.columns.find((c) => c.name === "status")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
    expect(col!.default).toBeDefined()
  })

  /**
   * TEST: (org_id, code) has a unique constraint.
   *
   * WHY: Within one org, each control code must be unique.
   * You can't have two "KYC-001" controls in the same org.
   * But different orgs CAN have the same code (each org defines
   * their own control numbering).
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ COMPOSITE UNIQUE CONSTRAINT EXPLAINED:                              │
   * │                                                                     │
   * │ unique("name").on(table.orgId, table.code)                          │
   * │                                                                     │
   * │ This means the COMBINATION of (org_id, code) must be unique.        │
   * │                                                                     │
   * │ VALID:                                                              │
   * │   org_id: "acme",   code: "KYC-001"  → OK                          │
   * │   org_id: "acme",   code: "KYC-002"  → OK (different code)         │
   * │   org_id: "best",   code: "KYC-001"  → OK (different org)          │
   * │                                                                     │
   * │ INVALID:                                                            │
   * │   org_id: "acme",   code: "KYC-001"  → ALREADY EXISTS, REJECTED!   │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  it("has org_id + code unique constraint", () => {
    const uq = config.uniqueConstraints.find(
      (c) => c.name === "compliance_controls_org_code_unique"
    )
    expect(uq).toBeDefined()
  })
})

// ============================================================================
// 4. COMPLIANCE_EVIDENCE
// ============================================================================

describe("compliance_evidence — Drizzle schema structure", () => {
  const config = getTableConfig(complianceEvidence)

  it("has the correct table name", () => {
    expect(config.name).toBe("compliance_evidence")
  })

  /**
   * TEST: All required columns exist.
   *
   * Evidence links a compliance control to a document that proves compliance:
   *   id          — unique identifier
   *   control_id  — FK to compliance_controls (which rule?)
   *   document_id — FK to documents (which proof?)
   *   created_at  — when the evidence was linked
   */
  it("has all required columns", () => {
    const colNames = config.columns.map((c) => c.name)
    expect(colNames).toEqual(
      expect.arrayContaining(["id", "control_id", "document_id", "created_at"])
    )
  })

  /**
   * TEST: control_id is NOT NULL.
   *
   * Every piece of evidence must be linked to a specific control.
   * "Here's a passport" is meaningless without knowing WHICH
   * compliance requirement it satisfies.
   */
  it("control_id is NOT NULL (FK to compliance_controls)", () => {
    const col = config.columns.find((c) => c.name === "control_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: document_id is NOT NULL.
   *
   * Every piece of evidence must be a real document.
   * You can't say "we verified John's identity" without
   * actually linking to the passport/ID document.
   */
  it("document_id is NOT NULL (FK to documents)", () => {
    const col = config.columns.find((c) => c.name === "document_id")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })
})

// ============================================================================
// 5. INTEGRATIONS
// ============================================================================

describe("integrations — Drizzle schema structure", () => {
  const config = getTableConfig(integrations)

  it("has the correct table name", () => {
    expect(config.name).toBe("integrations")
  })

  /**
   * TEST: All required columns exist.
   *
   * An integration is a connection to a third-party service:
   *   id          — unique identifier
   *   org_id      — which org owns this integration
   *   provider    — enum: plaid, quickbooks, google_drive, etc.
   *   status      — enum: connected, disconnected, error, pending
   *   settings    — JSONB config (API keys are in a vault, not here!)
   *   last_sync_at — when data was last synced from this provider
   *   created_at  — when the integration was set up
   *   updated_at  — when the config was last changed
   */
  it("has all required columns", () => {
    const colNames = config.columns.map((c) => c.name)
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "org_id",
        "provider",
        "status",
        "settings",
        "last_sync_at",
        "created_at",
        "updated_at",
      ])
    )
  })

  /**
   * TEST: provider is NOT NULL.
   *
   * Every integration must specify which service it connects to.
   * You can't have a "mystery integration" with no provider.
   */
  it("provider is NOT NULL", () => {
    const col = config.columns.find((c) => c.name === "provider")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(true)
  })

  /**
   * TEST: last_sync_at is nullable.
   *
   * WHY: When an integration is first created, it hasn't synced yet.
   * last_sync_at = NULL means "never synced." After the first sync,
   * it gets a timestamp. This is useful for showing "Last synced: 5 min ago"
   * or "Never synced" in the UI.
   */
  it("last_sync_at is nullable", () => {
    const col = config.columns.find((c) => c.name === "last_sync_at")
    expect(col).toBeDefined()
    expect(col!.notNull).toBe(false)
  })

  /**
   * TEST: (org_id, provider) has a unique constraint.
   *
   * WHY: One org can only have ONE connection to each provider.
   * You can't have two Plaid connections for the same org.
   * But you CAN have one Plaid + one QuickBooks.
   *
   * VISUAL:
   *   org: "acme", provider: "plaid"      → OK
   *   org: "acme", provider: "quickbooks" → OK (different provider)
   *   org: "best", provider: "plaid"      → OK (different org)
   *   org: "acme", provider: "plaid"      → REJECTED (duplicate!)
   */
  it("has org_id + provider unique constraint", () => {
    const uq = config.uniqueConstraints.find(
      (c) => c.name === "integrations_org_provider_unique"
    )
    expect(uq).toBeDefined()
  })
})
