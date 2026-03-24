/**
 * sync-balances — Supabase Edge Function
 *
 * Daily pg_cron Edge Function that refreshes all connected Plaid balances.
 * For each connected Plaid integration:
 *   1. Retrieve access_token from Supabase Vault
 *   2. Call Plaid /accounts/balance/get
 *   3. Create new valuation rows for each account
 *   4. Update asset.current_value
 *   5. Update integration sync metadata
 *
 * Can also be triggered manually for a single integration.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID")!
const PLAID_SECRET = Deno.env.get("PLAID_SECRET")!
const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox"

const PLAID_BASE_URL: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {}
    const { integrationId, mode = "scheduled" } = body

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // ── 1. Get all connected Plaid integrations (or a specific one) ────────
    let query = supabase
      .from("integrations")
      .select("*")
      .eq("provider", "plaid")
      .eq("status", "connected")

    if (integrationId) {
      query = query.eq("id", integrationId)
    }

    const { data: integrations, error: fetchError } = await query

    if (fetchError) {
      console.error("Failed to fetch integrations:", fetchError)
      return new Response(
        JSON.stringify({ error: "Failed to fetch integrations" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No connected Plaid integrations to sync", synced: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const results: Array<{
      integrationId: string
      status: string
      accountsSynced: number
      error?: string
    }> = []

    for (const integration of integrations) {
      try {
        // ── 2. Retrieve access_token from Vault ────────────────────────────
        if (!integration.vault_secret_id) {
          results.push({
            integrationId: integration.id,
            status: "skipped",
            accountsSynced: 0,
            error: "No vault secret ID",
          })
          continue
        }

        const { data: vaultSecret, error: vaultError } = await supabase.rpc(
          "vault_read_secret",
          { secret_id: integration.vault_secret_id }
        )

        if (vaultError || !vaultSecret) {
          console.error(`Vault read error for ${integration.id}:`, vaultError)

          await supabase
            .from("integrations")
            .update({
              status: "error",
              status_message: "Failed to read credentials. Please reconnect.",
              last_sync_status: "failed",
              sync_error_message: "Vault secret read failed",
              last_sync_at: new Date().toISOString(),
            })
            .eq("id", integration.id)

          results.push({
            integrationId: integration.id,
            status: "failed",
            accountsSynced: 0,
            error: "Vault read failed",
          })
          continue
        }

        const credentials = typeof vaultSecret === "string"
          ? JSON.parse(vaultSecret)
          : vaultSecret
        const accessToken = credentials.access_token

        if (!accessToken) {
          results.push({
            integrationId: integration.id,
            status: "failed",
            accountsSynced: 0,
            error: "No access_token in vault secret",
          })
          continue
        }

        // ── 3. Call Plaid /accounts/balance/get ────────────────────────────
        const balanceRes = await fetch(
          `${PLAID_BASE_URL[PLAID_ENV]}/accounts/balance/get`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: PLAID_CLIENT_ID,
              secret: PLAID_SECRET,
              access_token: accessToken,
            }),
          }
        )

        if (!balanceRes.ok) {
          const err = await balanceRes.json()
          const errorCode = err.error_code

          // Handle ITEM_LOGIN_REQUIRED — mark disconnected, notify user
          if (errorCode === "ITEM_LOGIN_REQUIRED") {
            await supabase
              .from("integrations")
              .update({
                status: "disconnected",
                status_message: "Bank requires re-authentication. Please reconnect via Plaid Link.",
                last_sync_status: "failed",
                sync_error_message: `ITEM_LOGIN_REQUIRED: ${err.error_message}`,
                last_sync_at: new Date().toISOString(),
              })
              .eq("id", integration.id)

            results.push({
              integrationId: integration.id,
              status: "disconnected",
              accountsSynced: 0,
              error: "ITEM_LOGIN_REQUIRED",
            })
            continue
          }

          // Handle rate limiting — respect Retry-After
          if (balanceRes.status === 429) {
            const retryAfter = balanceRes.headers.get("Retry-After")
            await supabase
              .from("integrations")
              .update({
                last_sync_status: "failed",
                sync_error_message: `Rate limited. Retry after: ${retryAfter ?? "unknown"}`,
                last_sync_at: new Date().toISOString(),
              })
              .eq("id", integration.id)

            results.push({
              integrationId: integration.id,
              status: "rate_limited",
              accountsSynced: 0,
              error: `Rate limited, retry after ${retryAfter}`,
            })
            continue
          }

          // Generic error
          await supabase
            .from("integrations")
            .update({
              status: "error",
              status_message: err.error_message ?? "Balance sync failed",
              last_sync_status: "failed",
              sync_error_message: JSON.stringify(err),
              last_sync_at: new Date().toISOString(),
            })
            .eq("id", integration.id)

          results.push({
            integrationId: integration.id,
            status: "failed",
            accountsSynced: 0,
            error: err.error_message,
          })
          continue
        }

        const balanceData = await balanceRes.json()
        let accountsSynced = 0

        // ── 4. Update each account's asset and create valuation ────────────
        for (const account of balanceData.accounts ?? []) {
          const balance = account.balances?.current ?? account.balances?.available ?? 0
          const currency = account.balances?.iso_currency_code ?? "USD"

          // Find existing asset by external_id (plaid account_id)
          const { data: existingAsset } = await supabase
            .from("assets")
            .select("id")
            .eq("external_id", account.account_id)
            .maybeSingle()

          if (existingAsset) {
            // Update current_value on the asset
            await supabase
              .from("assets")
              .update({
                current_value: balance.toString(),
                valued_at: new Date().toISOString(),
              })
              .eq("id", existingAsset.id)

            // Create new valuation row
            await supabase.from("valuations").insert({
              asset_id: existingAsset.id,
              as_of_date: new Date().toISOString(),
              value: balance.toString(),
              currency,
              source: "api_feed",
              notes: `Daily balance sync from Plaid (${mode})`,
            })

            accountsSynced++
          }
        }

        // ── 5. Update integration sync metadata ───────────────────────────
        const existingHistory = (integration.sync_history as unknown[]) ?? []
        const newEntry = {
          timestamp: new Date().toISOString(),
          status: "success",
          accountsSynced,
          mode,
        }

        // Keep last 30 sync history entries
        const updatedHistory = [newEntry, ...existingHistory].slice(0, 30)

        await supabase
          .from("integrations")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: "success",
            sync_error_message: null,
            sync_history: updatedHistory,
          })
          .eq("id", integration.id)

        results.push({
          integrationId: integration.id,
          status: "success",
          accountsSynced,
        })
      } catch (err) {
        console.error(`Sync error for integration ${integration.id}:`, err)
        results.push({
          integrationId: integration.id,
          status: "failed",
          accountsSynced: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    return new Response(
      JSON.stringify({
        synced: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "failed").length,
        results,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (error) {
    console.error("sync-balances error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
