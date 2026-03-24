/**
 * ai-extract — Supabase Edge Function
 *
 * Reads a document from Storage, sends content to Claude API for structured
 * data extraction. Returns extracted fields with confidence scores.
 *
 * Called from the Next.js app when a user clicks "Extract Data" on a vault document.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const MODEL = "claude-sonnet-4-20250514"

const SYSTEM_PROMPT = `You are a document data extraction agent for a wealth management platform (Lacoda Capital).
Your job is to extract structured data from uploaded documents (appraisals, tax returns, insurance policies, bank statements, property deeds, etc.).

You MUST return valid JSON with exactly this structure:
{
  "property_address": string | null,
  "valuation_amount": number | null,
  "valuation_date": string | null,
  "appraiser_name": string | null,
  "document_type": string | null,
  "asset_name": string | null,
  "asset_class": string | null,
  "confidence": {
    "property_address": 0.0-1.0,
    "valuation_amount": 0.0-1.0,
    "valuation_date": 0.0-1.0,
    "appraiser_name": 0.0-1.0,
    "document_type": 0.0-1.0,
    "asset_name": 0.0-1.0,
    "asset_class": 0.0-1.0
  }
}

Rules:
- Set fields to null if the information is not found. Set confidence to 0 for null fields.
- Confidence 1.0 = explicitly stated. 0.5-0.8 = inferred. < 0.5 = very uncertain.
- For valuation_amount, extract the primary/total value.
- Return ONLY the JSON object, no extra text.`

interface ExtractRequest {
  documentId: string
  storagePath: string
  documentName: string
  mimeType?: string
  orgId: string
  actorUserId: string
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const startTime = Date.now()

  try {
    const body: ExtractRequest = await req.json()
    const { documentId, storagePath, documentName, mimeType, orgId, actorUserId } = body

    if (!storagePath || !orgId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Download the file from Supabase Storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath)

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: `Failed to download: ${downloadError?.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const fileContent = await fileData.text()
    const userMessage = [
      `Document Name: ${documentName}`,
      `MIME Type: ${mimeType ?? "unknown"}`,
      ``,
      `=== DOCUMENT CONTENT ===`,
      fileContent.slice(0, 50_000),
    ].join("\n")

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
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
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

    // Parse JSON from response
    const jsonMatch = textBlock.text.match(/(\{[\s\S]*\})/)
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response")
    }

    const extracted = JSON.parse(jsonMatch[1])

    // Log to ai_call_log
    const inputHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(userMessage)
    )
    const hashHex = Array.from(new Uint8Array(inputHash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")

    await supabase.from("ai_call_log").insert({
      org_id: orgId,
      agent_type: "extraction",
      input_hash: hashHex,
      input_summary: userMessage.slice(0, 500),
      output: extracted,
      latency_ms: latencyMs,
      model_version: MODEL,
      token_count: (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0),
      input_tokens: result.usage?.input_tokens ?? 0,
      output_tokens: result.usage?.output_tokens ?? 0,
      cost_estimate: ((result.usage?.input_tokens ?? 0) * 3 + (result.usage?.output_tokens ?? 0) * 15) / 1_000_000,
      status: "success",
      actor_user_id: actorUserId,
      target_id: documentId,
      target_type: "document",
    })

    return new Response(
      JSON.stringify({ success: true, data: extracted, latencyMs }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    const latencyMs = Date.now() - startTime
    const isTimeout = err instanceof Error && err.name === "AbortError"

    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout
          ? "AI request timed out. Please try again or enter data manually."
          : err instanceof Error ? err.message : String(err),
        code: isTimeout ? "TIMEOUT" : "API_ERROR",
        latencyMs,
      }),
      { status: isTimeout ? 504 : 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
