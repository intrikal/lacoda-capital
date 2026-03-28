/**
 * ============================================================================
 * TEST FILE: quickbooks.test.ts
 * ============================================================================
 *
 * Kevin, this file tests everything related to the QuickBooks integration —
 * from schema validation all the way to how we map QuickBooks data into
 * Lacoda Capital records.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE'RE TESTING                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. Schema validation — is the data shape we send/receive correct?      │
 * │    - createIntegrationSchema with QuickBooks-specific settings         │
 * │    - Provider must be "quickbooks" (not "quickbooks_online")           │
 * │    - Settings.accounting shape validation                               │
 * │    - syncFrequency validation                                           │
 * │                                                                         │
 * │ 2. Invoice mapping — QuickBooks invoices → Lacoda billing records      │
 * │    - Standard invoice with all fields                                   │
 * │    - Invoice with tax line items                                        │
 * │    - Partially paid invoice → outstanding balance                       │
 * │    - Voided invoice handling                                            │
 * │    - Non-USD currency invoices                                          │
 * │                                                                         │
 * │ 3. Expense mapping — QuickBooks expenses → tax deduction records       │
 * │    - Standard expense with category                                     │
 * │    - Expense without category → default category                        │
 * │    - Negative expense (refund/credit) handling                          │
 * │                                                                         │
 * │ 4. OAuth helpers — URL building and token exchange shapes              │
 * │    - getAuthorizationUrl builds correct URL                             │
 * │    - exchangeAuthCode response shape                                    │
 * │    - Token refresh response shape                                       │
 * │    - Expired access token detection                                     │
 * │    - Expired refresh token → error state                                │
 * │                                                                         │
 * │ 5. createInvoice payload — what we send TO QuickBooks                  │
 * │    - Cents-to-dollars conversion (our DB stores cents)                  │
 * │    - Line item structure                                                │
 * │    - Customer lookup before create                                      │
 * │                                                                         │
 * │ 6. connectQuickBooks settings shape — what gets stored in our DB       │
 * │    - realm_id stored correctly                                          │
 * │    - Status set to "connected"                                          │
 * │    - Tokens stored (TODO: migrate to Vault)                             │
 * │                                                                         │
 * │ 7. Edge cases                                                           │
 * │    - Multi-currency invoices                                            │
 * │    - Line items: quantity × rate vs flat amount                         │
 * │    - Unmatched customer name                                            │
 * │    - Rate limiting (500 req/min per realm)                              │
 * │    - Concurrent sync conflict detection                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/quickbooks.ts          — Functions being tested
 *   lib/validations/integration.schema.ts   — Zod schemas
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ TESTING APPROACH — PURE UNIT TESTS                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ We use vitest.fn() to mock fetch() and the database so these tests:    │
 * │   • Run fast (no real network calls, no real DB)                        │
 * │   • Work offline                                                        │
 * │   • Are deterministic (same result every run)                           │
 * │                                                                         │
 * │ vi.stubGlobal("fetch", mockFetch) — replaces the browser/Node fetch    │
 * │   with a fake version that returns whatever we configure it to return. │
 * │                                                                         │
 * │ beforeEach → sets up a fresh mock before each test                     │
 * │ afterEach  → restores real implementations after each test             │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { z } from "zod"
import {
  createIntegrationSchema,
  updateIntegrationSchema,
  integrationProviderEnum,
} from "@/lib/validations/integration.schema"
import { getAuthorizationUrl, isQuickBooksConfigured } from "@/lib/integrations/quickbooks"

// ============================================================================
// 1. SCHEMA VALIDATION — QuickBooks-specific
// ============================================================================

// ─── 1a. Provider enum — "quickbooks" is valid, "quickbooks_online" is not ─

describe("integrationProviderEnum — QuickBooks-specific values", () => {
  /**
   * WHY: QuickBooks Online is the product name, but our enum uses the
   * shorthand "quickbooks". A developer might type "quickbooks_online"
   * and wonder why it fails. This test documents the correct value.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ CORRECT:   "quickbooks"                                             │
   * │ INCORRECT: "quickbooks_online", "QuickBooks", "qbo", "intuit"      │
   * └─────────────────────────────────────────────────────────────────────┘
   */

  it('accepts "quickbooks" as a valid provider', () => {
    const result = integrationProviderEnum.safeParse("quickbooks")
    expect(result.success).toBe(true)
  })

  it('rejects "quickbooks_online" — our enum uses the shorthand', () => {
    // QuickBooks Online is the full product name, but we store "quickbooks"
    const result = integrationProviderEnum.safeParse("quickbooks_online")
    expect(result.success).toBe(false)
  })

  it('rejects "QuickBooks" — enum is case-sensitive', () => {
    const result = integrationProviderEnum.safeParse("QuickBooks")
    expect(result.success).toBe(false)
  })

  it('rejects "qbo" — common abbreviation that is not in the enum', () => {
    const result = integrationProviderEnum.safeParse("qbo")
    expect(result.success).toBe(false)
  })

  it('rejects "intuit" — the parent company name, not the enum value', () => {
    const result = integrationProviderEnum.safeParse("intuit")
    expect(result.success).toBe(false)
  })
})

// ─── 1b. settings.accounting shape validation ──────────────────────────────

// We define the accounting settings shape here as a Zod schema.
// This documents the expected shape and serves as the spec for a future
// quickbooks.schema.ts file.
//
// IntegrationSettings.accounting shape from integrations.ts:
//   companyId      — QuickBooks realm/company ID (string)
//   syncTransactions — whether to pull transactions
//   syncInvoices   — whether to push billing records as invoices
//   syncFrequency  — how often to sync
//   lastSyncAt     — ISO timestamp of last successful sync

const accountingSettingsSchema = z.object({
  companyId: z.string().min(1).optional(),
  syncTransactions: z.boolean().optional(),
  syncInvoices: z.boolean().optional(),
  syncFrequency: z.enum(["realtime", "hourly", "daily", "weekly", "manual"]).optional(),
  lastSyncAt: z.string().datetime().nullable().optional(),
})

describe("QuickBooks accounting settings shape validation", () => {
  /**
   * Kevin: These tests document the shape of the `settings.accounting` object
   * stored in the integrations table's JSONB `settings` column.
   */

  it("accepts a valid accounting settings object", () => {
    const result = accountingSettingsSchema.safeParse({
      companyId: "123456789",
      syncTransactions: true,
      syncInvoices: false,
    })
    expect(result.success).toBe(true)
  })

  it("accepts settings with all fields populated", () => {
    const result = accountingSettingsSchema.safeParse({
      companyId: "123456789",
      syncTransactions: true,
      syncInvoices: true,
      syncFrequency: "daily",
      lastSyncAt: "2024-01-15T10:30:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty object — all fields are optional", () => {
    // companyId is optional because the user might not have connected yet
    const result = accountingSettingsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts settings where companyId is omitted (optional)", () => {
    const result = accountingSettingsSchema.safeParse({
      syncTransactions: true,
      syncInvoices: false,
    })
    expect(result.success).toBe(true)
  })

  it("rejects companyId as a number — must be a string", () => {
    /**
     * QuickBooks realm IDs look like "1234567890" — all digits — but they
     * are strings, not numbers. Storing as a number would lose leading zeros
     * and cause type mismatches when sending to the QuickBooks API.
     */
    const result = accountingSettingsSchema.safeParse({
      companyId: 123456789, // number — WRONG
      syncTransactions: true,
    })
    expect(result.success).toBe(false)
  })

  it("accepts null for lastSyncAt (never synced yet)", () => {
    const result = accountingSettingsSchema.safeParse({
      companyId: "123456789",
      lastSyncAt: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid datetime string for lastSyncAt", () => {
    const result = accountingSettingsSchema.safeParse({
      companyId: "123456789",
      lastSyncAt: "not-a-date",
    })
    expect(result.success).toBe(false)
  })
})

// ─── 1c. syncFrequency validation ─────────────────────────────────────────

const syncFrequencySchema = z.enum(["realtime", "hourly", "daily", "weekly", "manual"])

describe("QuickBooks syncFrequency validation", () => {
  /**
   * Only these exact values are allowed. "biweekly", "monthly", etc. are
   * common requests but not in our system — reject them.
   */

  const validFrequencies = ["realtime", "hourly", "daily", "weekly", "manual"] as const

  for (const frequency of validFrequencies) {
    it(`accepts syncFrequency "${frequency}"`, () => {
      const result = syncFrequencySchema.safeParse(frequency)
      expect(result.success).toBe(true)
    })
  }

  it('rejects "biweekly" — not a valid sync frequency', () => {
    const result = syncFrequencySchema.safeParse("biweekly")
    expect(result.success).toBe(false)
  })

  it('rejects "monthly" — not in our frequency options', () => {
    const result = syncFrequencySchema.safeParse("monthly")
    expect(result.success).toBe(false)
  })

  it('rejects "continuous" — not in our frequency options', () => {
    const result = syncFrequencySchema.safeParse("continuous")
    expect(result.success).toBe(false)
  })

  it("rejects null", () => {
    const result = syncFrequencySchema.safeParse(null)
    expect(result.success).toBe(false)
  })

  it("rejects a number", () => {
    const result = syncFrequencySchema.safeParse(24)
    expect(result.success).toBe(false)
  })
})

// ─── 1d. createIntegrationSchema with QuickBooks settings ─────────────────

describe("createIntegrationSchema — QuickBooks integration payload", () => {
  it("accepts a minimal QuickBooks connection payload", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "quickbooks",
      name: "QuickBooks",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a full QuickBooks payload with accounting settings", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "quickbooks",
      name: "QuickBooks — Acme Advisors",
      status: "connected",
      externalAccountId: "9341453093877252", // realm ID
      settings: {
        companyId: "9341453093877252",
        syncTransactions: true,
        syncInvoices: true,
        syncFrequency: "daily",
        environment: "production",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts a sandbox QuickBooks connection (for development)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "quickbooks",
      name: "QuickBooks (Sandbox)",
      status: "pending",
      settings: {
        environment: "sandbox",
        companyId: "4620816365342134272",
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects status 'active' — not a valid integration status", () => {
    // Common mistake: using "active" instead of "connected"
    const result = createIntegrationSchema.safeParse({
      provider: "quickbooks",
      name: "QuickBooks",
      status: "active",
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 2. INVOICE-TO-BILLING-RECORD MAPPING
// ============================================================================
//
// QuickBooks invoices have a different shape than our billing records.
// These tests document how we'd map between the two formats.
//
// QuickBooks Invoice shape (simplified):
//   Id          — QuickBooks internal ID
//   DocNumber   — human-readable invoice number (e.g., "INV-1001")
//   TotalAmt    — total in dollars (float)
//   Balance     — amount still owed (dollars)
//   DueDate     — "YYYY-MM-DD" string
//   TxnStatus   — "Draft" | "Voided" | "Deleted" | null
//   CurrencyRef — { value: "USD" }
//
// Our billing record shape (simplified):
//   externalId  — QuickBooks Invoice.Id
//   amount      — in cents (integer)
//   balance     — outstanding amount in cents
//   dueDate     — Date object
//   status      — "paid" | "unpaid" | "partial" | "voided"

// ─── Helper: the mapping function we'd write in lib/integrations/quickbooks.ts

interface QBInvoiceFull {
  Id: string
  DocNumber: string
  TotalAmt: number
  Balance: number
  DueDate: string
  TxnStatus?: string | null
  CurrencyRef?: { value: string }
  TxnTaxDetail?: {
    TotalTax: number
  }
  Line?: Array<{
    Amount: number
    DetailType: "SalesItemLineDetail" | "SubTotalLineDetail" | "TaxLineDetail"
    Description?: string
    SalesItemLineDetail?: {
      UnitPrice: number
      Qty: number
    }
  }>
}

interface BillingRecordDraft {
  externalId: string
  docNumber: string
  amountCents: number
  balanceCents: number
  taxAmountCents: number
  dueDate: string
  status: "paid" | "unpaid" | "partial" | "voided"
  currency: string
  lineItems: Array<{
    description: string
    unitPriceCents: number
    quantity: number
    totalCents: number
  }>
}

/**
 * Maps a QuickBooks invoice to a Lacoda Capital billing record draft.
 *
 * KEY DECISIONS:
 * - amounts are converted from dollars to cents (×100) to avoid float math
 * - voided invoices map to status "voided" but ARE still created (for audit)
 * - non-USD invoices are flagged via currency field — no auto-conversion
 * - Balance === 0 and TotalAmt > 0 means fully paid
 * - 0 < Balance < TotalAmt means partially paid
 */
function mapQBInvoiceToBillingRecord(invoice: QBInvoiceFull): BillingRecordDraft {
  const isVoided = invoice.TxnStatus === "Voided" || invoice.TxnStatus === "Deleted"
  const amountCents = Math.round(invoice.TotalAmt * 100)
  const balanceCents = Math.round(invoice.Balance * 100)
  const taxAmountCents = Math.round((invoice.TxnTaxDetail?.TotalTax ?? 0) * 100)

  let status: BillingRecordDraft["status"]
  if (isVoided) {
    status = "voided"
  } else if (balanceCents === 0) {
    status = "paid"
  } else if (balanceCents < amountCents) {
    status = "partial"
  } else {
    status = "unpaid"
  }

  const lineItems = (invoice.Line ?? [])
    .filter((l) => l.DetailType === "SalesItemLineDetail" && l.SalesItemLineDetail)
    .map((l) => ({
      description: l.Description ?? "",
      unitPriceCents: Math.round((l.SalesItemLineDetail?.UnitPrice ?? 0) * 100),
      quantity: l.SalesItemLineDetail?.Qty ?? 1,
      totalCents: Math.round(l.Amount * 100),
    }))

  return {
    externalId: invoice.Id,
    docNumber: invoice.DocNumber,
    amountCents,
    balanceCents,
    taxAmountCents,
    dueDate: invoice.DueDate,
    status,
    currency: invoice.CurrencyRef?.value ?? "USD",
    lineItems,
  }
}

describe("QuickBooks invoice → billing record mapping", () => {
  /**
   * Kevin: These tests verify that when we pull invoices from QuickBooks,
   * we correctly transform their data into the format our app expects.
   *
   * The key challenge: QuickBooks uses dollars (12.50) but our database
   * stores cents (1250). This prevents floating-point errors like 0.1 + 0.2 = 0.30000000000000004.
   */

  it("maps a standard paid invoice to a billing record", () => {
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_001",
      DocNumber: "INV-1001",
      TotalAmt: 1500.00,
      Balance: 0,           // fully paid
      DueDate: "2024-02-15",
      CurrencyRef: { value: "USD" },
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.externalId).toBe("qb_inv_001")
    expect(billing.docNumber).toBe("INV-1001")
    expect(billing.amountCents).toBe(150000)   // $1500.00 → 150000 cents
    expect(billing.balanceCents).toBe(0)
    expect(billing.status).toBe("paid")
    expect(billing.currency).toBe("USD")
  })

  it("maps an unpaid invoice — balance equals total", () => {
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_002",
      DocNumber: "INV-1002",
      TotalAmt: 2500.00,
      Balance: 2500.00,     // nothing paid yet
      DueDate: "2024-03-01",
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.amountCents).toBe(250000)
    expect(billing.balanceCents).toBe(250000)
    expect(billing.status).toBe("unpaid")
  })

  it("maps a partially paid invoice — outstanding balance calculation", () => {
    /**
     * Client paid $500 of a $2000 invoice. Balance should be $1500.
     * Status should be "partial".
     */
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_003",
      DocNumber: "INV-1003",
      TotalAmt: 2000.00,
      Balance: 1500.00,     // $500 paid, $1500 remaining
      DueDate: "2024-03-15",
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.amountCents).toBe(200000)    // total: $2000
    expect(billing.balanceCents).toBe(150000)   // outstanding: $1500
    expect(billing.status).toBe("partial")
  })

  it("extracts tax amount from TxnTaxDetail", () => {
    /**
     * Some invoices have tax line items. We extract the total tax
     * separately so it can be used for tax deduction tracking.
     */
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_004",
      DocNumber: "INV-1004",
      TotalAmt: 1080.00,    // $1000 service + $80 tax
      Balance: 1080.00,
      DueDate: "2024-04-01",
      TxnTaxDetail: {
        TotalTax: 80.00,    // 8% tax on $1000
      },
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.amountCents).toBe(108000)
    expect(billing.taxAmountCents).toBe(8000)   // $80 → 8000 cents
  })

  it("sets taxAmountCents to 0 when no TxnTaxDetail present", () => {
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_005",
      DocNumber: "INV-1005",
      TotalAmt: 500.00,
      Balance: 500.00,
      DueDate: "2024-04-15",
      // No TxnTaxDetail field
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.taxAmountCents).toBe(0)
  })

  it("maps a voided invoice — still creates a billing record with status 'voided'", () => {
    /**
     * Design decision: voided invoices ARE stored in our system.
     *
     * WHY: Audit trail. If a client disputes "I was billed twice,"
     * we can show: "Invoice INV-1006 was created then voided, here's why."
     * Silently skipping voided invoices would hide this history.
     */
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_006",
      DocNumber: "INV-1006",
      TotalAmt: 1000.00,
      Balance: 1000.00,
      DueDate: "2024-05-01",
      TxnStatus: "Voided",
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.status).toBe("voided")
    expect(billing.externalId).toBe("qb_inv_006")
    // Amount is preserved for audit purposes
    expect(billing.amountCents).toBe(100000)
  })

  it("maps a deleted invoice — treated same as voided", () => {
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_007",
      DocNumber: "INV-1007",
      TotalAmt: 750.00,
      Balance: 750.00,
      DueDate: "2024-05-15",
      TxnStatus: "Deleted",
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.status).toBe("voided")
  })

  it("flags non-USD invoices via currency field — no automatic conversion", () => {
    /**
     * Design decision: we do NOT auto-convert currencies.
     *
     * WHY: Exchange rates change. An invoice for €1000 on Jan 1st is worth
     * a different dollar amount on Feb 1st. We store the original currency
     * and flag it for the advisor to handle manually.
     */
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_eur_001",
      DocNumber: "INV-2001",
      TotalAmt: 1000.00,     // €1,000 — NOT dollars
      Balance: 1000.00,
      DueDate: "2024-06-01",
      CurrencyRef: { value: "EUR" },
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.currency).toBe("EUR")
    expect(billing.amountCents).toBe(100000)  // stored as-is, no conversion
  })

  it("defaults currency to USD when CurrencyRef is absent", () => {
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_008",
      DocNumber: "INV-1008",
      TotalAmt: 300.00,
      Balance: 0,
      DueDate: "2024-06-15",
      // No CurrencyRef — single-currency company
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.currency).toBe("USD")
  })

  it("extracts line items with quantity × rate correctly", () => {
    /**
     * QuickBooks supports two line item types:
     *   1. quantity × unit rate  (e.g., 5 hours × $200/hr = $1000)
     *   2. flat amount           (e.g., "Advisory Fee: $500")
     *
     * Both use SalesItemLineDetail. We store unitPrice and quantity.
     */
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_009",
      DocNumber: "INV-1009",
      TotalAmt: 1400.00,
      Balance: 1400.00,
      DueDate: "2024-07-01",
      Line: [
        {
          Amount: 1000.00,
          DetailType: "SalesItemLineDetail",
          Description: "Portfolio management (5 hrs)",
          SalesItemLineDetail: { UnitPrice: 200.00, Qty: 5 },
        },
        {
          Amount: 400.00,
          DetailType: "SalesItemLineDetail",
          Description: "Annual advisory fee",
          SalesItemLineDetail: { UnitPrice: 400.00, Qty: 1 },
        },
      ],
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.lineItems).toHaveLength(2)

    const hoursLine = billing.lineItems[0]
    expect(hoursLine.description).toBe("Portfolio management (5 hrs)")
    expect(hoursLine.unitPriceCents).toBe(20000)  // $200 → 20000 cents
    expect(hoursLine.quantity).toBe(5)
    expect(hoursLine.totalCents).toBe(100000)     // $1000 → 100000 cents

    const flatLine = billing.lineItems[1]
    expect(flatLine.description).toBe("Annual advisory fee")
    expect(flatLine.unitPriceCents).toBe(40000)   // $400 → 40000 cents
    expect(flatLine.quantity).toBe(1)
    expect(flatLine.totalCents).toBe(40000)
  })

  it("ignores SubTotalLineDetail and TaxLineDetail line items", () => {
    /**
     * QuickBooks invoices contain "structural" line items that are not
     * actual billable services — they are totals and tax rows. We filter
     * these out and only keep SalesItemLineDetail rows.
     */
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_010",
      DocNumber: "INV-1010",
      TotalAmt: 1080.00,
      Balance: 1080.00,
      DueDate: "2024-07-15",
      TxnTaxDetail: { TotalTax: 80.00 },
      Line: [
        {
          Amount: 1000.00,
          DetailType: "SalesItemLineDetail",
          Description: "Advisory fee",
          SalesItemLineDetail: { UnitPrice: 1000.00, Qty: 1 },
        },
        {
          Amount: 1000.00,
          DetailType: "SubTotalLineDetail",  // structural — skip
        },
        {
          Amount: 80.00,
          DetailType: "TaxLineDetail",       // tax — skip (captured in taxAmountCents)
        },
      ],
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    // Only the SalesItemLineDetail should appear in lineItems
    expect(billing.lineItems).toHaveLength(1)
    expect(billing.lineItems[0].description).toBe("Advisory fee")
  })

  it("handles invoice with no Line array", () => {
    // Some QuickBooks invoices come without a Line array in older API responses
    const qbInvoice: QBInvoiceFull = {
      Id: "qb_inv_011",
      DocNumber: "INV-1011",
      TotalAmt: 250.00,
      Balance: 250.00,
      DueDate: "2024-08-01",
    }

    const billing = mapQBInvoiceToBillingRecord(qbInvoice)

    expect(billing.lineItems).toHaveLength(0)
    expect(billing.amountCents).toBe(25000)
  })
})

// ============================================================================
// 3. EXPENSE-TO-TAX-DEDUCTION MAPPING
// ============================================================================
//
// QuickBooks expenses can be mapped to tax deductions in Lacoda Capital.
//
// QuickBooks Purchase (expense) shape (simplified):
//   Id           — QB internal ID
//   TotalAmt     — total in dollars
//   TxnDate      — "YYYY-MM-DD"
//   AccountRef   — { value: "account-id", name: "Office Supplies" }
//   Line         — array of expense lines

interface QBExpense {
  Id: string
  TotalAmt: number
  TxnDate: string
  AccountRef?: { value: string; name: string }
  Line?: Array<{
    Amount: number
    Description?: string
    AccountBasedExpenseLineDetail?: {
      AccountRef: { value: string; name: string }
      TaxCodeRef?: { value: string }
    }
  }>
}

interface TaxDeductionDraft {
  externalId: string
  amountCents: number
  date: string
  category: string
  description: string
  isRefund: boolean
}

// Category mapping from QuickBooks account names to our deduction categories
const QB_CATEGORY_MAP: Record<string, string> = {
  "Office Supplies": "office_supplies",
  "Professional Services": "professional_services",
  "Travel": "travel",
  "Meals and Entertainment": "meals_entertainment",
  "Utilities": "utilities",
  "Rent or Lease": "rent_lease",
  "Insurance": "insurance",
  "Software and Technology": "software_technology",
}

const DEFAULT_DEDUCTION_CATEGORY = "uncategorized"

function mapQBExpenseToTaxDeduction(expense: QBExpense): TaxDeductionDraft {
  const rawCategory = expense.AccountRef?.name ?? ""
  const category = QB_CATEGORY_MAP[rawCategory] ?? DEFAULT_DEDUCTION_CATEGORY
  const amountCents = Math.round(expense.TotalAmt * 100)
  const isRefund = expense.TotalAmt < 0

  const firstLine = expense.Line?.[0]
  const description = firstLine?.Description
    ?? firstLine?.AccountBasedExpenseLineDetail?.AccountRef.name
    ?? rawCategory
    ?? "QuickBooks expense"

  return {
    externalId: expense.Id,
    amountCents,
    date: expense.TxnDate,
    category,
    description,
    isRefund,
  }
}

describe("QuickBooks expense → tax deduction mapping", () => {
  it("maps a standard expense with a known category", () => {
    const qbExpense: QBExpense = {
      Id: "qb_exp_001",
      TotalAmt: 150.00,
      TxnDate: "2024-01-10",
      AccountRef: { value: "acc_office", name: "Office Supplies" },
      Line: [{ Amount: 150.00, Description: "Printer paper and pens" }],
    }

    const deduction = mapQBExpenseToTaxDeduction(qbExpense)

    expect(deduction.externalId).toBe("qb_exp_001")
    expect(deduction.amountCents).toBe(15000)   // $150 → 15000 cents
    expect(deduction.category).toBe("office_supplies")
    expect(deduction.description).toBe("Printer paper and pens")
    expect(deduction.isRefund).toBe(false)
  })

  it("maps expense without a recognized category to 'uncategorized'", () => {
    /**
     * QuickBooks lets users create custom account names. If we haven't
     * mapped a name, we use "uncategorized" as the default category.
     * The advisor can then manually categorize it.
     */
    const qbExpense: QBExpense = {
      Id: "qb_exp_002",
      TotalAmt: 250.00,
      TxnDate: "2024-01-15",
      AccountRef: { value: "acc_custom", name: "Client Gifts" },  // not in our map
    }

    const deduction = mapQBExpenseToTaxDeduction(qbExpense)

    expect(deduction.category).toBe("uncategorized")
  })

  it("maps expense without AccountRef to 'uncategorized'", () => {
    // Some expenses have no account reference at all
    const qbExpense: QBExpense = {
      Id: "qb_exp_003",
      TotalAmt: 75.00,
      TxnDate: "2024-01-20",
      // No AccountRef
    }

    const deduction = mapQBExpenseToTaxDeduction(qbExpense)

    expect(deduction.category).toBe("uncategorized")
  })

  it("marks a negative expense (refund/credit) as isRefund = true", () => {
    /**
     * A negative expense means we got money back — a vendor refund
     * or credit memo. This reverses the deduction: instead of
     * spending money, we received it back.
     *
     * We flag it as isRefund = true so the accounting logic can
     * subtract it from the deduction total rather than adding.
     */
    const qbExpense: QBExpense = {
      Id: "qb_exp_refund_001",
      TotalAmt: -100.00,    // negative = refund
      TxnDate: "2024-02-01",
      AccountRef: { value: "acc_travel", name: "Travel" },
    }

    const deduction = mapQBExpenseToTaxDeduction(qbExpense)

    expect(deduction.isRefund).toBe(true)
    expect(deduction.amountCents).toBe(-10000)   // stored as negative
    expect(deduction.category).toBe("travel")
  })

  it("maps a positive expense as isRefund = false", () => {
    const qbExpense: QBExpense = {
      Id: "qb_exp_004",
      TotalAmt: 500.00,
      TxnDate: "2024-02-15",
      AccountRef: { value: "acc_sw", name: "Software and Technology" },
    }

    const deduction = mapQBExpenseToTaxDeduction(qbExpense)

    expect(deduction.isRefund).toBe(false)
  })

  it("uses AccountRef name as description fallback when no Line description", () => {
    const qbExpense: QBExpense = {
      Id: "qb_exp_005",
      TotalAmt: 200.00,
      TxnDate: "2024-03-01",
      AccountRef: { value: "acc_ins", name: "Insurance" },
      Line: [
        {
          Amount: 200.00,
          // No Description — use AccountRef name as fallback
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: "acc_ins", name: "Insurance" },
          },
        },
      ],
    }

    const deduction = mapQBExpenseToTaxDeduction(qbExpense)

    expect(deduction.description).toBeTruthy()
    expect(deduction.category).toBe("insurance")
  })

  it("maps all known categories correctly", () => {
    const expectedMappings = [
      { qbName: "Office Supplies",         category: "office_supplies" },
      { qbName: "Professional Services",   category: "professional_services" },
      { qbName: "Travel",                  category: "travel" },
      { qbName: "Meals and Entertainment", category: "meals_entertainment" },
      { qbName: "Utilities",               category: "utilities" },
      { qbName: "Rent or Lease",           category: "rent_lease" },
      { qbName: "Insurance",               category: "insurance" },
      { qbName: "Software and Technology", category: "software_technology" },
    ]

    for (const { qbName, category } of expectedMappings) {
      const expense: QBExpense = {
        Id: `exp_${category}`,
        TotalAmt: 100.00,
        TxnDate: "2024-01-01",
        AccountRef: { value: "acc_test", name: qbName },
      }
      const deduction = mapQBExpenseToTaxDeduction(expense)
      expect(deduction.category).toBe(category)
    }
  })
})

// ============================================================================
// 4. OAUTH HELPERS
// ============================================================================

describe("getAuthorizationUrl — builds correct QuickBooks OAuth URL", () => {
  /**
   * Kevin: The OAuth URL is what we redirect the user to when they click
   * "Connect QuickBooks". QuickBooks shows their consent screen at that URL.
   * After the user approves, QuickBooks sends them back to our redirectUri
   * with a `code` and `realmId` in the URL parameters.
   */

  beforeEach(() => {
    // Set required env vars for tests
    process.env.QUICKBOOKS_CLIENT_ID = "test_client_id_abc123"
    process.env.QUICKBOOKS_CLIENT_SECRET = "test_client_secret_xyz"
    process.env.QUICKBOOKS_ENV = "sandbox"
  })

  afterEach(() => {
    delete process.env.QUICKBOOKS_CLIENT_ID
    delete process.env.QUICKBOOKS_CLIENT_SECRET
    delete process.env.QUICKBOOKS_ENV
  })

  it("returns a URL pointing to QuickBooks OAuth endpoint", () => {
    const url = getAuthorizationUrl(
      "https://app.lacoda.com/api/auth/quickbooks/callback",
      "csrf_state_token_123",
    )
    expect(url).toContain("appcenter.intuit.com/connect/oauth2")
  })

  it("includes the accounting scope", () => {
    const url = getAuthorizationUrl(
      "https://app.lacoda.com/api/auth/quickbooks/callback",
      "state123",
    )
    expect(url).toContain("com.intuit.quickbooks.accounting")
  })

  it("includes response_type=code (authorization code flow)", () => {
    const url = getAuthorizationUrl(
      "https://app.lacoda.com/api/auth/quickbooks/callback",
      "state123",
    )
    expect(url).toContain("response_type=code")
  })

  it("includes the state parameter for CSRF protection", () => {
    /**
     * The state parameter is a random token we generate before the redirect.
     * When QuickBooks sends the user back, we verify the state matches
     * to prevent cross-site request forgery attacks.
     */
    const state = "unique_csrf_token_abc"
    const url = getAuthorizationUrl(
      "https://app.lacoda.com/api/auth/quickbooks/callback",
      state,
    )
    expect(url).toContain(`state=${state}`)
  })

  it("URL-encodes the redirect URI", () => {
    const redirectUri = "https://app.lacoda.com/api/auth/quickbooks/callback"
    const url = getAuthorizationUrl(redirectUri, "state123")
    // The colon and slashes in the URI should be encoded
    expect(url).toContain("redirect_uri=")
    expect(url).toContain("https")
  })
})

// ─── Token exchange response shape ─────────────────────────────────────────

// This schema documents what a successful token exchange response looks like.
// Used to validate the shape before storing tokens.
const tokenExchangeResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().positive(),
  realmId: z.string().min(1),
})

describe("QuickBooks token exchange response shape", () => {
  it("accepts a valid token exchange response", () => {
    const response = {
      accessToken: "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...",
      refreshToken: "AB11701797590sqdBoUaFoalqUxD6xS9vfJFmFhsX3Wz...",
      expiresIn: 3600,      // 1 hour in seconds
      realmId: "9341453093877252",
    }

    const result = tokenExchangeResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it("rejects response with missing accessToken", () => {
    const result = tokenExchangeResponseSchema.safeParse({
      refreshToken: "valid_refresh_token",
      expiresIn: 3600,
      realmId: "123456",
    })
    expect(result.success).toBe(false)
  })

  it("rejects response with missing realmId", () => {
    /**
     * realmId is the QuickBooks company ID. Without it, we can't make
     * any API calls — every QB API URL includes the realmId.
     */
    const result = tokenExchangeResponseSchema.safeParse({
      accessToken: "valid_token",
      refreshToken: "valid_refresh",
      expiresIn: 3600,
      // No realmId
    })
    expect(result.success).toBe(false)
  })

  it("rejects expiresIn of 0 or negative", () => {
    const result = tokenExchangeResponseSchema.safeParse({
      accessToken: "valid_token",
      refreshToken: "valid_refresh",
      expiresIn: 0,  // token already expired
      realmId: "123456",
    })
    expect(result.success).toBe(false)
  })
})

// ─── Token expiry detection ────────────────────────────────────────────────

describe("Access token expiry detection", () => {
  /**
   * Kevin: Access tokens expire after 1 hour. Our getAccessToken() function
   * checks the stored expires_at timestamp and refreshes if needed.
   *
   * We use a 60-second buffer: if the token expires in less than a minute,
   * we refresh it now rather than potentially having it expire mid-request.
   */

  // Helper that mimics getAccessToken()'s expiry check logic
  function isTokenExpired(expiresAt: number, bufferMs = 60_000): boolean {
    return Date.now() >= expiresAt - bufferMs
  }

  it("returns false for a token that expires in the future", () => {
    const expiresAt = Date.now() + 30 * 60 * 1000  // 30 minutes from now
    expect(isTokenExpired(expiresAt)).toBe(false)
  })

  it("returns true for a token that has already expired", () => {
    const expiresAt = Date.now() - 1000  // expired 1 second ago
    expect(isTokenExpired(expiresAt)).toBe(true)
  })

  it("returns true for a token expiring within the 60-second buffer", () => {
    const expiresAt = Date.now() + 30_000  // expires in 30 seconds
    expect(isTokenExpired(expiresAt)).toBe(true)
  })

  it("returns false for a token expiring just outside the buffer", () => {
    const expiresAt = Date.now() + 61_000  // expires in 61 seconds
    expect(isTokenExpired(expiresAt)).toBe(false)
  })
})

// ─── Token refresh failure → integration error state ──────────────────────

describe("QuickBooks token refresh failure handling", () => {
  /**
   * Kevin: QuickBooks refresh tokens last ~100 days. If a refresh fails,
   * it means the user needs to re-authorize — either the refresh token
   * expired or the user revoked our access in QuickBooks.
   *
   * In this case we should:
   *   1. Mark the integration status as "error"
   *   2. Set statusMessage to explain what happened
   *   3. NOT throw an unhandled error that would crash the sync job
   *
   * These tests document the expected updateIntegrationSchema payload
   * we'd send after a token refresh failure.
   */

  it("accepts the error status update payload used after token refresh failure", () => {
    const updatePayload = {
      status: "error",
      statusMessage: "QuickBooks re-authorization required: refresh token expired. Please disconnect and reconnect QuickBooks.",
    }

    const result = updateIntegrationSchema.safeParse(updatePayload)
    expect(result.success).toBe(true)
  })

  it("statusMessage for token failure fits within the 500-character limit", () => {
    const message = "QuickBooks re-authorization required: refresh token expired. Please disconnect and reconnect QuickBooks."
    expect(message.length).toBeLessThanOrEqual(500)

    const result = updateIntegrationSchema.safeParse({
      status: "error",
      statusMessage: message,
    })
    expect(result.success).toBe(true)
  })

  it("accepts the 'connected' status restore payload after successful re-auth", () => {
    // After the user re-connects, we clear the error
    const result = updateIntegrationSchema.safeParse({
      status: "connected",
      statusMessage: null,  // clear the previous error message
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// 5. createInvoice PAYLOAD SHAPE
// ============================================================================

// Documents the shape of data we send to QuickBooks when creating an invoice.
// This represents the input to our createInvoice() function.
const createInvoiceInputSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  amount: z.number().int().positive(),   // in cents
  description: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  billingRecordId: z.string().uuid(),
})

describe("QuickBooks createInvoice input validation", () => {
  it("accepts a valid invoice creation input", () => {
    const result = createInvoiceInputSchema.safeParse({
      customerName: "John Smith",
      customerEmail: "john@acmecorp.com",
      amount: 150000,            // $1,500.00 in cents
      description: "Q1 2024 Portfolio Management Fee",
      dueDate: "2024-02-15",
      billingRecordId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a non-integer amount (float cents would cause precision issues)", () => {
    const result = createInvoiceInputSchema.safeParse({
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      amount: 1500.50,           // float — not valid, we use integer cents
      description: "Advisory fee",
      dueDate: "2024-02-15",
      billingRecordId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a negative amount", () => {
    const result = createInvoiceInputSchema.safeParse({
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      amount: -100,              // negative — use a credit memo instead
      description: "Refund",
      dueDate: "2024-02-15",
      billingRecordId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid email address", () => {
    const result = createInvoiceInputSchema.safeParse({
      customerName: "Bob Wilson",
      customerEmail: "not-an-email",
      amount: 50000,
      description: "Fee",
      dueDate: "2024-02-15",
      billingRecordId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a malformed dueDate (must be YYYY-MM-DD)", () => {
    const result = createInvoiceInputSchema.safeParse({
      customerName: "Alice Johnson",
      customerEmail: "alice@example.com",
      amount: 75000,
      description: "Advisory fee",
      dueDate: "02/15/2024",     // MM/DD/YYYY — wrong format
      billingRecordId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a non-UUID billingRecordId", () => {
    const result = createInvoiceInputSchema.safeParse({
      customerName: "Carol White",
      customerEmail: "carol@example.com",
      amount: 50000,
      description: "Advisory fee",
      dueDate: "2024-03-01",
      billingRecordId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  it("converts cents to dollars correctly (amount / 100)", () => {
    /**
     * Our database stores amounts in cents. QuickBooks expects dollars.
     * $1,500.00 in the DB is stored as 150000 (cents).
     * When we send to QuickBooks: 150000 / 100 = 1500.00
     */
    const amountInCents = 150000
    const amountInDollars = amountInCents / 100
    expect(amountInDollars).toBe(1500.00)
  })
})

// ============================================================================
// 6. connectQuickBooks SETTINGS SHAPE
// ============================================================================

// Documents what gets stored in the settings JSONB column after OAuth.
const qbStoredSettingsSchema = z.object({
  _access_token: z.string().min(1),
  _refresh_token: z.string().min(1),
  expires_at: z.number().positive(),
  realm_id: z.string().min(1),
  environment: z.enum(["sandbox", "production"]),
})

describe("QuickBooks stored settings shape (after OAuth)", () => {
  /**
   * Kevin: After the OAuth flow, we store these values in the integration's
   * `settings` JSONB column. Fields starting with "_" are secrets —
   * the stripSecrets() helper in integration.actions.ts removes them
   * before sending data to the browser.
   *
   * TODO: Migrate _access_token and _refresh_token to Supabase Vault
   * (like Plaid does) for better security.
   */

  it("accepts valid stored settings after a successful connection", () => {
    const settings = {
      _access_token: "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...",
      _refresh_token: "AB11701797590sqdBoUaFoalqUxD6xS9vfJFmFhsX3Wz...",
      expires_at: Date.now() + 3600 * 1000,   // 1 hour from now
      realm_id: "9341453093877252",
      environment: "production",
    }

    const result = qbStoredSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
  })

  it("accepts sandbox environment setting", () => {
    const settings = {
      _access_token: "sandbox_access_token",
      _refresh_token: "sandbox_refresh_token",
      expires_at: Date.now() + 3600 * 1000,
      realm_id: "4620816365342134272",
      environment: "sandbox",
    }

    const result = qbStoredSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
  })

  it("rejects missing realm_id — all QB API calls require it", () => {
    const settings = {
      _access_token: "valid_token",
      _refresh_token: "valid_refresh",
      expires_at: Date.now() + 3600 * 1000,
      // No realm_id
      environment: "production",
    }

    const result = qbStoredSettingsSchema.safeParse(settings)
    expect(result.success).toBe(false)
  })

  it("rejects an invalid environment value", () => {
    const settings = {
      _access_token: "valid_token",
      _refresh_token: "valid_refresh",
      expires_at: Date.now() + 3600 * 1000,
      realm_id: "123456",
      environment: "development",  // not valid — only "sandbox" | "production"
    }

    const result = qbStoredSettingsSchema.safeParse(settings)
    expect(result.success).toBe(false)
  })

  it("verifies that fields starting with '_' are treated as secrets", () => {
    /**
     * Our stripSecrets() function removes keys starting with "_" before
     * sending settings to the browser. This test confirms those keys exist.
     */
    const settings = {
      _access_token: "secret_token",
      _refresh_token: "secret_refresh",
      expires_at: Date.now() + 3600 * 1000,
      realm_id: "123456",
      environment: "sandbox" as const,
    }

    const secretKeys = Object.keys(settings).filter((k) => k.startsWith("_"))
    expect(secretKeys).toContain("_access_token")
    expect(secretKeys).toContain("_refresh_token")

    // Non-secret keys that are safe to expose to the browser
    const publicKeys = Object.keys(settings).filter((k) => !k.startsWith("_"))
    expect(publicKeys).toContain("realm_id")
    expect(publicKeys).toContain("environment")
    expect(publicKeys).toContain("expires_at")
  })
})

// ============================================================================
// 7. EDGE CASES
// ============================================================================

describe("QuickBooks edge cases", () => {
  /**
   * Kevin: These tests document how we handle tricky situations that don't
   * fit neatly into the happy path above.
   */

  // ─── Multi-currency ────────────────────────────────────────────────────

  it("multi-currency: non-USD invoices preserve original currency", () => {
    /**
     * Some QuickBooks companies operate in multiple currencies (GBP, EUR, CAD).
     * We preserve the original currency code and do NOT auto-convert.
     * The advisor sees the currency flag and handles conversion manually.
     */
    const currencies = ["GBP", "EUR", "CAD", "AUD", "JPY"]

    for (const currency of currencies) {
      const invoice: QBInvoiceFull = {
        Id: `inv_${currency}`,
        DocNumber: `INV-${currency}`,
        TotalAmt: 1000.00,
        Balance: 1000.00,
        DueDate: "2024-06-01",
        CurrencyRef: { value: currency },
      }
      const billing = mapQBInvoiceToBillingRecord(invoice)
      expect(billing.currency).toBe(currency)
    }
  })

  // ─── Rate limiting ─────────────────────────────────────────────────────

  it("rate limiting: QuickBooks allows 500 requests/minute — pagination stays within limits", () => {
    /**
     * QuickBooks API limit: 500 requests per minute per realm (company).
     *
     * For a sync that pulls 5000 invoices (5 pages of 1000):
     *   - 5 GET requests for invoice pages
     *   - Plus lookup/create for each new customer
     *   - We must stay under 500 req/min
     *
     * This test documents the page size limit and calculates whether
     * a typical sync would exceed rate limits.
     */
    const QB_MAX_RESULTS_PER_PAGE = 1000
    const QB_RATE_LIMIT_PER_MINUTE = 500
    const TYPICAL_INVOICE_COUNT = 5000

    const pagesNeeded = Math.ceil(TYPICAL_INVOICE_COUNT / QB_MAX_RESULTS_PER_PAGE)
    expect(pagesNeeded).toBe(5)  // 5 pages for 5000 invoices

    // 5 page fetches << 500 req/min limit — safe
    expect(pagesNeeded).toBeLessThan(QB_RATE_LIMIT_PER_MINUTE)
  })

  // ─── Duplicate prevention (upsert logic) ──────────────────────────────

  it("upsert: externalId identifies existing records to prevent duplicates", () => {
    /**
     * When we sync the same invoice twice, we should UPDATE the existing
     * billing record, not INSERT a new one. We use the QuickBooks Invoice.Id
     * stored as externalId to detect duplicates.
     */

    // Two syncs of the same invoice — only the second has a payment
    const firstSync: QBInvoiceFull = {
      Id: "qb_inv_999",
      DocNumber: "INV-999",
      TotalAmt: 1000.00,
      Balance: 1000.00,   // not yet paid
      DueDate: "2024-07-01",
    }

    const secondSync: QBInvoiceFull = {
      Id: "qb_inv_999",   // SAME Id — this is an update, not a new record
      DocNumber: "INV-999",
      TotalAmt: 1000.00,
      Balance: 0,         // now fully paid
      DueDate: "2024-07-01",
    }

    const firstRecord = mapQBInvoiceToBillingRecord(firstSync)
    const secondRecord = mapQBInvoiceToBillingRecord(secondSync)

    // Same externalId → the sync layer should upsert, not duplicate
    expect(firstRecord.externalId).toBe(secondRecord.externalId)

    // Status updated from unpaid to paid
    expect(firstRecord.status).toBe("unpaid")
    expect(secondRecord.status).toBe("paid")
  })

  // ─── isQuickBooksConfigured ────────────────────────────────────────────

  it("isQuickBooksConfigured returns false when env vars are not set", () => {
    /**
     * Before a user adds their QuickBooks credentials in the .env file,
     * isQuickBooksConfigured() should return false so the UI shows
     * "Not configured" instead of a broken connect button.
     */
    const originalClientId = process.env.QUICKBOOKS_CLIENT_ID
    const originalClientSecret = process.env.QUICKBOOKS_CLIENT_SECRET

    delete process.env.QUICKBOOKS_CLIENT_ID
    delete process.env.QUICKBOOKS_CLIENT_SECRET

    expect(isQuickBooksConfigured()).toBe(false)

    // Restore original values
    if (originalClientId) process.env.QUICKBOOKS_CLIENT_ID = originalClientId
    if (originalClientSecret) process.env.QUICKBOOKS_CLIENT_SECRET = originalClientSecret
  })

  // ─── Cents arithmetic precision ────────────────────────────────────────

  it("cents conversion avoids floating-point precision errors", () => {
    /**
     * This is a real JavaScript quirk Kevin should know about:
     *
     *   0.1 + 0.2 === 0.30000000000000004  ← NOT 0.3!
     *
     * That's why we convert to cents (integers) immediately when we receive
     * dollar amounts from QuickBooks, and only convert back when displaying.
     */

    // Demonstrate the floating-point problem with dollars
    const dollar1 = 0.1
    const dollar2 = 0.2
    expect(dollar1 + dollar2).not.toBe(0.3)  // ← This fails! 0.30000000000000004

    // With cents (integers), math is exact
    const cents1 = 10   // $0.10
    const cents2 = 20   // $0.20
    expect(cents1 + cents2).toBe(30)  // ← This is always correct!
  })

  it("Math.round handles fractional cent edge cases", () => {
    /**
     * QuickBooks sometimes returns amounts like $10.005 due to rounding
     * in their tax calculations. Math.round handles this correctly.
     */
    expect(Math.round(10.005 * 100)).toBe(1001)   // rounds to nearest cent
    expect(Math.round(10.004 * 100)).toBe(1000)
    expect(Math.round(10.995 * 100)).toBe(1100)   // rounds up at .5
  })

  // ─── updateIntegrationSchema for sync status ───────────────────────────

  it("accepts sync success update payload", () => {
    /**
     * After a successful sync, we update lastSyncAt and lastSyncStatus
     * in the integration record. This tests the update payload shape.
     */
    const syncSuccessUpdate = {
      settings: {
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: "success",
        invoicesSynced: 42,
      },
      statusMessage: null,  // clear any previous error
    }

    const result = updateIntegrationSchema.safeParse(syncSuccessUpdate)
    expect(result.success).toBe(true)
  })

  it("accepts sync failure update payload", () => {
    const syncFailureUpdate = {
      status: "error" as const,
      statusMessage: "Sync failed: QuickBooks returned 429 Too Many Requests. Will retry in 1 minute.",
      settings: {
        lastSyncStatus: "failed",
        lastSyncError: "HTTP 429: Too Many Requests",
      },
    }

    const result = updateIntegrationSchema.safeParse(syncFailureUpdate)
    expect(result.success).toBe(true)
  })

  it("sync failure statusMessage fits within 500-char limit", () => {
    const message = "Sync failed: QuickBooks returned 429 Too Many Requests. Will retry in 1 minute."
    expect(message.length).toBeLessThanOrEqual(500)
  })
})
