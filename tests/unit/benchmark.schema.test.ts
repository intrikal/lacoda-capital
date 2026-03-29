import { describe, it, expect } from "vitest"
import { createBenchmarkSchema, updateBenchmarkSchema } from "@/lib/validations/benchmark.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("createBenchmarkSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createBenchmarkSchema.safeParse({ name: "S&P 500" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe("index")
      expect(result.data.ytdReturn).toBe(0)
      expect(result.data.alpha).toBe(0)
      expect(result.data.beta).toBe(1)
      expect(result.data.sharpeRatio).toBe(0)
      expect(result.data.volatility).toBe(0)
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createBenchmarkSchema.safeParse({
      clientId: UUID,
      name: "Russell 2000",
      symbol: "RUT",
      category: "etf",
      ytdReturn: 12.5,
      alpha: 1.2,
      beta: 0.95,
      sharpeRatio: 1.8,
      volatility: 15.3,
      notes: "Small-cap benchmark",
      metadata: { source: "bloomberg" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing name", () => {
    const result = createBenchmarkSchema.safeParse({ category: "index" })
    expect(result.success).toBe(false)
  })

  it("rejects empty name", () => {
    const result = createBenchmarkSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 255 characters", () => {
    const result = createBenchmarkSchema.safeParse({ name: "A".repeat(256) })
    expect(result.success).toBe(false)
  })

  it("rejects invalid category", () => {
    const result = createBenchmarkSchema.safeParse({ name: "Test", category: "bond" })
    expect(result.success).toBe(false)
  })

  it("accepts all valid categories", () => {
    for (const category of ["index", "etf", "mutual_fund", "custom"]) {
      const result = createBenchmarkSchema.safeParse({ name: "Test", category })
      expect(result.success).toBe(true)
    }
  })

  it("rejects negative volatility", () => {
    const result = createBenchmarkSchema.safeParse({ name: "Test", volatility: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects invalid clientId uuid", () => {
    const result = createBenchmarkSchema.safeParse({ name: "Test", clientId: "not-a-uuid" })
    expect(result.success).toBe(false)
  })

  it("accepts null clientId", () => {
    const result = createBenchmarkSchema.safeParse({ name: "Test", clientId: null })
    expect(result.success).toBe(true)
  })

  it("accepts null symbol", () => {
    const result = createBenchmarkSchema.safeParse({ name: "Test", symbol: null })
    expect(result.success).toBe(true)
  })

  it("rejects symbol exceeding 20 characters", () => {
    const result = createBenchmarkSchema.safeParse({ name: "Test", symbol: "A".repeat(21) })
    expect(result.success).toBe(false)
  })

  it("trims name whitespace", () => {
    const result = createBenchmarkSchema.safeParse({ name: "  S&P 500  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("S&P 500")
    }
  })

  it("accepts null notes", () => {
    const result = createBenchmarkSchema.safeParse({ name: "Test", notes: null })
    expect(result.success).toBe(true)
  })

  it("rejects notes exceeding 2000 characters", () => {
    const result = createBenchmarkSchema.safeParse({ name: "Test", notes: "A".repeat(2001) })
    expect(result.success).toBe(false)
  })
})

describe("updateBenchmarkSchema", () => {
  it("accepts an empty object", () => {
    const result = updateBenchmarkSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with name only", () => {
    const result = updateBenchmarkSchema.safeParse({ name: "Updated" })
    expect(result.success).toBe(true)
  })

  it("rejects empty name string", () => {
    const result = updateBenchmarkSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects negative volatility", () => {
    const result = updateBenchmarkSchema.safeParse({ volatility: -5 })
    expect(result.success).toBe(false)
  })
})
