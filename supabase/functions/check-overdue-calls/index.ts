/**
 * check-overdue-calls — Supabase Edge Function (pg_cron: daily 8am)
 *
 * Checks for pending capital calls past their due_date and marks them overdue.
 * Creates in-app notifications for affected org members.
 *
 * pg_cron setup:
 *   SELECT cron.schedule(
 *     'check-overdue-calls',
 *     '0 8 * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/check-overdue-calls',
 *       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *     )$$
 *   );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const now = new Date().toISOString()

    // Find all pending capital calls with due_date in the past
    const { data: overdueCalls, error: fetchError } = await supabase
      .from("capital_events")
      .select("id, asset_id, org_id, amount, currency, due_date, event_type")
      .eq("event_type", "capital_call")
      .eq("status", "pending")
      .lt("due_date", now)
      .is("deleted_at", null)

    if (fetchError) throw fetchError

    if (!overdueCalls || overdueCalls.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue calls found" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    let updatedCount = 0
    let notificationCount = 0

    for (const call of overdueCalls) {
      // Mark as overdue
      const { error: updateError } = await supabase
        .from("capital_events")
        .update({ status: "overdue", updated_at: now })
        .eq("id", call.id)

      if (updateError) {
        console.error(`Failed to update call ${call.id}:`, updateError)
        continue
      }
      updatedCount++

      // Get asset name for notification
      const { data: asset } = await supabase
        .from("assets")
        .select("name")
        .eq("id", call.asset_id)
        .single()

      const assetName = asset?.name ?? "Unknown Asset"
      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(call.due_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: call.currency || "USD",
      }).format(parseFloat(call.amount))

      // Get org members to notify (admins + assistants)
      const { data: members } = await supabase
        .from("org_members")
        .select("users!inner(id)")
        .eq("org_id", call.org_id)
        .in("role", ["admin", "assistant"])

      for (const member of members ?? []) {
        const userId = (member.users as { id: string }).id

        await supabase.from("notifications").insert({
          user_id: userId,
          org_id: call.org_id,
          type: "capital_call_overdue",
          title: `Capital call overdue: ${assetName}`,
          message: `${formattedAmount} capital call is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} past due`,
          payload: {
            capitalEventId: call.id,
            assetId: call.asset_id,
            amount: call.amount,
            dueDate: call.due_date,
            href: `/app/assets?selected=${call.asset_id}`,
          },
        })
        notificationCount++
      }
    }

    return new Response(
      JSON.stringify({
        message: `Marked ${updatedCount} calls overdue, created ${notificationCount} notifications`,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("check-overdue-calls error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
