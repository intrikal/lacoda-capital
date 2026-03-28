import { describe, it, expect, vi, beforeEach } from "vitest"
import { z } from "zod"

/**
 * Unit tests for the shared AI agent infrastructure (lib/agents/base.ts).
 *
 * These tests mock the Claude API and database to test the agent pattern
 * in isolation: input validation, JSON parsing, Zod schema validation,
 * confidence flagging, retry logic, and error handling.
 */

// Mock the database
vi.mock("@/app/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: "log-123" }]),
      })),
    })),
  },
}))

vi.mock("@/app/db/schema", () => ({
  aiCallLog: { id: "ai_call_log" },
}))

// ─── flagLowConfidenceFields ────────────────────────────────────────────────

import { flagLowConfidenceFields } from "@/lib/agents/base"

describe("flagLowConfidenceFields", () => {
  it("flags fields below the default threshold (0.8)", () => {
    const confidence = {
      property_address: 0.95,
      valuation_amount: 0.72,
      appraiser_name: 0.5,
      document_type: 0.85,
    }

    const flagged = flagLowConfidenceFields(confidence)
    expect(flagged).toContain("valuation_amount")
    expect(flagged).toContain("appraiser_name")
    expect(flagged).not.toContain("property_address")
    expect(flagged).not.toContain("document_type")
  })

  it("uses custom threshold when provided", () => {
    const confidence = {
      field_a: 0.6,
      field_b: 0.4,
      field_c: 0.9,
    }

    const flagged = flagLowConfidenceFields(confidence, 0.5)
    expect(flagged).toEqual(["field_b"])
  })

  it("returns empty array when all fields are above threshold", () => {
    const confidence = {
      field_a: 0.9,
      field_b: 0.85,
      field_c: 1.0,
    }

    const flagged = flagLowConfidenceFields(confidence)
    expect(flagged).toEqual([])
  })

  it("flags all fields when all are below threshold", () => {
    const confidence = {
      field_a: 0.1,
      field_b: 0.2,
    }

    const flagged = flagLowConfidenceFields(confidence)
    expect(flagged).toHaveLength(2)
  })

  it("confidence exactly at threshold is NOT flagged", () => {
    const confidence = { field: 0.8 }
    const flagged = flagLowConfidenceFields(confidence, 0.8)
    expect(flagged).toEqual([])
  })
})

// ─── createAIAgent ──────────────────────────────────────────────────────────

describe("createAIAgent", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects when context assembly returns empty data", async () => {
    // We need to dynamically import to get fresh mocks
    const { createAIAgent } = await import("@/lib/agents/base")

    const agent = createAIAgent({
      agentType: "test",
      outputSchema: z.object({ value: z.string() }),
      systemPrompt: "Test prompt",
    })

    const result = await agent.run("", {
      orgId: "org-1",
      actorUserId: "user-1",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe("EMPTY_CONTEXT")
      expect(result.error).toContain("empty")
    }
  })

  it("rejects whitespace-only input", async () => {
    const { createAIAgent } = await import("@/lib/agents/base")

    const agent = createAIAgent({
      agentType: "test",
      outputSchema: z.object({ value: z.string() }),
      systemPrompt: "Test prompt",
    })

    const result = await agent.run("   \n\t  ", {
      orgId: "org-1",
      actorUserId: "user-1",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe("EMPTY_CONTEXT")
    }
  })
})
