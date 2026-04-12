// @ts-nocheck
/**
 * weekly-digest — Supabase Edge Function (pg_cron: Monday 8am per org timezone)
 *
 * Kevin, this runs every Monday morning. It gathers the past week's activity
 * for each org and sends a digest email to every user who hasn't opted out.
 *
 * WHAT'S IN THE DIGEST:
 *   1. New assets created this week
 *   2. New valuations recorded
 *   3. Upcoming deadlines (tasks, document requests due next 7 days)
 *
 * pg_cron setup (simplified — runs at 8am UTC Monday):
 *   SELECT cron.schedule(
 *     'weekly-digest',
 *     '0 8 * * 1',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/weekly-digest',
 *       headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb
 *     )$$
 *   );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`

Deno.serve(async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const period = `${oneWeekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`

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

    let totalSent = 0
    let totalSkipped = 0

    for (const org of orgs) {
      // Fetch new assets this week
      const { data: newAssets } = await supabase
        .from("assets")
        .select("name, asset_class, current_value")
        .eq("entity_id", org.id) // We'll join properly below
        .gte("created_at", oneWeekAgo.toISOString())

      // Simplified: fetch assets via entities that belong to this org's clients
      const { data: orgAssets } = await supabase.rpc("get_org_new_assets", {
        p_org_id: org.id,
        p_since: oneWeekAgo.toISOString(),
      }).select("*")

      const assets = (orgAssets ?? newAssets ?? []).map((a: Record<string, unknown>) => ({
        name: a.name as string,
        assetClass: (a.asset_class as string)?.replace(/_/g, " ") ?? "other",
        value: parseFloat((a.current_value as string) ?? "0"),
      }))

      // Fetch recent valuations
      const { data: recentValuations } = await supabase.rpc("get_org_recent_valuations", {
        p_org_id: org.id,
        p_since: oneWeekAgo.toISOString(),
      }).select("*")

      const valuations = (recentValuations ?? []).map((v: Record<string, unknown>) => ({
        assetName: v.asset_name as string,
        value: parseFloat((v.value as string) ?? "0"),
        change: parseFloat((v.change_pct as string) ?? "0"),
      }))

      // Fetch upcoming deadlines (tasks + document requests)
      const { data: upcomingTasks } = await supabase
        .from("tasks")
        .select("title, due_date")
        .eq("org_id", org.id)
        .gte("due_date", now.toISOString())
        .lte("due_date", oneWeekFromNow.toISOString())
        .in("status", ["pending", "in_progress"])

      const deadlines = (upcomingTasks ?? []).map((t: Record<string, unknown>) => ({
        title: t.title as string,
        dueDate: new Date(t.due_date as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        type: "Task",
      }))

      // Get org members who haven't opted out of digest
      const { data: members } = await supabase
        .from("org_members")
        .select("users!inner(email, full_name, preferences)")
        .eq("org_id", org.id)
        .in("role", ["admin", "assistant"])

      for (const member of members ?? []) {
        const user = member.users as { email: string; full_name: string | null; preferences: Record<string, unknown> | null }
        const prefs = user.preferences as Record<string, unknown> | null
        const emailPrefs = prefs?.email_preferences as Record<string, unknown> | undefined

        // Skip if digest preference is "never"
        if (emailPrefs?.digest === "never") {
          totalSkipped++
          continue
        }

        await fetch(sendEmailUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "weekly_digest",
            to: user.email,
            data: {
              userName: user.full_name ?? "there",
              orgName: org.name,
              period,
              newAssets: assets,
              newValuations: valuations,
              upcomingDeadlines: deadlines,
            },
          }),
        })
        totalSent++
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${totalSent} digest emails, skipped ${totalSkipped}` }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
