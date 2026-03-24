/**
 * ai-narrative — Supabase Edge Function
 *
 * Generates professional narrative summaries for reports.
 * Receives pre-assembled context (KPIs, allocations, events)
 * from the Next.js app and returns a polished 2-3 paragraph summary.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const MODEL = "claude-sonnet-4-20250514"

const SYSTEM_PROMPT = `You are a professional report writer for Lacoda Capital, a wealth management platform.
Your job is to write concise, professional narrative summaries for portfolio reports.

You MUST return valid JSON with exactly this structure:
{
  "summary": "2-3 paragraph professional narrative...",
  "key_highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "generated_by": "ai"
}

Rules:
- Write in a professional, confident tone suitable for high-net-worth clients.
- Reference ACTUAL numbers from the provided data — never hallucinate figures.
- Include specific dollar amounts, percentages, and asset names.
- The summary should be 2-3 paragraphs covering: portfolio overview, performance, and notable changes.
- Key highlights should be 3-5 bullet-point-style strings.
- Return ONLY the JSON object, no extra text.`

interface NarrativeRequest {
  reportId: string
  orgId: string
  actorUserId: string
  contextPrompt: string
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const startTime = Date.now()

  try {
    const body: NarrativeRequest = await req.json()
    const { reportId, orgId, actorUserId, contextPrompt } = body

    if (!contextPrompt || !orgId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Call Claude API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    let apiResponse: Response
    try {
      apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: contextPrompt }],
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text()
      throw new Error(`Claude API ${apiResponse.status}: ${errorBody}`)
    }

    const result = await apiResponse.json()
    const latencyMs = Date.now() - startTime
    const textBlock = result.content?.find((b: { type: string }) => b.type === "text")

    if (!textBlock?.text) {
      throw new Error("No text content in Claude response")
    }

    const jsonMatch = textBlock.text.match(/(\{[\s\S]*\})/)
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response")
    }

    const narrative = JSON.parse(jsonMatch[1])

    // Log to ai_call_log
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const inputHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(contextPrompt)
    )
    const hashHex = Array.from(new Uint8Array(inputHash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")

    await supabase.from("ai_call_log").insert({
      org_id: orgId,
      agent_type: "narrative",
      input_hash: hashHex,
      input_summary: contextPrompt.slice(0, 500),
      output: narrative,
      latency_ms: latencyMs,
      model_version: MODEL,
      token_count: (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0),
      input_tokens: result.usage?.input_tokens ?? 0,
      output_tokens: result.usage?.output_tokens ?? 0,
      cost_estimate: ((result.usage?.input_tokens ?? 0) * 3 + (result.usage?.output_tokens ?? 0) * 15) / 1_000_000,
      status: "success",
      actor_user_id: actorUserId,
      target_id: reportId,
      target_type: "report",
    })

    return new Response(
      JSON.stringify({ success: true, data: narrative, latencyMs }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    const latencyMs = Date.now() - startTime
    const isTimeout = err instanceof Error && err.name === "AbortError"

    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout
          ? "AI request timed out. Please try again."
          : err instanceof Error ? err.message : String(err),
        code: isTimeout ? "TIMEOUT" : "API_ERROR",
        latencyMs,
      }),
      { status: isTimeout ? 504 : 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
