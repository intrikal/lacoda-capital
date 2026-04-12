// @ts-nocheck
/**
 * plaid-exchange-token — Supabase Edge Function
 *
 * After Plaid Link success, exchanges the public_token for an access_token,
 * pulls initial balances via /accounts/balance/get, creates or updates
 * cash/banking assets with values as valuations (source='api_feed'),
 * and stores the access_token encrypted via Supabase Vault.
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

/** Maps Plaid account types to our asset_class enum values */
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  depository: "cash",
  checking: "cash",
  savings: "cash",
  investment: "equities",
  brokerage: "equities",
  credit: "cash",
  loan: "cash",
  other: "other",
}

function mapAccountType(type: string, subtype?: string | null): string {
  if (subtype && ACCOUNT_TYPE_MAP[subtype]) return ACCOUNT_TYPE_MAP[subtype]
  return ACCOUNT_TYPE_MAP[type] ?? "other"
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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const { publicToken, orgId, entityId, institutionName, institutionId, accounts } = body

    if (!publicToken || !orgId || !entityId) {
      return new Response(
        JSON.stringify({ error: "publicToken, orgId, and entityId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // ── 1. Exchange public_token for access_token ──────────────────────────
    const exchangeRes = await fetch(
      `${PLAID_BASE_URL[PLAID_ENV]}/item/public_token/exchange`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          public_token: publicToken,
        }),
      }
    )

    if (!exchangeRes.ok) {
      const err = await exchangeRes.json()
      console.error("Plaid token exchange error:", err)
      return new Response(
        JSON.stringify({ error: "Token exchange failed", details: err.error_message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      )
    }

    const { access_token, item_id } = await exchangeRes.json()

    // ── 2. Store access_token in Supabase Vault ────────────────────────────
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: vaultData, error: vaultError } = await serviceClient.rpc(
      "vault_create_secret",
      {
        secret: JSON.stringify({ access_token, item_id }),
        name: `plaid_${orgId}_${item_id}`,
      }
    )

    if (vaultError) {
      console.error("Vault storage error:", vaultError)
      // Continue even if vault fails — we'll handle reconnection
    }

    const vaultSecretId = vaultData ?? null

    // ── 3. Create or update integration record ─────────────────────────────
    const { data: existingIntegration } = await serviceClient
      .from("integrations")
      .select("id")
      .eq("org_id", orgId)
      .eq("provider", "plaid")
      .maybeSingle()

    let integrationId: string

    if (existingIntegration) {
      const { data: updated } = await serviceClient
        .from("integrations")
        .update({
          status: "connected",
          status_message: null,
          external_item_id: item_id,
          vault_secret_id: vaultSecretId,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
          settings: {
            plaid: {
              products: ["auth", "transactions"],
              institutionId,
              institutionName,
              accountIds: (accounts ?? []).map((a: { id: string }) => a.id),
            },
            syncFrequency: "daily",
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingIntegration.id)
        .select("id")
        .single()
      integrationId = updated?.id ?? existingIntegration.id
    } else {
      const { data: created } = await serviceClient
        .from("integrations")
        .insert({
          org_id: orgId,
          provider: "plaid",
          name: institutionName ?? "Bank Connection",
          status: "connected",
          external_item_id: item_id,
          vault_secret_id: vaultSecretId,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
          settings: {
            plaid: {
              products: ["auth", "transactions"],
              institutionId,
              institutionName,
              accountIds: (accounts ?? []).map((a: { id: string }) => a.id),
            },
            syncFrequency: "daily",
          },
        })
        .select("id")
        .single()
      integrationId = created?.id ?? ""
    }

    // ── 4. Pull initial balances ───────────────────────────────────────────
    const balanceRes = await fetch(
      `${PLAID_BASE_URL[PLAID_ENV]}/accounts/balance/get`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token,
        }),
      }
    )

    const assetsCreated: string[] = []

    if (balanceRes.ok) {
      const balanceData = await balanceRes.json()

      for (const account of balanceData.accounts ?? []) {
        const balance = account.balances?.current ?? account.balances?.available ?? 0
        const currency = account.balances?.iso_currency_code ?? "USD"
        const assetClass = mapAccountType(account.type, account.subtype)
        const accountName = account.name ?? account.official_name ?? "Bank Account"

        // Create the asset
        const { data: asset } = await serviceClient
          .from("assets")
          .insert({
            entity_id: entityId,
            name: `${accountName}${account.mask ? ` (****${account.mask})` : ""}`,
            description: `${institutionName ?? "Bank"} - ${account.subtype ?? account.type}`,
            asset_class: assetClass,
            status: "active",
            current_value: balance.toString(),
            currency,
            external_id: account.account_id,
            metadata: {
              plaid_account_id: account.account_id,
              plaid_item_id: item_id,
              integration_id: integrationId,
              account_type: account.type,
              account_subtype: account.subtype,
            },
          })
          .select("id")
          .single()

        if (asset) {
          assetsCreated.push(asset.id)

          // Create initial valuation
          await serviceClient.from("valuations").insert({
            asset_id: asset.id,
            as_of_date: new Date().toISOString(),
            value: balance.toString(),
            currency,
            source: "api_feed",
            notes: `Initial balance from ${institutionName ?? "Plaid"} sync`,
          })
        }
      }

      // Update sync status
      await serviceClient
        .from("integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          sync_error_message: null,
          sync_history: [
            {
              timestamp: new Date().toISOString(),
              status: "success",
              accountsCount: balanceData.accounts?.length ?? 0,
              assetsCreated: assetsCreated.length,
            },
          ],
        })
        .eq("id", integrationId)
    }

    // ── 5. Create ledger event ─────────────────────────────────────────────
    await serviceClient.from("ledger_events").insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: "created",
      target_type: "integration",
      target_id: integrationId,
      payload: {
        provider: "plaid",
        institutionName,
        accountsLinked: assetsCreated.length,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        integrationId,
        assetsCreated: assetsCreated.length,
        itemId: item_id,
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
    console.error("plaid-exchange-token error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
