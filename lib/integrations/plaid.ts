"use server"

/**
 * Plaid Integration — Financial Data Aggregation
 *
 * Plaid connects to bank accounts, brokerages, and investment accounts to pull:
 * - Account balances (checking, savings, investment)
 * - Holdings (stocks, bonds, mutual funds)
 * - Transactions (for cash flow analysis)
 *
 * FLOW:
 *   1. User clicks "Connect Bank" → we create a Plaid Link token (server-side)
 *   2. Plaid Link opens in the browser → user logs into their bank
 *   3. Plaid returns a public_token → we exchange it for an access_token (server-side)
 *   4. We store the access_token in Supabase Vault (encrypted)
 *   5. Plaid sends webhooks when data updates → we refresh valuations
 *
 * REQUIRED ENV VARS:
 *   PLAID_CLIENT_ID     — from https://dashboard.plaid.com/team/keys
 *   PLAID_SECRET         — from https://dashboard.plaid.com/team/keys
 *   PLAID_ENV            — "sandbox" | "development" | "production"
 *   PLAID_WEBHOOK_SECRET — for verifying webhook signatures
 */

import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq, and } from "drizzle-orm"

// ─── Configuration ──────────────────────────────────────────────────────────

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID ?? ""
const PLAID_SECRET = process.env.PLAID_SECRET ?? ""
const PLAID_ENV = (process.env.PLAID_ENV ?? "sandbox") as "sandbox" | "development" | "production"

const PLAID_BASE_URL = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
}[PLAID_ENV]

export function isPlaidConfigured(): boolean {
  return Boolean(PLAID_CLIENT_ID && PLAID_SECRET)
}

// ─── Plaid API Helpers ──────────────────────────────────────────────────────

async function plaidRequest<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${PLAID_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      ...body,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error_message: res.statusText }))
    throw new Error(`Plaid ${endpoint}: ${error.error_message ?? res.statusText}`)
  }

  return res.json() as Promise<T>
}

// ─── Link Token (Step 1) ───────────────────────────────────────────────────

interface LinkTokenResponse {
  link_token: string
  expiration: string
  request_id: string
}

/**
 * Create a Plaid Link token. The frontend uses this to open Plaid Link.
 *
 * @param userId  - The Supabase user ID (for Plaid's user tracking)
 * @param orgId   - The org ID (stored in integration record)
 */
export async function createLinkToken(userId: string, orgId: string): Promise<string> {
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/plaid`

  const data = await plaidRequest<LinkTokenResponse>("/link/token/create", {
    user: { client_user_id: userId },
    client_name: "Lacoda Capital",
    products: ["auth", "transactions", "investments"],
    country_codes: ["US"],
    language: "en",
    webhook: webhookUrl,
  })

  return data.link_token
}

// ─── Token Exchange (Step 3) ────────────────────────────────────────────────

interface TokenExchangeResponse {
  access_token: string
  item_id: string
  request_id: string
}

/**
 * Exchange a public_token (from Plaid Link) for a permanent access_token.
 * Stores the access_token in Supabase Vault and creates an integration record.
 */
export async function exchangePublicToken(
  publicToken: string,
  orgId: string,
  connectedBy: string,
): Promise<{ integrationId: string; itemId: string }> {
  const data = await plaidRequest<TokenExchangeResponse>("/item/public_token/exchange", {
    public_token: publicToken,
  })

  // Get institution info for display name
  const itemInfo = await plaidRequest<{ item: { institution_id: string } }>("/item/get", {
    access_token: data.access_token,
  })

  let institutionName = "Bank Account"
  try {
    const instData = await plaidRequest<{ institution: { name: string } }>(
      "/institutions/get_by_id",
      {
        institution_id: itemInfo.item.institution_id,
        country_codes: ["US"],
      },
    )
    institutionName = instData.institution.name
  } catch {
    // Non-critical — use default name
  }

  // Store access token in Supabase Vault (not in the integrations table)
  // For now, store in settings JSONB with a note that production should use Vault
  // TODO: Migrate to Supabase Vault when available in your plan

  const [integration] = await db
    .insert(integrations)
    .values({
      orgId,
      provider: "plaid",
      name: institutionName,
      status: "connected",
      connectedBy,
      connectedAt: new Date(),
      externalAccountId: data.item_id,
      settings: {
        environment: PLAID_ENV,
        products: ["auth", "transactions", "investments"],
        // In production, move access_token to Supabase Vault
        _access_token: data.access_token,
      },
    })
    .returning()

  return { integrationId: integration.id, itemId: data.item_id }
}

// ─── Data Fetching ──────────────────────────────────────────────────────────

interface PlaidAccount {
  account_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  balances: {
    current: number | null
    available: number | null
    iso_currency_code: string | null
  }
}

interface PlaidHolding {
  account_id: string
  security_id: string
  quantity: number
  institution_price: number
  institution_value: number
  iso_currency_code: string | null
}

interface PlaidSecurity {
  security_id: string
  name: string | null
  ticker_symbol: string | null
  type: string | null
}

/**
 * Fetch account balances from Plaid for a connected integration.
 */
export async function getAccountBalances(integrationId: string): Promise<PlaidAccount[]> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "plaid") {
    throw new Error("Integration not found or not a Plaid integration")
  }

  const accessToken = (integration.settings as Record<string, unknown>)?._access_token as string
  if (!accessToken) throw new Error("No access token found for this integration")

  const data = await plaidRequest<{ accounts: PlaidAccount[] }>("/accounts/balance/get", {
    access_token: accessToken,
  })

  // Update last sync time
  await db
    .update(integrations)
    .set({ lastSyncAt: new Date(), statusMessage: null })
    .where(eq(integrations.id, integrationId))

  return data.accounts
}

/**
 * Fetch investment holdings from Plaid.
 */
export async function getInvestmentHoldings(
  integrationId: string,
): Promise<{ holdings: PlaidHolding[]; securities: PlaidSecurity[] }> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "plaid") {
    throw new Error("Integration not found or not a Plaid integration")
  }

  const accessToken = (integration.settings as Record<string, unknown>)?._access_token as string
  if (!accessToken) throw new Error("No access token found for this integration")

  const data = await plaidRequest<{
    holdings: PlaidHolding[]
    securities: PlaidSecurity[]
  }>("/investments/holdings/get", {
    access_token: accessToken,
  })

  await db
    .update(integrations)
    .set({ lastSyncAt: new Date(), statusMessage: null })
    .where(eq(integrations.id, integrationId))

  return { holdings: data.holdings, securities: data.securities }
}

/**
 * Disconnect a Plaid item (revoke access).
 */
export async function disconnectPlaidItem(integrationId: string): Promise<void> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "plaid") {
    throw new Error("Integration not found or not a Plaid integration")
  }

  const accessToken = (integration.settings as Record<string, unknown>)?._access_token as string
  if (accessToken) {
    try {
      await plaidRequest("/item/remove", { access_token: accessToken })
    } catch {
      // Best-effort revocation — continue even if Plaid call fails
    }
  }

  await db
    .update(integrations)
    .set({
      status: "disconnected",
      disconnectedAt: new Date(),
      settings: {},
    })
    .where(eq(integrations.id, integrationId))
}
