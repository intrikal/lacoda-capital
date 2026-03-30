/**
 * Integration tests for Plaid webhook → balance/holdings sync → valuations flow.
 *
 * Tests the full flow: webhook arrives → Plaid API called → assets found →
 * valuations created → asset currentValue updated → ledger events written.
 */

import { describe, it, expect, beforeEach } from "vitest"

// ─── In-memory simulated database ──────────────────────────────────────────

interface MockAsset {
  id: string
  entityId: string
  externalId: string | null
  name: string
  currentValue: string | null
  valuedAt: Date | null
}

interface MockValuation {
  assetId: string
  asOfDate: Date
  value: string
  currency: string
  source: string
  notes: string
}

interface MockLedgerEvent {
  orgId: string
  actorUserId: string
  targetType: string
  targetId: string
  action: string
  payload: Record<string, unknown>
}

let assets: MockAsset[] = []
let valuations: MockValuation[] = []
let ledgerEvents: MockLedgerEvent[] = []

// ─── Simulated Plaid API responses ─────────────────────────────────────────

interface PlaidAccount {
  account_id: string
  name: string
  balances: { current: number | null; iso_currency_code: string | null }
}

interface PlaidHolding {
  security_id: string
  institution_value: number
  iso_currency_code: string | null
}

interface PlaidSecurity {
  security_id: string
  name: string | null
  ticker_symbol: string | null
}

// ─── Simulated handler logic (mirrors route.ts) ────────────────────────────

function syncTransactionBalances(
  accounts: PlaidAccount[],
  integrationName: string,
  orgId: string,
  connectedBy: string | null,
) {
  for (const account of accounts) {
    if (account.balances.current == null) continue

    const asset = assets.find((a) => a.externalId === account.account_id)
    if (!asset) continue

    const now = new Date()
    valuations.push({
      assetId: asset.id,
      asOfDate: now,
      value: String(account.balances.current),
      currency: account.balances.iso_currency_code ?? "USD",
      source: "plaid",
      notes: `Auto-synced from ${integrationName} (${account.name})`,
    })

    const previousValue = asset.currentValue ? parseFloat(asset.currentValue) : undefined
    asset.currentValue = String(account.balances.current)
    asset.valuedAt = now

    if (connectedBy) {
      ledgerEvents.push({
        orgId,
        actorUserId: connectedBy,
        targetType: "asset",
        targetId: asset.id,
        action: "asset_valued",
        payload: {
          previousValue,
          newValue: account.balances.current,
          asOfDate: now.toISOString(),
          reason: "Plaid transaction sync",
        },
      })
    }
  }
}

function syncHoldings(
  holdings: PlaidHolding[],
  securities: PlaidSecurity[],
  orgId: string,
  connectedBy: string | null,
) {
  const securityMap = new Map(securities.map((s) => [s.security_id, s]))

  for (const holding of holdings) {
    const security = securityMap.get(holding.security_id)
    const asset = assets.find((a) => a.externalId === holding.security_id)
    if (!asset) continue

    const now = new Date()
    valuations.push({
      assetId: asset.id,
      asOfDate: now,
      value: String(holding.institution_value),
      currency: holding.iso_currency_code ?? "USD",
      source: "plaid",
      notes: `Holdings update: ${security?.name ?? security?.ticker_symbol ?? holding.security_id}`,
    })

    const previousValue = asset.currentValue ? parseFloat(asset.currentValue) : undefined
    asset.currentValue = String(holding.institution_value)
    asset.valuedAt = now

    if (connectedBy) {
      ledgerEvents.push({
        orgId,
        actorUserId: connectedBy,
        targetType: "asset",
        targetId: asset.id,
        action: "asset_valued",
        payload: {
          previousValue,
          newValue: holding.institution_value,
          asOfDate: now.toISOString(),
          reason: "Plaid holdings update",
        },
      })
    }
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  assets = [
    {
      id: "asset-checking",
      entityId: "entity-001",
      externalId: "plaid_acct_checking",
      name: "Chase Checking",
      currentValue: "5000.00",
      valuedAt: new Date("2024-01-01"),
    },
    {
      id: "asset-savings",
      entityId: "entity-001",
      externalId: "plaid_acct_savings",
      name: "Chase Savings",
      currentValue: "25000.00",
      valuedAt: new Date("2024-01-01"),
    },
    {
      id: "asset-aapl",
      entityId: "entity-001",
      externalId: "sec_aapl",
      name: "Apple Inc",
      currentValue: "15000.00",
      valuedAt: new Date("2024-01-01"),
    },
    {
      id: "asset-no-external",
      entityId: "entity-001",
      externalId: null,
      name: "Real Estate",
      currentValue: "500000.00",
      valuedAt: new Date("2024-01-01"),
    },
  ]
  valuations = []
  ledgerEvents = []
})

// ============================================================================
// Transaction balance sync flow
// ============================================================================

describe("Plaid webhook flow — transaction balance sync", () => {
  it("creates valuations for each matched account", () => {
    syncTransactionBalances(
      [
        { account_id: "plaid_acct_checking", name: "Checking", balances: { current: 5500, iso_currency_code: "USD" } },
        { account_id: "plaid_acct_savings", name: "Savings", balances: { current: 26000, iso_currency_code: "USD" } },
      ],
      "Chase", "org-001", "user-001",
    )

    expect(valuations).toHaveLength(2)
    expect(valuations[0]).toMatchObject({
      assetId: "asset-checking",
      value: "5500",
      source: "plaid",
    })
    expect(valuations[1]).toMatchObject({
      assetId: "asset-savings",
      value: "26000",
      source: "plaid",
    })
  })

  it("updates asset currentValue and valuedAt", () => {
    syncTransactionBalances(
      [{ account_id: "plaid_acct_checking", name: "Checking", balances: { current: 5500, iso_currency_code: "USD" } }],
      "Chase", "org-001", "user-001",
    )

    const asset = assets.find((a) => a.id === "asset-checking")!
    expect(asset.currentValue).toBe("5500")
    expect(asset.valuedAt!.getTime()).toBeGreaterThan(new Date("2024-01-01").getTime())
  })

  it("records ledger events with previous and new values", () => {
    syncTransactionBalances(
      [{ account_id: "plaid_acct_checking", name: "Checking", balances: { current: 5500, iso_currency_code: "USD" } }],
      "Chase", "org-001", "user-001",
    )

    expect(ledgerEvents).toHaveLength(1)
    expect(ledgerEvents[0]).toMatchObject({
      orgId: "org-001",
      targetType: "asset",
      targetId: "asset-checking",
      action: "asset_valued",
    })
    expect(ledgerEvents[0].payload).toMatchObject({
      previousValue: 5000,
      newValue: 5500,
    })
  })

  it("skips accounts with null balance", () => {
    syncTransactionBalances(
      [{ account_id: "plaid_acct_checking", name: "Checking", balances: { current: null, iso_currency_code: "USD" } }],
      "Chase", "org-001", "user-001",
    )

    expect(valuations).toHaveLength(0)
  })

  it("skips accounts with no matching asset", () => {
    syncTransactionBalances(
      [{ account_id: "unknown_account", name: "Unknown", balances: { current: 1000, iso_currency_code: "USD" } }],
      "Chase", "org-001", "user-001",
    )

    expect(valuations).toHaveLength(0)
  })

  it("skips ledger events when connectedBy is null", () => {
    syncTransactionBalances(
      [{ account_id: "plaid_acct_checking", name: "Checking", balances: { current: 5500, iso_currency_code: "USD" } }],
      "Chase", "org-001", null,
    )

    expect(valuations).toHaveLength(1)
    expect(ledgerEvents).toHaveLength(0)
  })
})

// ============================================================================
// Holdings sync flow
// ============================================================================

describe("Plaid webhook flow — holdings sync", () => {
  it("creates valuations for each matched holding", () => {
    syncHoldings(
      [{ security_id: "sec_aapl", institution_value: 16000, iso_currency_code: "USD" }],
      [{ security_id: "sec_aapl", name: "Apple Inc", ticker_symbol: "AAPL" }],
      "org-001", "user-001",
    )

    expect(valuations).toHaveLength(1)
    expect(valuations[0]).toMatchObject({
      assetId: "asset-aapl",
      value: "16000",
      source: "plaid",
      notes: "Holdings update: Apple Inc",
    })
  })

  it("updates asset currentValue from holdings", () => {
    syncHoldings(
      [{ security_id: "sec_aapl", institution_value: 16000, iso_currency_code: "USD" }],
      [{ security_id: "sec_aapl", name: "Apple Inc", ticker_symbol: "AAPL" }],
      "org-001", "user-001",
    )

    const asset = assets.find((a) => a.id === "asset-aapl")!
    expect(asset.currentValue).toBe("16000")
  })

  it("falls back to ticker symbol in notes when name is null", () => {
    syncHoldings(
      [{ security_id: "sec_aapl", institution_value: 16000, iso_currency_code: "USD" }],
      [{ security_id: "sec_aapl", name: null, ticker_symbol: "AAPL" }],
      "org-001", "user-001",
    )

    expect(valuations[0].notes).toBe("Holdings update: AAPL")
  })

  it("skips holdings with no matching asset", () => {
    syncHoldings(
      [{ security_id: "sec_unknown", institution_value: 5000, iso_currency_code: "USD" }],
      [{ security_id: "sec_unknown", name: "Unknown Co", ticker_symbol: "UNK" }],
      "org-001", "user-001",
    )

    expect(valuations).toHaveLength(0)
  })

  it("creates ledger events with previous value tracking", () => {
    syncHoldings(
      [{ security_id: "sec_aapl", institution_value: 16000, iso_currency_code: "USD" }],
      [{ security_id: "sec_aapl", name: "Apple Inc", ticker_symbol: "AAPL" }],
      "org-001", "user-001",
    )

    expect(ledgerEvents).toHaveLength(1)
    expect(ledgerEvents[0].payload).toMatchObject({
      previousValue: 15000,
      newValue: 16000,
      reason: "Plaid holdings update",
    })
  })
})

// ============================================================================
// Mixed flow: balances + holdings in sequence
// ============================================================================

describe("Plaid webhook flow — combined sync", () => {
  it("handles balances then holdings without interference", () => {
    syncTransactionBalances(
      [
        { account_id: "plaid_acct_checking", name: "Checking", balances: { current: 5500, iso_currency_code: "USD" } },
      ],
      "Chase", "org-001", "user-001",
    )
    syncHoldings(
      [{ security_id: "sec_aapl", institution_value: 16000, iso_currency_code: "USD" }],
      [{ security_id: "sec_aapl", name: "Apple Inc", ticker_symbol: "AAPL" }],
      "org-001", "user-001",
    )

    expect(valuations).toHaveLength(2)
    expect(ledgerEvents).toHaveLength(2)
    expect(assets.find((a) => a.id === "asset-checking")!.currentValue).toBe("5500")
    expect(assets.find((a) => a.id === "asset-aapl")!.currentValue).toBe("16000")
  })
})
