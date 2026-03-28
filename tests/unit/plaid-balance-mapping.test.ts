/**
 * ============================================================================
 * TEST FILE: plaid-balance-mapping.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the logic that takes raw Plaid account data and
 * decides what "asset class" each account belongs to in our system.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THE PROBLEM THIS SOLVES                                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ When a user connects their bank through Plaid, Plaid tells us things   │
 * │ like "this is a depository/checking account with $5,000 current        │
 * │ balance." We need to translate that into our system's language:         │
 * │   - What asset class is it? (cash, equity, fixed_income, …)            │
 * │   - What dollar value should we record as the valuation?               │
 * │   - How do we handle weird cases (null balance, non-USD, credit cards)  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PLAID ACCOUNT TYPE TAXONOMY                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Plaid organizes accounts into type + subtype:                          │
 * │                                                                         │
 * │ type: "depository"                                                      │
 * │   subtype: checking, savings, money market, cd, hsa, …                 │
 * │   → Our mapping: "cash" asset class                                    │
 * │                                                                         │
 * │ type: "credit"                                                          │
 * │   subtype: credit card, paypal, …                                      │
 * │   → Our mapping: "other" asset class (liabilities)                     │
 * │                                                                         │
 * │ type: "loan"                                                            │
 * │   subtype: mortgage, student, auto, personal, …                        │
 * │   → Our mapping: "other" asset class (liabilities)                     │
 * │                                                                         │
 * │ type: "investment"                                                      │
 * │   subtype: brokerage, 401k, ira, roth, …                              │
 * │   → Our mapping: "equity" asset class                                  │
 * │                                                                         │
 * │ type: "other"                                                           │
 * │   → Our mapping: "other" asset class                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ BALANCE VALUE LOGIC                                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Plaid gives us two balance fields:                                      │
 * │   current   — the real current balance (includes pending transactions) │
 * │   available — the amount you can actually spend right now              │
 * │                                                                         │
 * │ Our rule: prefer "current" over "available".                           │
 * │   - If current is null, fall back to available.                        │
 * │   - If both are null, use 0.                                           │
 * │   - Credit/loan accounts may have negative values — keep them as-is.  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/plaid.ts — getAccountBalances(), exchangePublicToken()
 *
 * NOTE: The mapping functions tested here are the INTENDED implementation.
 * If they don't exist yet in plaid.ts, these tests serve as the spec for
 * what to build.
 */

import { describe, it, expect } from "vitest"

// ─── The functions we're testing ──────────────────────────────────────────
//
// These are pure utility functions that should live in lib/integrations/plaid.ts
// (or a dedicated lib/integrations/plaid-utils.ts). They take a Plaid account
// object and return our internal representation.
//
// We define them inline here so the tests run even before they're extracted
// into the source. When you move them to plaid.ts, update this import.

type PlaidAccount = {
  account_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  balances: {
    current: number | null
    available: number | null
    iso_currency_code: string | null
  }
}

type AssetClass =
  | "cash"
  | "equity"
  | "fixed_income"
  | "real_estate"
  | "alternative"
  | "crypto"
  | "other"

type MappedAccount = {
  assetClass: AssetClass
  value: number
  currencyCode: string
  isLiability: boolean
  displayName: string
}

/**
 * Map a Plaid account type/subtype to our internal asset class.
 *
 * This is the core logic we're testing. It lives here as the reference
 * implementation — move it to lib/integrations/plaid.ts when ready.
 */
function mapPlaidAccountToAssetClass(type: string, subtype: string | null): AssetClass {
  switch (type) {
    case "depository":
      return "cash"

    case "investment": {
      // Some investment subtypes are more like fixed income
      if (subtype === "cd" || subtype === "money market") {
        return "fixed_income"
      }
      return "equity"
    }

    case "credit":
    case "loan":
      return "other"

    default:
      return "other"
  }
}

/**
 * Determine whether a Plaid account represents a liability (something owed).
 */
function isLiabilityAccount(type: string): boolean {
  return type === "credit" || type === "loan"
}

/**
 * Extract the best available balance value from a Plaid account.
 *
 * Rules:
 *   1. Use current if available
 *   2. Fall back to available
 *   3. Default to 0 if both are null
 */
function extractBalanceValue(balances: PlaidAccount["balances"]): number {
  if (balances.current !== null) return balances.current
  if (balances.available !== null) return balances.available
  return 0
}

/**
 * Full mapping: Plaid account → our MappedAccount shape.
 */
function mapPlaidAccountToMappedAccount(account: PlaidAccount): MappedAccount {
  return {
    assetClass: mapPlaidAccountToAssetClass(account.type, account.subtype),
    value: extractBalanceValue(account.balances),
    currencyCode: account.balances.iso_currency_code ?? "USD",
    isLiability: isLiabilityAccount(account.type),
    displayName: account.official_name ?? account.name,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function makePlaidAccount(overrides: Partial<PlaidAccount> & Pick<PlaidAccount, "type">): PlaidAccount {
  return {
    account_id: "acct_test_001",
    name: "Test Account",
    official_name: null,
    subtype: null,
    balances: {
      current: 1000,
      available: 1000,
      iso_currency_code: "USD",
    },
    ...overrides,
  }
}

// ============================================================================
// 1. Asset class mapping — depository accounts
// ============================================================================

describe("mapPlaidAccountToAssetClass — depository accounts", () => {
  it("maps depository/checking → cash", () => {
    expect(mapPlaidAccountToAssetClass("depository", "checking")).toBe("cash")
  })

  it("maps depository/savings → cash", () => {
    expect(mapPlaidAccountToAssetClass("depository", "savings")).toBe("cash")
  })

  it("maps depository/money market → cash", () => {
    // Money market is a depository account in Plaid's taxonomy
    expect(mapPlaidAccountToAssetClass("depository", "money market")).toBe("cash")
  })

  it("maps depository/cd → cash (CD is depository in Plaid, not investment)", () => {
    // Certificate of Deposit — Plaid classifies as depository, not investment
    expect(mapPlaidAccountToAssetClass("depository", "cd")).toBe("cash")
  })

  it("maps depository/hsa → cash", () => {
    expect(mapPlaidAccountToAssetClass("depository", "hsa")).toBe("cash")
  })

  it("maps depository with null subtype → cash", () => {
    expect(mapPlaidAccountToAssetClass("depository", null)).toBe("cash")
  })

  it("maps depository/payroll → cash", () => {
    expect(mapPlaidAccountToAssetClass("depository", "payroll")).toBe("cash")
  })
})

// ============================================================================
// 2. Asset class mapping — credit accounts
// ============================================================================

describe("mapPlaidAccountToAssetClass — credit accounts", () => {
  it("maps credit/credit card → other", () => {
    expect(mapPlaidAccountToAssetClass("credit", "credit card")).toBe("other")
  })

  it("maps credit/paypal → other", () => {
    expect(mapPlaidAccountToAssetClass("credit", "paypal")).toBe("other")
  })

  it("maps credit with null subtype → other", () => {
    expect(mapPlaidAccountToAssetClass("credit", null)).toBe("other")
  })
})

// ============================================================================
// 3. Asset class mapping — loan accounts
// ============================================================================

describe("mapPlaidAccountToAssetClass — loan accounts", () => {
  it("maps loan/mortgage → other", () => {
    expect(mapPlaidAccountToAssetClass("loan", "mortgage")).toBe("other")
  })

  it("maps loan/student → other", () => {
    expect(mapPlaidAccountToAssetClass("loan", "student")).toBe("other")
  })

  it("maps loan/auto → other", () => {
    expect(mapPlaidAccountToAssetClass("loan", "auto")).toBe("other")
  })

  it("maps loan/personal → other", () => {
    expect(mapPlaidAccountToAssetClass("loan", "personal")).toBe("other")
  })

  it("maps loan/home equity → other", () => {
    expect(mapPlaidAccountToAssetClass("loan", "home equity")).toBe("other")
  })

  it("maps loan with null subtype → other", () => {
    expect(mapPlaidAccountToAssetClass("loan", null)).toBe("other")
  })
})

// ============================================================================
// 4. Asset class mapping — investment accounts
// ============================================================================

describe("mapPlaidAccountToAssetClass — investment accounts", () => {
  it("maps investment/brokerage → equity", () => {
    expect(mapPlaidAccountToAssetClass("investment", "brokerage")).toBe("equity")
  })

  it("maps investment/401k → equity", () => {
    expect(mapPlaidAccountToAssetClass("investment", "401k")).toBe("equity")
  })

  it("maps investment/ira → equity", () => {
    expect(mapPlaidAccountToAssetClass("investment", "ira")).toBe("equity")
  })

  it("maps investment/roth → equity", () => {
    expect(mapPlaidAccountToAssetClass("investment", "roth")).toBe("equity")
  })

  it("maps investment/403b → equity", () => {
    expect(mapPlaidAccountToAssetClass("investment", "403b")).toBe("equity")
  })

  it("maps investment/529 → equity", () => {
    expect(mapPlaidAccountToAssetClass("investment", "529")).toBe("equity")
  })

  it("maps investment/cd → fixed_income", () => {
    // When Plaid classifies a CD under investment (not depository), treat as fixed_income
    expect(mapPlaidAccountToAssetClass("investment", "cd")).toBe("fixed_income")
  })

  it("maps investment/money market → fixed_income", () => {
    expect(mapPlaidAccountToAssetClass("investment", "money market")).toBe("fixed_income")
  })

  it("maps investment with null subtype → equity (default)", () => {
    expect(mapPlaidAccountToAssetClass("investment", null)).toBe("equity")
  })
})

// ============================================================================
// 5. Asset class mapping — other/unknown
// ============================================================================

describe("mapPlaidAccountToAssetClass — other/unknown types", () => {
  it("maps other type → other", () => {
    expect(mapPlaidAccountToAssetClass("other", null)).toBe("other")
  })

  it("maps completely unknown type → other (default fallback)", () => {
    expect(mapPlaidAccountToAssetClass("unknown_future_type", null)).toBe("other")
  })

  it("maps empty string type → other (defensive fallback)", () => {
    expect(mapPlaidAccountToAssetClass("", null)).toBe("other")
  })
})

// ============================================================================
// 6. isLiabilityAccount
// ============================================================================

describe("isLiabilityAccount", () => {
  it("credit accounts are liabilities", () => {
    expect(isLiabilityAccount("credit")).toBe(true)
  })

  it("loan accounts are liabilities", () => {
    expect(isLiabilityAccount("loan")).toBe(true)
  })

  it("depository accounts are NOT liabilities", () => {
    expect(isLiabilityAccount("depository")).toBe(false)
  })

  it("investment accounts are NOT liabilities", () => {
    expect(isLiabilityAccount("investment")).toBe(false)
  })

  it("other type is NOT a liability", () => {
    expect(isLiabilityAccount("other")).toBe(false)
  })
})

// ============================================================================
// 7. extractBalanceValue — choosing the right number
// ============================================================================

describe("extractBalanceValue — picking current vs available vs 0", () => {
  it("prefers current over available when both are present", () => {
    const value = extractBalanceValue({ current: 5432.10, available: 5200.00, iso_currency_code: "USD" })
    expect(value).toBe(5432.10)
  })

  it("falls back to available when current is null", () => {
    const value = extractBalanceValue({ current: null, available: 4800.00, iso_currency_code: "USD" })
    expect(value).toBe(4800.00)
  })

  it("returns 0 when both current and available are null", () => {
    const value = extractBalanceValue({ current: null, available: null, iso_currency_code: null })
    expect(value).toBe(0)
  })

  it("preserves zero as current balance (not falsy fallback)", () => {
    // 0 is a valid balance — should NOT fall back to available
    const value = extractBalanceValue({ current: 0, available: 500.00, iso_currency_code: "USD" })
    expect(value).toBe(0)
  })

  it("preserves negative current balance (credit card balance owed)", () => {
    // Credit cards report a negative current balance when money is owed
    const value = extractBalanceValue({ current: -1200.50, available: 13799.50, iso_currency_code: "USD" })
    expect(value).toBe(-1200.50)
  })

  it("preserves negative available balance", () => {
    const value = extractBalanceValue({ current: null, available: -50.00, iso_currency_code: "USD" })
    expect(value).toBe(-50.00)
  })

  it("handles very large balances (no overflow)", () => {
    const value = extractBalanceValue({ current: 9_999_999.99, available: null, iso_currency_code: "USD" })
    expect(value).toBe(9_999_999.99)
  })

  it("handles sub-cent precision from Plaid", () => {
    const value = extractBalanceValue({ current: 1234.567, available: null, iso_currency_code: "USD" })
    expect(value).toBe(1234.567)
  })
})

// ============================================================================
// 8. mapPlaidAccountToMappedAccount — full integration of all logic
// ============================================================================

describe("mapPlaidAccountToMappedAccount — full mapping", () => {
  it("maps a checking account correctly", () => {
    const account = makePlaidAccount({
      type: "depository",
      subtype: "checking",
      name: "Chase Checking",
      official_name: "Chase Premier Platinum Checking",
      balances: { current: 5432.10, available: 5200.00, iso_currency_code: "USD" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)

    expect(mapped.assetClass).toBe("cash")
    expect(mapped.value).toBe(5432.10)
    expect(mapped.currencyCode).toBe("USD")
    expect(mapped.isLiability).toBe(false)
    expect(mapped.displayName).toBe("Chase Premier Platinum Checking")
  })

  it("uses name when official_name is null", () => {
    const account = makePlaidAccount({
      type: "depository",
      subtype: "savings",
      name: "Online Savings",
      official_name: null,
      balances: { current: 10000, available: 10000, iso_currency_code: "USD" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)
    expect(mapped.displayName).toBe("Online Savings")
  })

  it("maps a credit card as liability with negative value", () => {
    const account = makePlaidAccount({
      type: "credit",
      subtype: "credit card",
      name: "Amex Gold",
      official_name: "American Express Gold Card",
      balances: { current: -850.00, available: 9150.00, iso_currency_code: "USD" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)

    expect(mapped.assetClass).toBe("other")
    expect(mapped.value).toBe(-850.00)
    expect(mapped.isLiability).toBe(true)
  })

  it("maps a 401k as equity asset", () => {
    const account = makePlaidAccount({
      type: "investment",
      subtype: "401k",
      name: "Fidelity 401(k)",
      official_name: null,
      balances: { current: 245000, available: null, iso_currency_code: "USD" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)

    expect(mapped.assetClass).toBe("equity")
    expect(mapped.value).toBe(245000)
    expect(mapped.isLiability).toBe(false)
  })

  it("defaults currencyCode to USD when iso_currency_code is null", () => {
    const account = makePlaidAccount({
      type: "depository",
      subtype: "savings",
      balances: { current: 1000, available: 1000, iso_currency_code: null },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)
    expect(mapped.currencyCode).toBe("USD")
  })

  it("preserves non-USD currency code (EUR)", () => {
    const account = makePlaidAccount({
      type: "depository",
      subtype: "checking",
      balances: { current: 5000, available: 4800, iso_currency_code: "EUR" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)
    expect(mapped.currencyCode).toBe("EUR")
  })

  it("maps a mortgage loan as a liability with its balance", () => {
    const account = makePlaidAccount({
      type: "loan",
      subtype: "mortgage",
      name: "Chase Mortgage",
      official_name: null,
      balances: { current: -285000, available: null, iso_currency_code: "USD" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)

    expect(mapped.assetClass).toBe("other")
    expect(mapped.isLiability).toBe(true)
    expect(mapped.value).toBe(-285000)
  })

  it("maps an account with all-null balances to value 0", () => {
    const account = makePlaidAccount({
      type: "depository",
      subtype: "checking",
      balances: { current: null, available: null, iso_currency_code: "USD" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)
    expect(mapped.value).toBe(0)
  })
})

// ============================================================================
// 9. Batch mapping — multiple accounts at once
// ============================================================================

describe("batch mapping — multiple accounts", () => {
  it("maps an array of mixed accounts correctly", () => {
    const accounts: PlaidAccount[] = [
      makePlaidAccount({
        account_id: "acct_1",
        type: "depository",
        subtype: "checking",
        name: "Checking",
        balances: { current: 5000, available: 4800, iso_currency_code: "USD" },
      }),
      makePlaidAccount({
        account_id: "acct_2",
        type: "investment",
        subtype: "brokerage",
        name: "Brokerage",
        balances: { current: 100000, available: null, iso_currency_code: "USD" },
      }),
      makePlaidAccount({
        account_id: "acct_3",
        type: "credit",
        subtype: "credit card",
        name: "Visa",
        balances: { current: -500, available: 4500, iso_currency_code: "USD" },
      }),
    ]

    const mapped = accounts.map(mapPlaidAccountToMappedAccount)

    expect(mapped).toHaveLength(3)
    expect(mapped[0].assetClass).toBe("cash")
    expect(mapped[1].assetClass).toBe("equity")
    expect(mapped[2].assetClass).toBe("other")

    // Only credit card is a liability
    expect(mapped[0].isLiability).toBe(false)
    expect(mapped[1].isLiability).toBe(false)
    expect(mapped[2].isLiability).toBe(true)
  })

  it("sums total non-liability value across accounts", () => {
    const accounts: PlaidAccount[] = [
      makePlaidAccount({ type: "depository", subtype: "checking", balances: { current: 5000, available: 5000, iso_currency_code: "USD" } }),
      makePlaidAccount({ type: "investment", subtype: "brokerage", balances: { current: 100000, available: null, iso_currency_code: "USD" } }),
      makePlaidAccount({ type: "credit", subtype: "credit card", balances: { current: -500, available: 4500, iso_currency_code: "USD" } }),
    ]

    const mapped = accounts.map(mapPlaidAccountToMappedAccount)
    const totalAssets = mapped
      .filter((a) => !a.isLiability)
      .reduce((sum, a) => sum + a.value, 0)

    expect(totalAssets).toBe(105000)
  })

  it("handles empty account list", () => {
    const mapped = ([] as PlaidAccount[]).map(mapPlaidAccountToMappedAccount)
    expect(mapped).toHaveLength(0)
  })
})

// ============================================================================
// 10. Currency conversion edge cases
// ============================================================================

describe("currency handling edge cases", () => {
  it("GBP account preserves currency code", () => {
    const account = makePlaidAccount({
      type: "depository",
      subtype: "checking",
      balances: { current: 10000, available: 9500, iso_currency_code: "GBP" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)
    expect(mapped.currencyCode).toBe("GBP")
  })

  it("CAD account preserves currency code", () => {
    const account = makePlaidAccount({
      type: "investment",
      subtype: "brokerage",
      balances: { current: 50000, available: null, iso_currency_code: "CAD" },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)
    expect(mapped.currencyCode).toBe("CAD")
  })

  it("null iso_currency_code defaults to USD", () => {
    const account = makePlaidAccount({
      type: "depository",
      subtype: "checking",
      balances: { current: 1000, available: 1000, iso_currency_code: null },
    })
    const mapped = mapPlaidAccountToMappedAccount(account)
    expect(mapped.currencyCode).toBe("USD")
  })
})
