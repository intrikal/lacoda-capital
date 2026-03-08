import { describe, it, expect } from "vitest"
import { createAssetSchema, updateAssetSchema } from "@/lib/validations/asset.schema"

describe("createAssetSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createAssetSchema.safeParse({
      name: "US Treasury Bond",
      assetClass: "fixed_income",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = createAssetSchema.safeParse({
      name: "AAPL Shares",
      assetClass: "equities",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
      description: "Apple Inc. common stock",
      status: "active",
      acquisitionDate: "2024-01-15",
      acquisitionCost: 120000,
      currentValue: 150000,
      currency: "USD",
      metadata: { ticker: "AAPL" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid asset classes", () => {
    const classes = [
      "real_estate", "equities", "fixed_income", "private_equity",
      "venture_capital", "hedge_funds", "commodities", "cash",
      "crypto", "collectibles", "intellectual_property", "insurance", "other",
    ]
    for (const assetClass of classes) {
      const result = createAssetSchema.safeParse({
        name: "Test",
        assetClass,
        entityId: "550e8400-e29b-41d4-a716-446655440000",
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects missing name", () => {
    const result = createAssetSchema.safeParse({
      assetClass: "equities",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid assetClass", () => {
    const result = createAssetSchema.safeParse({
      name: "Test",
      assetClass: "nft",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative currentValue", () => {
    const result = createAssetSchema.safeParse({
      name: "Test",
      assetClass: "equities",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
      currentValue: -100,
    })
    expect(result.success).toBe(false)
  })

  it("defaults status to active", () => {
    const result = createAssetSchema.safeParse({
      name: "Test",
      assetClass: "cash",
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("active")
    }
  })
})

describe("updateAssetSchema", () => {
  it("accepts an empty object", () => {
    const result = updateAssetSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with name only", () => {
    const result = updateAssetSchema.safeParse({ name: "Updated Bond" })
    expect(result.success).toBe(true)
  })

  it("does not accept entityId (omitted from update)", () => {
    const result = updateAssetSchema.safeParse({
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty("entityId")
    }
  })
})
