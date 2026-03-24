/**
 * smart-alert-digest — Supabase Edge Function (pg_cron: weekly)
 *
 * Queries all upcoming deadlines, expiring documents, stale valuations,
 * past-due requests, and compliance deadlines. Claude prioritizes by
 * urgency weighted by asset value + days remaining. Sends HTML email
 * via Resend and creates top-5 in-app notifications.
 *
 * pg_cron setup:
 *   SELECT cron.schedule(
 *     'smart-alert-digest',
 *     '0 8 * * 1',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/smart-alert-digest',
 *       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *     )$$
 *   );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`
const MODEL = "claude-sonnet-4-20250514"

const SYSTEM_PROMPT = `You are an alert prioritization agent for Lacoda Capital, a wealth management platform.
Analyze the provided list of upcoming deadlines, expirations, and compliance items, then prioritize them by urgency.

Return valid JSON:
{
  "alerts": [
    {
      "title": "Short alert title",
      "description": "One-sentence description",
      "urgency_score": 0-10,
      "category": "expiring_document" | "stale_valuation" | "past_due_request" | "compliance_deadline" | "insurance_expiry",
      "action_url": "/app/vault/doc-id" or null,
      "asset_value": number or null,
      "days_remaining": integer or null
    }
  ],
  "executive_summary": "1-2 sentence summary of most critical items",
  "total_items": number,
  "critical_count": number
}

Urgency scoring: 0 days=10, 1-3=9, 4-7=8, 8-14=6, 15-30=4, >30=2. Adjust up for high value (>$1M +1, >$10M +2), compliance (+1), overdue (9-10). Sort descending. Return ONLY JSON.`

Deno.serve(async () => {
  const startTime = Date.now()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Get all orgs
    const { data: orgs, error: orgsError } = await supabase
      .from("orgs")
      .select("id, name")
    if (orgsError) throw orgsError
    if (!orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ message: "No orgs" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    let totalEmails = 0
    let totalNotifications = 0

    for (const org of orgs) {
      const items: Array<{
        type: string
        title: string
        description: string
        daysRemaining: number | null
        assetValue: number | null
        assetName?: string
        clientName?: string
        actionUrl?: string
      }> = []

      // 1. Expiring documents (within 30 days)
      const { data: expiringDocs } = await supabase
        .from("documents")
        .select("id, name, expires_at, asset_id")
        .eq("org_id", org.id)
        .not("expires_at", "is", null)
        .gte("expires_at", now.toISOString())
        .lte("expires_at", thirtyDaysFromNow.toISOString())
        .is("deleted_at", null)

      for (const doc of expiringDocs ?? []) {
        const daysRemaining = Math.ceil(
          (new Date(doc.expires_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
        items.push({
          type: "expiring_document",
          title: `Document "${doc.name}" expiring`,
          description: `Expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
          daysRemaining,
          assetValue: null,
          actionUrl: `/app/vault/${doc.id}`,
        })
      }

      // 2. Already-expired documents
      const { data: expiredDocs } = await supabase
        .from("documents")
        .select("id, name, expires_at")
        .eq("org_id", org.id)
        .not("expires_at", "is", null)
        .lt("expires_at", now.toISOString())
        .eq("status", "expired")
        .is("deleted_at", null)
        .limit(20)

      for (const doc of expiredDocs ?? []) {
        const daysOverdue = Math.ceil(
          (now.getTime() - new Date(doc.expires_at).getTime()) / (24 * 60 * 60 * 1000)
        )
        items.push({
          type: "expiring_document",
          title: `Document "${doc.name}" EXPIRED`,
          description: `Expired ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago`,
          daysRemaining: -daysOverdue,
          assetValue: null,
          actionUrl: `/app/vault/${doc.id}`,
        })
      }

      // 3. Stale valuations (assets not valued in 90+ days)
      const { data: staleAssets } = await supabase.rpc("get_stale_valuations", {
        p_org_id: org.id,
        p_stale_days: 90,
      }).select("*")

      for (const asset of staleAssets ?? []) {
        const daysSinceValuation = Math.ceil(
          (now.getTime() - new Date(asset.last_valued_at ?? ninetyDaysAgo).getTime()) / (24 * 60 * 60 * 1000)
        )
        items.push({
          type: "stale_valuation",
          title: `Stale valuation: ${asset.name}`,
          description: `Last valued ${daysSinceValuation} days ago`,
          daysRemaining: null,
          assetValue: parseFloat(asset.current_value ?? "0"),
          assetName: asset.name,
          actionUrl: `/app/assets/${asset.id}`,
        })
      }

      // 4. Past-due document requests
      const { data: pastDueRequests } = await supabase
        .from("document_requests")
        .select("id, title, due_date")
        .eq("org_id", org.id)
        .in("status", ["pending", "sent"])
        .not("due_date", "is", null)
        .lt("due_date", now.toISOString())
        .limit(20)

      for (const req of pastDueRequests ?? []) {
        const daysOverdue = Math.ceil(
          (now.getTime() - new Date(req.due_date).getTime()) / (24 * 60 * 60 * 1000)
        )
        items.push({
          type: "past_due_request",
          title: `Past-due request: ${req.title}`,
          description: `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} past deadline`,
          daysRemaining: -daysOverdue,
          assetValue: null,
          actionUrl: `/app/requests/${req.id}`,
        })
      }

      // 5. Upcoming compliance deadlines
      const { data: complianceItems } = await supabase
        .from("compliance_controls")
        .select("id, name, due_date, metadata")
        .eq("org_id", org.id)
        .in("status", ["not_started", "in_progress"])
        .not("due_date", "is", null)
        .lte("due_date", thirtyDaysFromNow.toISOString())

      for (const item of complianceItems ?? []) {
        const daysRemaining = Math.ceil(
          (new Date(item.due_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
        items.push({
          type: "compliance_deadline",
          title: `Compliance: ${item.name}`,
          description: daysRemaining < 0
            ? `${Math.abs(daysRemaining)} days overdue`
            : `Due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
          daysRemaining,
          assetValue: null,
          actionUrl: `/app/compliance/${item.id}`,
        })
      }

      // 6. Expiring insurance policies
      const { data: expiringPolicies } = await supabase
        .from("insurance_policies")
        .select("id, policy_name, expiry_date, coverage_amount, asset_id")
        .eq("org_id", org.id)
        .in("status", ["active", "expiring"])
        .not("expiry_date", "is", null)
        .lte("expiry_date", thirtyDaysFromNow.toISOString())

      for (const policy of expiringPolicies ?? []) {
        const daysRemaining = Math.ceil(
          (new Date(policy.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
        items.push({
          type: "insurance_expiry",
          title: `Insurance expiring: ${policy.policy_name}`,
          description: daysRemaining < 0
            ? `Expired ${Math.abs(daysRemaining)} days ago`
            : `Expires in ${daysRemaining} days`,
          daysRemaining,
          assetValue: parseFloat(policy.coverage_amount ?? "0"),
          actionUrl: `/app/insurance/${policy.id}`,
        })
      }

      // Skip if no items
      if (items.length === 0) {
        continue
      }

      // Build prompt for Claude
      const promptLines = [
        `Organization: ${org.name}`,
        `Total items to prioritize: ${items.length}`,
        ``,
        `=== ITEMS ===`,
      ]
      for (const item of items) {
        promptLines.push(`---`)
        promptLines.push(`Type: ${item.type}`)
        promptLines.push(`Title: ${item.title}`)
        promptLines.push(`Description: ${item.description}`)
        if (item.daysRemaining !== null) promptLines.push(`Days Remaining: ${item.daysRemaining}`)
        if (item.assetValue !== null) promptLines.push(`Asset Value: $${item.assetValue.toLocaleString("en-US")}`)
        if (item.assetName) promptLines.push(`Asset: ${item.assetName}`)
        if (item.actionUrl) promptLines.push(`Action URL: ${item.actionUrl}`)
      }

      const contextPrompt = promptLines.join("\n")

      // Call Claude to prioritize
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
        console.error(`Claude API error for org ${org.id}: ${apiResponse.status}`)
        continue
      }

      const result = await apiResponse.json()
      const latencyMs = Date.now() - startTime
      const textBlock = result.content?.find((b: { type: string }) => b.type === "text")

      if (!textBlock?.text) continue

      const jsonMatch = textBlock.text.match(/(\{[\s\S]*\})/)
      if (!jsonMatch) continue

      const digest = JSON.parse(jsonMatch[1])
      const alerts = digest.alerts ?? []

      // Log to ai_call_log
      const inputHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(contextPrompt)
      )
      const hashHex = Array.from(new Uint8Array(inputHash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")

      await supabase.from("ai_call_log").insert({
        org_id: org.id,
        agent_type: "alert_digest",
        input_hash: hashHex,
        input_summary: `${items.length} items for ${org.name}`,
        output: digest,
        latency_ms: latencyMs,
        model_version: MODEL,
        token_count: (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0),
        input_tokens: result.usage?.input_tokens ?? 0,
        output_tokens: result.usage?.output_tokens ?? 0,
        cost_estimate: ((result.usage?.input_tokens ?? 0) * 3 + (result.usage?.output_tokens ?? 0) * 15) / 1_000_000,
        status: "success",
        target_type: "digest",
      })

      // Build HTML email for top 10 alerts
      const topAlerts = alerts.slice(0, 10)
      const emailAlertRows = topAlerts
        .map((a: Record<string, unknown>) => {
          const urgency = a.urgency_score as number
          const color = urgency >= 8 ? "#ef4444" : urgency >= 6 ? "#f59e0b" : "#22d3ee"
          return `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #27272a;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></span>
                <strong style="color: #f4f4f5;">${a.title}</strong>
                <br><span style="color: #a1a1aa; font-size: 13px;">${a.description}</span>
              </td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; text-align: right; white-space: nowrap;">
                <span style="color: ${color}; font-weight: 600; font-size: 14px;">
                  ${urgency}/10
                </span>
              </td>
            </tr>`
        })
        .join("")

      // Get org admins/assistants to send to
      const { data: members } = await supabase
        .from("org_members")
        .select("users!inner(id, email, full_name, preferences)")
        .eq("org_id", org.id)
        .in("role", ["admin", "assistant"])

      for (const member of members ?? []) {
        const user = member.users as { id: string; email: string; full_name: string | null; preferences: Record<string, unknown> | null }

        // Send email via send-email Edge Function
        await fetch(SEND_EMAIL_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "smart_alert_digest",
            to: user.email,
            data: {
              userName: user.full_name ?? "there",
              orgName: org.name,
              executiveSummary: digest.executive_summary,
              criticalCount: digest.critical_count,
              totalItems: digest.total_items,
              alertRows: emailAlertRows,
            },
          }),
        })
        totalEmails++

        // Create top-5 in-app notifications
        const top5 = alerts.slice(0, 5)
        for (const alert of top5) {
          await supabase.from("notifications").insert({
            user_id: user.id,
            org_id: org.id,
            type: "compliance_alert",
            title: alert.title,
            message: alert.description,
            payload: {
              urgency_score: alert.urgency_score,
              category: alert.category,
              href: alert.action_url,
              source: "ai_digest",
            },
          })
          totalNotifications++
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Smart digest complete: ${totalEmails} emails, ${totalNotifications} notifications`,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Smart alert digest error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
