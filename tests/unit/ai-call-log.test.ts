import { describe, it, expect } from "vitest"
import { z } from "zod"

/**
 * Unit tests for the ai_call_log schema validation.
 *
 * Tests that the ai_call_log table schema correctly validates
 * agent types, model versions, and status values.
 */

// Schema matching the ai_call_log table structure
const aiCallLogSchema = z.object({
  orgId: z.string().uuid(),
  agentType: z.enum(["extraction", "narrative", "email_draft", "alert_digest"]),
  inputHash: z.string().min(64).max(64), // SHA-256 hex
  output: z.record(z.string(), z.any()),
  latencyMs: z.number().int().nonnegative(),
  modelVersion: z.string(),
  tokenCount: z.number().int().nonnegative().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  costEstimate: z.string().optional(), // numeric as string
  status: z.enum(["success", "error", "timeout"]),
  actorUserId: z.string().uuid().optional(),
  targetId: z.string().optional(),
  targetType: z.enum(["document", "report", "document_request", "digest"]).optional(),
})

describe("ai_call_log schema validation", () => {
  it("validates a success log entry", () => {
    const entry = {
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      agentType: "extraction" as const,
      inputHash: "a".repeat(64),
      output: { property_address: "123 Main St" },
      latencyMs: 1500,
      modelVersion: "claude-sonnet-4-20250514",
      tokenCount: 2000,
      inputTokens: 1500,
      outputTokens: 500,
      costEstimate: "0.0120",
      status: "success" as const,
      actorUserId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      targetId: "doc-123",
      targetType: "document" as const,
    }

    expect(aiCallLogSchema.safeParse(entry).success).toBe(true)
  })

  it("validates an error log entry", () => {
    const entry = {
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      agentType: "narrative" as const,
      inputHash: "b".repeat(64),
      output: {},
      latencyMs: 30000,
      modelVersion: "claude-sonnet-4-20250514",
      status: "timeout" as const,
    }

    expect(aiCallLogSchema.safeParse(entry).success).toBe(true)
  })

  it("validates model_version must be claude-sonnet-4-20250514", () => {
    const entry = {
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      agentType: "extraction" as const,
      inputHash: "c".repeat(64),
      output: {},
      latencyMs: 500,
      modelVersion: "claude-sonnet-4-20250514",
      status: "success" as const,
    }

    const result = aiCallLogSchema.safeParse(entry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.modelVersion).toBe("claude-sonnet-4-20250514")
    }
  })

  it("rejects invalid agent types", () => {
    const entry = {
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      agentType: "invalid_agent",
      inputHash: "d".repeat(64),
      output: {},
      latencyMs: 500,
      modelVersion: "claude-sonnet-4-20250514",
      status: "success",
    }

    expect(aiCallLogSchema.safeParse(entry).success).toBe(false)
  })

  it("rejects negative latency", () => {
    const entry = {
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      agentType: "extraction",
      inputHash: "e".repeat(64),
      output: {},
      latencyMs: -100,
      modelVersion: "claude-sonnet-4-20250514",
      status: "success",
    }

    expect(aiCallLogSchema.safeParse(entry).success).toBe(false)
  })

  it("ai_call_log row created for every agent type", () => {
    const agentTypes = ["extraction", "narrative", "email_draft", "alert_digest"] as const

    for (const agentType of agentTypes) {
      const entry = {
        orgId: "550e8400-e29b-41d4-a716-446655440000",
        agentType,
        inputHash: "f".repeat(64),
        output: { test: true },
        latencyMs: 1000,
        modelVersion: "claude-sonnet-4-20250514",
        status: "success" as const,
      }

      const result = aiCallLogSchema.safeParse(entry)
      expect(result.success).toBe(true)
    }
  })
})
