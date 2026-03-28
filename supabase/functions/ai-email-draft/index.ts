/**
 * ai-email-draft — Supabase Edge Function
 *
 * Generates professional email drafts for document requests.
 * Receives context (doc type, contact, deadline, upload URL)
 * and returns a ready-to-send email subject + body.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const MODEL = "claude-sonnet-4-20250514"

const SYSTEM_PROMPT = `You are a professional email drafting assistant for Lacoda Capital, a wealth management platform.
Your job is to draft professional emails requesting documents from clients, CPAs, attorneys, or other third parties.

You MUST return valid JSON with exactly this structure:
{
  "subject": "Email subject line",
  "body": "Full email body as plain text with line breaks",
  "tone": "formal" | "friendly" | "urgent"
}

Rules:
- Write in a professional, polite tone appropriate for wealth management communications.
- Include the specific document type, deadline date, and upload URL/link if provided.
- Include the contact's name in the greeting.
- Keep the email concise — 3-5 paragraphs maximum.
- Include a professional sign-off.
- Do NOT include placeholder brackets — use actual provided values.
- If the deadline is soon (< 7 days), use "urgent" tone.
- The body should use \\n for line breaks.
- Return ONLY the JSON object, no extra text.`

interface EmailDraftRequest {
  requestId: string
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
    const body: EmailDraftRequest = await req.json()
    const { requestId, orgId, actorUserId, contextPrompt } = body

    if (!contextPrompt || !orgId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

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
          max_tokens: 2048,
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

    const draft = JSON.parse(jsonMatch[1])

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
      agent_type: "email_draft",
      input_hash: hashHex,
      input_summary: contextPrompt.slice(0, 500),
      output: draft,
      latency_ms: latencyMs,
      model_version: MODEL,
      token_count: (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0),
      input_tokens: result.usage?.input_tokens ?? 0,
      output_tokens: result.usage?.output_tokens ?? 0,
      cost_estimate: ((result.usage?.input_tokens ?? 0) * 3 + (result.usage?.output_tokens ?? 0) * 15) / 1_000_000,
      status: "success",
      actor_user_id: actorUserId,
      target_id: requestId,
      target_type: "document_request",
    })

    return new Response(
      JSON.stringify({ success: true, data: draft, latencyMs }),
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
