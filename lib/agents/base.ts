import { z } from "zod";
import { db } from "@/app/db";
import { aiCallLog } from "@/app/db/schema";
import { createHash } from "crypto";

// ============================================================================
// Shared AI Agent Infrastructure
// ============================================================================
//
// All 4 AI agents follow the same pattern:
//   1. Context assembly — gather relevant data from DB
//   2. Claude API call — structured JSON output validated by Zod
//   3. Human-in-the-loop — user reviews + confirms
//   4. On confirm — save to DB + log ledger event with AI source
//
// This module provides the shared `createAIAgent` helper that handles
// steps 2-3 and logging, while each agent provides its own context
// assembly function and Zod output schema.
// ============================================================================

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentConfig<TOutput extends z.ZodType> {
  /** Unique agent identifier: 'extraction' | 'narrative' | 'email_draft' | 'alert_digest' */
  agentType: string;

  /** Zod schema for validating the structured output from Claude */
  outputSchema: TOutput;

  /** The system prompt describing the agent's role and output format */
  systemPrompt: string;

  /** Confidence threshold — fields below this are flagged (default: 0.8) */
  confidenceThreshold?: number;

  /** Model override (defaults to claude-sonnet-4-20250514) */
  model?: string;

  /** Timeout in ms (defaults to 30s) */
  timeoutMs?: number;

  /** Max tokens for the response */
  maxTokens?: number;
}

export interface AgentContext {
  orgId: string;
  actorUserId: string;
  targetId?: string;
  targetType?: string;
}

export interface AgentResult<T> {
  success: true;
  data: T;
  latencyMs: number;
  logId: string;
}

export interface AgentError {
  success: false;
  error: string;
  code: "EMPTY_CONTEXT" | "API_ERROR" | "PARSE_ERROR" | "TIMEOUT" | "VALIDATION_ERROR";
}

export type AgentResponse<T> = AgentResult<T> | AgentError;

// ─── Input hashing ──────────────────────────────────────────────────────────

function hashInput(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// ─── Claude API Call ────────────────────────────────────────────────────────

async function callClaudeAPI(params: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  timeoutMs: number;
}): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens,
        system: params.systemPrompt,
        messages: [{ role: "user", content: params.userMessage }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    const textBlock = result.content?.find(
      (block: { type: string }) => block.type === "text"
    );

    if (!textBlock?.text) {
      throw new Error("No text content in Claude API response");
    }

    return {
      content: textBlock.text,
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── JSON Extraction ────────────────────────────────────────────────────────

function extractJSON(text: string): string {
  // Try to find JSON in code fences first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find a JSON object or array directly
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1].trim();

  return text.trim();
}

// ─── Cost Estimation ────────────────────────────────────────────────────────

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  // Sonnet 4 pricing: $3/M input, $15/M output
  if (model.includes("sonnet")) {
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }
  // Haiku 4.5 pricing: $0.80/M input, $4/M output
  if (model.includes("haiku")) {
    return (inputTokens * 0.8 + outputTokens * 4) / 1_000_000;
  }
  // Opus fallback: $15/M input, $75/M output
  return (inputTokens * 15 + outputTokens * 75) / 1_000_000;
}

// ─── createAIAgent ──────────────────────────────────────────────────────────

export function createAIAgent<TOutput extends z.ZodType>(
  config: AgentConfig<TOutput>
) {
  const {
    agentType,
    outputSchema,
    systemPrompt,
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxTokens = 4096,
  } = config;

  /**
   * Run the agent with the given context data.
   *
   * @param userMessage - The assembled context/prompt to send to Claude
   * @param agentContext - Org, user, and target metadata for logging
   * @returns Validated output data or an error
   */
  async function run(
    userMessage: string,
    agentContext: AgentContext
  ): Promise<AgentResponse<z.infer<TOutput>>> {
    // Reject empty input
    if (!userMessage || userMessage.trim().length === 0) {
      return {
        success: false,
        error: "Context assembly returned empty data",
        code: "EMPTY_CONTEXT",
      };
    }

    const inputHash = hashInput(userMessage);
    const startTime = Date.now();
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      attempt++;
      try {
        const apiResult = await callClaudeAPI({
          model,
          systemPrompt,
          userMessage,
          maxTokens,
          timeoutMs,
        });

        const latencyMs = Date.now() - startTime;
        const jsonStr = extractJSON(apiResult.content);

        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          // Log the failed parse attempt
          const [logRow] = await db
            .insert(aiCallLog)
            .values({
              orgId: agentContext.orgId,
              agentType,
              inputHash,
              inputSummary: userMessage.slice(0, 500),
              output: { raw: apiResult.content },
              latencyMs,
              modelVersion: model,
              tokenCount:
                apiResult.inputTokens + apiResult.outputTokens,
              inputTokens: apiResult.inputTokens,
              outputTokens: apiResult.outputTokens,
              costEstimate: String(
                estimateCost(
                  apiResult.inputTokens,
                  apiResult.outputTokens,
                  model
                )
              ),
              status: "error",
              errorMessage: "Failed to parse JSON from Claude response",
              actorUserId: agentContext.actorUserId,
              targetId: agentContext.targetId,
              targetType: agentContext.targetType,
            })
            .returning({ id: aiCallLog.id });

          return {
            success: false,
            error:
              "Claude returned malformed JSON. Please try again or enter data manually.",
            code: "PARSE_ERROR",
          };
        }

        // Validate against Zod schema
        const validation = outputSchema.safeParse(parsed);

        if (!validation.success) {
          const [logRow] = await db
            .insert(aiCallLog)
            .values({
              orgId: agentContext.orgId,
              agentType,
              inputHash,
              inputSummary: userMessage.slice(0, 500),
              output: parsed as Record<string, unknown>,
              latencyMs,
              modelVersion: model,
              tokenCount:
                apiResult.inputTokens + apiResult.outputTokens,
              inputTokens: apiResult.inputTokens,
              outputTokens: apiResult.outputTokens,
              costEstimate: String(
                estimateCost(
                  apiResult.inputTokens,
                  apiResult.outputTokens,
                  model
                )
              ),
              status: "error",
              errorMessage: `Validation failed: ${validation.error.message}`,
              actorUserId: agentContext.actorUserId,
              targetId: agentContext.targetId,
              targetType: agentContext.targetType,
            })
            .returning({ id: aiCallLog.id });

          return {
            success: false,
            error:
              "AI output did not match expected format. Please try again or enter data manually.",
            code: "VALIDATION_ERROR",
          };
        }

        // Success — log the call
        const [logRow] = await db
          .insert(aiCallLog)
          .values({
            orgId: agentContext.orgId,
            agentType,
            inputHash,
            inputSummary: userMessage.slice(0, 500),
            output: validation.data as Record<string, unknown>,
            latencyMs,
            modelVersion: model,
            tokenCount:
              apiResult.inputTokens + apiResult.outputTokens,
            inputTokens: apiResult.inputTokens,
            outputTokens: apiResult.outputTokens,
            costEstimate: String(
              estimateCost(
                apiResult.inputTokens,
                apiResult.outputTokens,
                model
              )
            ),
            status: "success",
            actorUserId: agentContext.actorUserId,
            targetId: agentContext.targetId,
            targetType: agentContext.targetType,
          })
          .returning({ id: aiCallLog.id });

        return {
          success: true,
          data: validation.data,
          latencyMs,
          logId: logRow.id,
        };
      } catch (err) {
        const isTimeout =
          err instanceof Error && err.name === "AbortError";
        const isRetryable =
          isTimeout || (err instanceof Error && err.message.includes("5"));

        if (isRetryable && attempt <= MAX_RETRIES) {
          continue;
        }

        const latencyMs = Date.now() - startTime;

        // Log the error
        await db.insert(aiCallLog).values({
          orgId: agentContext.orgId,
          agentType,
          inputHash,
          inputSummary: userMessage.slice(0, 500),
          output: {},
          latencyMs,
          modelVersion: model,
          status: isTimeout ? "timeout" : "error",
          errorMessage:
            err instanceof Error ? err.message : String(err),
          actorUserId: agentContext.actorUserId,
          targetId: agentContext.targetId,
          targetType: agentContext.targetType,
        });

        if (isTimeout) {
          return {
            success: false,
            error:
              "AI request timed out. Please try again or enter data manually.",
            code: "TIMEOUT",
          };
        }

        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred",
          code: "API_ERROR",
        };
      }
    }

    // Should not reach here, but TypeScript needs it
    return {
      success: false,
      error: "Max retries exceeded",
      code: "API_ERROR",
    };
  }

  return { run, agentType, config };
}

// ─── Confidence helpers ─────────────────────────────────────────────────────

/**
 * Given a record of confidence scores (0-1), returns field names
 * that fall below the threshold (default 0.8).
 */
export function flagLowConfidenceFields(
  confidence: Record<string, number>,
  threshold = 0.8
): string[] {
  return Object.entries(confidence)
    .filter(([, score]) => score < threshold)
    .map(([field]) => field);
}
