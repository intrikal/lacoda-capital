/**
 * check-expirations — Supabase Edge Function (pg_cron: daily)
 *
 * Kevin, this runs ONCE per day via pg_cron. It checks for documents
 * that are expiring in 7 days, 1 day, or already expired, then calls
 * the send-email Edge Function to notify the relevant users.
 *
 * KEY BEHAVIOR:
 *   - Groups all expiring docs by user → sends ONE summary email per user
 *     (not 100 individual emails for an org with 100 expiring docs)
 *   - Respects email_preferences.expirationReminders on the users table
 *   - Only processes documents that haven't been deleted (deleted_at IS NULL)
 *
 * pg_cron setup in Supabase dashboard:
 *   SELECT cron.schedule(
 *     'check-document-expirations',
 *     '0 8 * * *',  -- every day at 8am UTC
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/check-expirations',
 *       headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb
 *     )$$
 *   );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`
const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL")

/** Inline alert dispatch for critical expirations. */
async function dispatchExpirationAlert(alert: {
  title: string; description: string; orgId?: string
}) {
  if (!DISCORD_WEBHOOK_URL) return
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: alert.title,
          description: alert.description,
          color: 0xef4444,
          fields: [
            { name: "Severity", value: "CRITICAL", inline: true },
            { name: "Source", value: "check-expirations", inline: true },
          ],
          footer: { text: "Lacoda Capital Alerts" },
          timestamp: new Date().toISOString(),
        }],
      }),
    })
  } catch (e) { console.error("[check-expirations] Discord alert failed:", e) }

  // Also send email alert
  const recipients = (Deno.env.get("ALERT_EMAIL_RECIPIENTS") ?? "").split(",").map(e => e.trim()).filter(Boolean)
  for (const to of recipients) {
    try {
      await fetch(sendEmailUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "operational_alert",
          to,
          data: { title: alert.title, description: alert.description, severity: "critical", source: "check-expirations" },
        }),
      })
    } catch (e) { console.error("[check-expirations] Email alert failed:", e) }
  }
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Find documents expiring within 7 days or already expired (within last 24h)
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)

    const { data: expiringDocs, error: docsError } = await supabase
      .from("documents")
      .select(`
        id, name, expires_at, asset_id, client_id, org_id,
        assets!inner(name)
      `)
      .gte("expires_at", yesterday.toISOString())
      .lte("expires_at", in7Days.toISOString())
      .is("deleted_at", null)

    if (docsError) throw docsError
    if (!expiringDocs || expiringDocs.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring documents found" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get org members with their user preferences (to check email_preferences)
    const orgIds = [...new Set(expiringDocs.map((d: Record<string, unknown>) => d.org_id))]

    const { data: members, error: membersError } = await supabase
      .from("org_members")
      .select(`
        user_id, org_id, role,
        users!inner(email, full_name, preferences)
      `)
      .in("org_id", orgIds)
      .in("role", ["admin", "assistant"])

    if (membersError) throw membersError
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ message: "No eligible recipients" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get org names
    const { data: orgs } = await supabase
      .from("orgs")
      .select("id, name")
      .in("id", orgIds)

    const orgNameMap = new Map((orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name]))

    // Group docs by org, then group recipients by org
    const docsByOrg = new Map<string, typeof expiringDocs>()
    for (const doc of expiringDocs) {
      const orgId = doc.org_id as string
      if (!docsByOrg.has(orgId)) docsByOrg.set(orgId, [])
      docsByOrg.get(orgId)!.push(doc)
    }

    let emailsSent = 0
    let skipped = 0

    for (const [orgId, docs] of docsByOrg) {
      const orgMembers = members.filter((m: Record<string, unknown>) => m.org_id === orgId)
      const orgName = orgNameMap.get(orgId) ?? "Your organization"

      for (const member of orgMembers) {
        const user = member.users as { email: string; full_name: string | null; preferences: Record<string, unknown> | null }
        const prefs = user.preferences as Record<string, unknown> | null
        const emailPrefs = prefs?.email_preferences as Record<string, unknown> | undefined

        // Respect opt-out
        if (emailPrefs?.expirationReminders === false) {
          skipped++
          continue
        }

        const documents = docs.map((d: Record<string, unknown>) => {
          const expiresAt = new Date(d.expires_at as string)
          const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          return {
            name: d.name,
            assetName: (d.assets as { name: string })?.name ?? "Unknown",
            expiresAt: expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            daysUntilExpiry,
          }
        })

        // Send ONE summary email per user
        await fetch(sendEmailUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "expiration_reminder",
            to: user.email,
            data: {
              userName: user.full_name ?? "there",
              documents,
              orgName,
            },
          }),
        })
        emailsSent++
      }
    }

    // Dispatch critical alerts for documents expiring today or tomorrow
    const urgentDocs = expiringDocs.filter((d: Record<string, unknown>) => {
      const expiresAt = new Date(d.expires_at as string)
      const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      return daysUntil <= 1
    })

    if (urgentDocs.length > 0) {
      const orgIds = [...new Set(urgentDocs.map((d: Record<string, unknown>) => d.org_id as string))]
      for (const orgId of orgIds) {
        const orgDocs = urgentDocs.filter((d: Record<string, unknown>) => d.org_id === orgId)
        await dispatchExpirationAlert({
          title: `${orgDocs.length} document${orgDocs.length === 1 ? "" : "s"} expiring imminently`,
          description: orgDocs.map((d: Record<string, unknown>) => d.name).join(", "),
          orgId,
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${expiringDocs.length} expiring docs. Sent ${emailsSent} emails, skipped ${skipped}.`,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
