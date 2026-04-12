import { describe, it, expect } from "vitest"
import { createAssetSchema } from "@/lib/validations/asset.schema"
import { sendMessageSchema } from "@/lib/validations/message.schema"
import { createEntitySchema } from "@/lib/validations/entity.schema"

describe("debug schema failures", () => {
  it("asset with XSS name", () => {
    const result = createAssetSchema.safeParse({
      entityId: "00000000-0000-0000-0000-000000000001",
      name: "<b>Bold</b><img src=x onerror=alert(1)>",
      assetClass: "real_estate",
    })
    if (!result.success) {
      console.log("ASSET ERRORS:", JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })

  it("message with XSS", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "00000000-0000-0000-0000-000000000001",
      content: "<img src=x onerror=alert(1)>",
    })
    if (!result.success) {
      console.log("MESSAGE ERRORS:", JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })

  it("entity with js protocol", () => {
    const result = createEntitySchema.safeParse({
      clientId: "00000000-0000-0000-0000-000000000001",
      name: "javascript:alert(document.cookie)",
      entityType: "llc",
    })
    if (!result.success) {
      console.log("ENTITY ERRORS:", JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })
})
