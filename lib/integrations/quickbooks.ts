/**
 * QuickBooks Integration — Accounting Sync
 *
 * QuickBooks handles:
 * - Syncing billing records as invoices in QuickBooks
 * - Pulling chart of accounts for categorization
 * - Syncing payment status back from QuickBooks
 *
 * FLOW:
 *   1. Advisor clicks "Connect QuickBooks" → OAuth consent flow
 *   2. User authorizes access → we store refresh token
 *   3. Advisor clicks "Sync to QuickBooks" → billing records push as invoices
 *   4. On-demand sync — no webhooks needed initially
 *
 * REQUIRED ENV VARS:
 *   QUICKBOOKS_CLIENT_ID     — from https://developer.intuit.com/app/developer/dashboard
 *   QUICKBOOKS_CLIENT_SECRET — from the same page
 *   QUICKBOOKS_ENV           — "sandbox" | "production"
 */

import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq } from "drizzle-orm"

// ─── Configuration ──────────────────────────────────────────────────────────

const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID ?? ""
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET ?? ""
const QUICKBOOKS_ENV = (process.env.QUICKBOOKS_ENV ?? "sandbox") as "sandbox" | "production"

const QB_BASE_URL = QUICKBOOKS_ENV === "production"
  ? "https://quickbooks.api.intuit.com"
  : "https://sandbox-quickbooks.api.intuit.com"

export function isQuickBooksConfigured(): boolean {
  return Boolean(QUICKBOOKS_CLIENT_ID && QUICKBOOKS_CLIENT_SECRET)
}

// ─── OAuth ──────────────────────────────────────────────────────────────────

/**
 * Build the QuickBooks OAuth authorization URL.
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: QUICKBOOKS_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  })

  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
}

/**
 * Exchange authorization code for tokens. QuickBooks returns a realmId
 * (company ID) that must be stored for API calls.
 */
export async function exchangeAuthCode(
  code: string,
  redirectUri: string,
  realmId: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; realmId: string }> {
  const credentials = Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString("base64")

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`QuickBooks token exchange failed: ${error}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    realmId,
  }
}

/**
 * Refresh an expired access token.
 */
async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const credentials = Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString("base64")

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!res.ok) throw new Error("QuickBooks token refresh failed")

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

// ─── QuickBooks API Helpers ─────────────────────────────────────────────────

async function qbRequest<T>(
  realmId: string,
  endpoint: string,
  accessToken: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${QB_BASE_URL}/v3/company/${realmId}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`QuickBooks ${endpoint}: ${error}`)
  }

  return res.json() as Promise<T>
}

// ─── Accounting Operations ──────────────────────────────────────────────────

interface QBAccount {
  Id: string
  Name: string
  AccountType: string
  AccountSubType: string
  CurrentBalance: number
}

/**
 * Get an active access token for a QuickBooks integration.
 */
export async function getAccessToken(integrationId: string): Promise<{ accessToken: string; realmId: string }> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "quickbooks") {
    throw new Error("QuickBooks integration not found")
  }

  const settings = integration.settings as Record<string, unknown>
  const expiresAt = settings.expires_at as number
  const currentRefreshToken = settings._refresh_token as string
  const realmId = settings.realm_id as string

  if (Date.now() < expiresAt - 60_000) {
    return { accessToken: settings._access_token as string, realmId }
  }

  const refreshed = await refreshAccessToken(currentRefreshToken)

  await db
    .update(integrations)
    .set({
      settings: {
        ...settings,
        _access_token: refreshed.accessToken,
        _refresh_token: refreshed.refreshToken,
        expires_at: Date.now() + refreshed.expiresIn * 1000,
      },
    })
    .where(eq(integrations.id, integrationId))

  return { accessToken: refreshed.accessToken, realmId }
}

/**
 * Fetch chart of accounts from QuickBooks.
 */
export async function getChartOfAccounts(
  accessToken: string,
  realmId: string,
): Promise<QBAccount[]> {
  const data = await qbRequest<{ QueryResponse: { Account: QBAccount[] } }>(
    realmId,
    "/query?query=SELECT * FROM Account MAXRESULTS 1000",
    accessToken,
  )

  return data.QueryResponse.Account ?? []
}

/**
 * Create an invoice in QuickBooks from a billing record.
 */
export async function createInvoice(
  accessToken: string,
  realmId: string,
  invoice: {
    customerName: string
    customerEmail: string
    amount: number
    description: string
    dueDate: string
    billingRecordId: string
  },
): Promise<{ qbInvoiceId: string }> {
  // First, find or create the customer
  const customerSearch = await qbRequest<{
    QueryResponse: { Customer?: { Id: string }[] }
  }>(
    realmId,
    `/query?query=SELECT * FROM Customer WHERE PrimaryEmailAddr = '${invoice.customerEmail}' MAXRESULTS 1`,
    accessToken,
  )

  let customerId: string

  if (customerSearch.QueryResponse.Customer?.length) {
    customerId = customerSearch.QueryResponse.Customer[0].Id
  } else {
    const newCustomer = await qbRequest<{ Customer: { Id: string } }>(
      realmId,
      "/customer",
      accessToken,
      "POST",
      {
        DisplayName: invoice.customerName,
        PrimaryEmailAddr: { Address: invoice.customerEmail },
      },
    )
    customerId = newCustomer.Customer.Id
  }

  // Create the invoice
  const created = await qbRequest<{ Invoice: { Id: string } }>(
    realmId,
    "/invoice",
    accessToken,
    "POST",
    {
      CustomerRef: { value: customerId },
      DueDate: invoice.dueDate,
      Line: [
        {
          Amount: invoice.amount / 100, // Convert cents to dollars
          DetailType: "SalesItemLineDetail",
          Description: invoice.description,
          SalesItemLineDetail: {
            UnitPrice: invoice.amount / 100,
            Qty: 1,
          },
        },
      ],
      PrivateNote: `Lacoda Capital Billing Record: ${invoice.billingRecordId}`,
    },
  )

  return { qbInvoiceId: created.Invoice.Id }
}

// ─── Connection Management ──────────────────────────────────────────────────

/**
 * Store QuickBooks connection after OAuth flow completes.
 */
export async function connectQuickBooks(
  orgId: string,
  connectedBy: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number; realmId: string },
): Promise<string> {
  const [integration] = await db
    .insert(integrations)
    .values({
      orgId,
      provider: "quickbooks",
      name: "QuickBooks",
      status: "connected",
      connectedBy,
      connectedAt: new Date(),
      externalAccountId: tokens.realmId,
      settings: {
        _access_token: tokens.accessToken,
        _refresh_token: tokens.refreshToken,
        expires_at: Date.now() + tokens.expiresIn * 1000,
        realm_id: tokens.realmId,
        environment: QUICKBOOKS_ENV,
      },
    })
    .returning()

  return integration.id
}
