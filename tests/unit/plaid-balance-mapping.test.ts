import { describe, it, expect } from "vitest"
import {
  mapPlaidAccountToAssetClass,
  PLAID_ACCOUNT_TYPE_MAP,
} from "@/lib/validations/plaid.schema"

describe("Plaid Balance Mapping", () => {
  describe("mapPlaidAccountToAssetClass", () => {
    it("maps checking account to cash", () => {
      expect(mapPlaidAccountToAssetClass("depository", "checking")).toBe("cash")
    })

    it("maps savings account to cash", () => {
      expect(mapPlaidAccountToAssetClass("depository", "savings")).toBe("cash")
    })

    it("maps investment/brokerage to equities", () => {
      expect(mapPlaidAccountToAssetClass("investment", "brokerage")).toBe("equities")
    })

    it("maps investment without subtype to equities", () => {
      expect(mapPlaidAccountToAssetClass("investment")).toBe("equities")
    })

    it("maps depository without subtype to cash", () => {
      expect(mapPlaidAccountToAssetClass("depository")).toBe("cash")
    })

    it("maps credit to cash", () => {
      expect(mapPlaidAccountToAssetClass("credit")).toBe("cash")
    })

    it("maps loan to cash", () => {
      expect(mapPlaidAccountToAssetClass("loan")).toBe("cash")
    })

    it("maps unknown type to other", () => {
      expect(mapPlaidAccountToAssetClass("unknown_type")).toBe("other")
    })

    it("maps other type to other", () => {
      expect(mapPlaidAccountToAssetClass("other")).toBe("other")
    })

    it("prefers subtype mapping over type mapping", () => {
      // subtype "brokerage" maps to equities, even if type is "depository"
      expect(mapPlaidAccountToAssetClass("depository", "brokerage")).toBe("equities")
    })

    it("falls back to type when subtype is null", () => {
      expect(mapPlaidAccountToAssetClass("depository", null)).toBe("cash")
    })

    it("falls back to type when subtype is undefined", () => {
      expect(mapPlaidAccountToAssetClass("depository", undefined)).toBe("cash")
    })

    it("handles empty string subtype by falling back to type", () => {
      expect(mapPlaidAccountToAssetClass("depository", "")).toBe("cash")
    })
  })

  describe("PLAID_ACCOUNT_TYPE_MAP", () => {
    it("contains expected mappings", () => {
      expect(PLAID_ACCOUNT_TYPE_MAP.depository).toBe("cash")
      expect(PLAID_ACCOUNT_TYPE_MAP.checking).toBe("cash")
      expect(PLAID_ACCOUNT_TYPE_MAP.savings).toBe("cash")
      expect(PLAID_ACCOUNT_TYPE_MAP.investment).toBe("equities")
      expect(PLAID_ACCOUNT_TYPE_MAP.brokerage).toBe("equities")
      expect(PLAID_ACCOUNT_TYPE_MAP.credit).toBe("cash")
      expect(PLAID_ACCOUNT_TYPE_MAP.loan).toBe("cash")
      expect(PLAID_ACCOUNT_TYPE_MAP.other).toBe("other")
    })
  })
})
