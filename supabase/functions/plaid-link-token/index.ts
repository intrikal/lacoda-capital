/**
 * plaid-link-token — Supabase Edge Function
 *
 * Creates a Plaid Link token for the client-side Plaid Link flow.
 * The Link token is short-lived and used to initialize the Plaid Link UI.
 *
 * Called from the Next.js app when a user clicks "Connect Bank".
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
  // CORS preflight
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
    // Verify the user is authenticated
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

    // Create a Plaid Link token
    const plaidResponse = await fetch(
      `${PLAID_BASE_URL[PLAID_ENV]}/link/token/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          user: { client_user_id: user.id },
          client_name: "Lacoda Capital",
          products: ["auth", "transactions"],
          country_codes: ["US"],
          language: "en",
        }),
      }
    )

    if (!plaidResponse.ok) {
      const err = await plaidResponse.json()
      console.error("Plaid link/token/create error:", err)
      return new Response(
        JSON.stringify({
          error: "Failed to create link token",
          details: err.error_message ?? err.display_message,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      )
    }

    const plaidData = await plaidResponse.json()

    return new Response(
      JSON.stringify({
        link_token: plaidData.link_token,
        expiration: plaidData.expiration,
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
    console.error("plaid-link-token error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
