import { describe, it, expect } from "vitest"
import { blockDemoMutation } from "@/lib/demo/guard"
import { DEMO_ORG_ID } from "@/lib/demo/data"

describe("demo mutation guard", () => {
  it("throws for the demo org ID", () => {
    expect(() => blockDemoMutation(DEMO_ORG_ID)).toThrow("Demo mode")
  })

  it("does not throw for a real org ID", () => {
    expect(() => blockDemoMutation("550e8400-e29b-41d4-a716-446655440000")).not.toThrow()
  })

  it("does not throw for null org ID", () => {
    expect(() => blockDemoMutation(null)).not.toThrow()
  })

  it("does not throw for undefined org ID", () => {
    expect(() => blockDemoMutation(undefined)).not.toThrow()
  })
})
