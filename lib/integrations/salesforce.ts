/**
 * Salesforce CRM Integration — Bi-directional Client & Deal Sync
 *
 * Salesforce handles:
 * - Syncing client records (Salesforce Contact <-> our clients table)
 * - Syncing pipeline deals (Salesforce Opportunity <-> our deals table)
 * - Pulling activity data for the activity feed
 * - Configurable field mappings (our fields -> Salesforce fields)
 *
 * FLOW:
 *   1. Admin clicks "Connect Salesforce" -> OAuth consent flow
 *   2. User authorizes access -> we store refresh token
 *   3. Advisor clicks "Sync Clients" or "Sync Deals" -> on-demand sync
 *   4. No webhooks initially — sync is advisor-initiated
 *
 * REQUIRED ENV VARS:
 *   SALESFORCE_CLIENT_ID     — from https://login.salesforce.com → Setup → App Manager
 *   SALESFORCE_CLIENT_SECRET — from the same page
 *   SALESFORCE_LOGIN_URL     — "https://login.salesforce.com" (production) or
 *                              "https://test.salesforce.com" (sandbox)
 */

import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq } from "drizzle-orm"

// ─── Configuration ──────────────────────────────────────────────────────────

const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID ?? ""
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET ?? ""
const SALESFORCE_LOGIN_URL = process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com"

export function isSalesforceConfigured(): boolean {
  return Boolean(SALESFORCE_CLIENT_ID && SALESFORCE_CLIENT_SECRET)
}

// ─── OAuth ──────────────────────────────────────────────────────────────────

/**
 * Build the Salesforce OAuth authorization URL.
 * Scopes: api (REST API), refresh_token (offline access), id (user identity).
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: SALESFORCE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "api refresh_token id",
    state,
  })

  return `${SALESFORCE_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for tokens. Salesforce returns the instance_url
 * (org-specific API base URL) that must be stored for all subsequent API calls.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{
  accessToken: string
  refreshToken: string
  instanceUrl: string
  issuedAt: string
}> {
  const res = await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Salesforce token exchange failed: ${error}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url,
    issuedAt: data.issued_at,
  }
}

/**
 * Refresh an expired access token. Salesforce refresh tokens do not expire
 * unless revoked by the admin or the connected app is removed.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; instanceUrl: string; issuedAt: string }> {
  const res = await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: SALESFORCE_CLIENT_ID,
      client_secret: SALESFORCE_CLIENT_SECRET,
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Salesforce token refresh failed: ${error}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
    issuedAt: data.issued_at,
  }
}

// ─── Salesforce API Helpers ─────────────────────────────────────────────────

/** Salesforce-specific error codes we handle specially */
const RETRYABLE_ERROR_CODES = new Set([
  "REQUEST_LIMIT_EXCEEDED",
  "UNABLE_TO_LOCK_ROW",
])

interface SalesforceErrorBody {
  errorCode: string
  message: string
}

export class SalesforceApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = "SalesforceApiError"
  }
}

async function sfRequest<T>(
  instanceUrl: string,
  endpoint: string,
  accessToken: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${instanceUrl}/services/data/v59.0${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let errorCode = "UNKNOWN_ERROR"
    let errorMessage = res.statusText

    try {
      const errorBody = (await res.json()) as SalesforceErrorBody[]
      if (Array.isArray(errorBody) && errorBody.length > 0) {
        errorCode = errorBody[0].errorCode
        errorMessage = errorBody[0].message
      }
    } catch {
      // Response wasn't JSON — use defaults
    }

    throw new SalesforceApiError(
      `Salesforce ${endpoint}: ${errorMessage}`,
      errorCode,
      res.status,
    )
  }

  // Some Salesforce endpoints (DELETE, 204) return no body
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

/**
 * Execute a request with automatic retry for transient Salesforce errors.
 * Retries up to 2 times with exponential backoff for UNABLE_TO_LOCK_ROW
 * and REQUEST_LIMIT_EXCEEDED.
 */
async function sfRequestWithRetry<T>(
  instanceUrl: string,
  endpoint: string,
  accessToken: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  maxRetries = 2,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await sfRequest<T>(instanceUrl, endpoint, accessToken, method, body)
    } catch (error) {
      lastError = error
      if (
        error instanceof SalesforceApiError &&
        RETRYABLE_ERROR_CODES.has(error.errorCode) &&
        attempt < maxRetries
      ) {
        // Exponential backoff: 1s, 2s
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw lastError
}

// ─── Salesforce Record Types ────────────────────────────────────────────────

interface SFContact {
  Id: string
  FirstName: string | null
  LastName: string
  Email: string | null
  Phone: string | null
  MailingStreet: string | null
  MailingCity: string | null
  MailingState: string | null
  MailingPostalCode: string | null
  MailingCountry: string | null
  Title: string | null
  Department: string | null
  AccountId: string | null
  IsDeleted?: boolean
}

interface SFOpportunity {
  Id: string
  Name: string
  StageName: string
  Amount: number | null
  CloseDate: string
  AccountId: string | null
  Description: string | null
  Probability: number | null
  IsClosed: boolean
  IsWon: boolean
  IsDeleted?: boolean
  CurrencyIsoCode?: string
}

interface SFQueryResult<T> {
  totalSize: number
  done: boolean
  nextRecordsUrl: string | null
  records: T[]
}

// ─── Field Mapping ──────────────────────────────────────────────────────────

export interface FieldMapping {
  sfField: string
  ourField: string
}

/** Default mapping: Salesforce Contact fields -> our client fields */
export const DEFAULT_CLIENT_FIELD_MAP: FieldMapping[] = [
  { sfField: "FirstName", ourField: "firstName" },
  { sfField: "LastName", ourField: "lastName" },
  { sfField: "Email", ourField: "email" },
  { sfField: "Phone", ourField: "phone" },
  { sfField: "MailingStreet", ourField: "addressLine1" },
  { sfField: "MailingCity", ourField: "city" },
  { sfField: "MailingState", ourField: "state" },
  { sfField: "MailingPostalCode", ourField: "zip" },
  { sfField: "MailingCountry", ourField: "country" },
  { sfField: "Title", ourField: "title" },
]

/** Default mapping: Salesforce Opportunity fields -> our deal fields */
export const DEFAULT_DEAL_FIELD_MAP: FieldMapping[] = [
  { sfField: "Name", ourField: "name" },
  { sfField: "StageName", ourField: "stage" },
  { sfField: "Amount", ourField: "amount" },
  { sfField: "CloseDate", ourField: "closeDate" },
  { sfField: "Probability", ourField: "probability" },
  { sfField: "Description", ourField: "description" },
]

// ─── Record Mapping ─────────────────────────────────────────────────────────

export interface MappedClient {
  sfContactId: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  addressLine1: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  title: string | null
}

export interface MappedDeal {
  sfOpportunityId: string
  name: string
  stage: string
  amount: number | null
  closeDate: string
  probability: number | null
  description: string | null
  isClosed: boolean
  isWon: boolean
}

/**
 * Map a Salesforce Contact to our internal client representation.
 * Returns null if the contact should be skipped (e.g., missing email).
 */
export function mapSFContactToClient(contact: SFContact): MappedClient | null {
  // Skip deleted contacts
  if (contact.IsDeleted) return null

  // Skip contacts without an email — we require email for client records
  if (!contact.Email) return null

  return {
    sfContactId: contact.Id,
    firstName: contact.FirstName ?? "",
    lastName: contact.LastName,
    email: contact.Email,
    phone: contact.Phone,
    addressLine1: contact.MailingStreet,
    city: contact.MailingCity,
    state: contact.MailingState,
    zip: contact.MailingPostalCode,
    country: contact.MailingCountry,
    title: contact.Title,
  }
}

/**
 * Map a Salesforce Opportunity to our internal deal representation.
 * Amount is stored in USD cents in our DB. If the SF org uses multi-currency,
 * we store the raw amount and let the caller handle conversion.
 */
export function mapSFOpportunityToDeal(opportunity: SFOpportunity): MappedDeal | null {
  // Skip deleted opportunities
  if (opportunity.IsDeleted) return null

  return {
    sfOpportunityId: opportunity.Id,
    name: opportunity.Name,
    stage: opportunity.StageName,
    amount: opportunity.Amount,
    closeDate: opportunity.CloseDate,
    probability: opportunity.Probability,
    description: opportunity.Description,
    isClosed: opportunity.IsClosed,
    isWon: opportunity.IsWon,
  }
}

// ─── Token Management ───────────────────────────────────────────────────────

/**
 * Get an active access token for a Salesforce integration.
 * Refreshes the token if it's older than 1 hour (Salesforce tokens last ~2 hours
 * but we refresh early to avoid mid-request expiry).
 */
export async function getAccessToken(
  integrationId: string,
): Promise<{ accessToken: string; instanceUrl: string }> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "salesforce") {
    throw new Error("Salesforce integration not found")
  }

  const settings = integration.settings as Record<string, unknown>
  const issuedAt = Number(settings.issued_at)
  const currentRefreshToken = settings._refresh_token as string
  const instanceUrl = settings.instance_url as string

  // Salesforce access tokens last ~2 hours. Refresh if older than 1 hour.
  const ONE_HOUR = 60 * 60 * 1000
  if (Date.now() - issuedAt < ONE_HOUR) {
    return { accessToken: settings._access_token as string, instanceUrl }
  }

  const refreshed = await refreshAccessToken(currentRefreshToken)

  await db
    .update(integrations)
    .set({
      settings: {
        ...settings,
        _access_token: refreshed.accessToken,
        instance_url: refreshed.instanceUrl,
        issued_at: refreshed.issuedAt,
      },
    })
    .where(eq(integrations.id, integrationId))

  return { accessToken: refreshed.accessToken, instanceUrl: refreshed.instanceUrl }
}

// ─── Sync Operations ────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number
  skipped: number
  failed: number
  errors: Array<{ recordId: string; error: string }>
}

/**
 * Pull Contacts from Salesforce and return mapped client records.
 * Uses cursor-based pagination (nextRecordsUrl) to handle large orgs.
 */
export async function syncClients(
  integrationId: string,
): Promise<{ clients: MappedClient[]; result: SyncResult }> {
  const { accessToken, instanceUrl } = await getAccessToken(integrationId)

  const fields = [
    "Id", "FirstName", "LastName", "Email", "Phone",
    "MailingStreet", "MailingCity", "MailingState",
    "MailingPostalCode", "MailingCountry", "Title",
    "Department", "AccountId", "IsDeleted",
  ].join(",")

  const query = encodeURIComponent(
    `SELECT ${fields} FROM Contact WHERE IsDeleted = false ORDER BY LastModifiedDate DESC`,
  )

  const clients: MappedClient[] = []
  const result: SyncResult = { synced: 0, skipped: 0, failed: 0, errors: [] }
  let nextUrl: string | null = `/query?q=${query}`

  while (nextUrl) {
    let batch: SFQueryResult<SFContact>
    try {
      batch = await sfRequestWithRetry<SFQueryResult<SFContact>>(
        instanceUrl,
        nextUrl,
        accessToken,
      )
    } catch (error) {
      // If session is invalid, mark integration as error
      if (error instanceof SalesforceApiError && error.errorCode === "INVALID_SESSION_ID") {
        await db
          .update(integrations)
          .set({ status: "error", statusMessage: "Session expired — please reconnect Salesforce" })
          .where(eq(integrations.id, integrationId))
        throw error
      }
      throw error
    }

    for (const contact of batch.records) {
      try {
        const mapped = mapSFContactToClient(contact)
        if (mapped) {
          clients.push(mapped)
          result.synced++
        } else {
          result.skipped++
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          recordId: contact.Id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    nextUrl = batch.done ? null : batch.nextRecordsUrl
  }

  // Update last sync time
  await db
    .update(integrations)
    .set({ lastSyncAt: new Date(), statusMessage: null })
    .where(eq(integrations.id, integrationId))

  return { clients, result }
}

/**
 * Pull Opportunities from Salesforce and return mapped deal records.
 * Uses cursor-based pagination for large datasets.
 */
export async function syncDeals(
  integrationId: string,
): Promise<{ deals: MappedDeal[]; result: SyncResult }> {
  const { accessToken, instanceUrl } = await getAccessToken(integrationId)

  const fields = [
    "Id", "Name", "StageName", "Amount", "CloseDate",
    "AccountId", "Description", "Probability",
    "IsClosed", "IsWon", "IsDeleted",
  ].join(",")

  const query = encodeURIComponent(
    `SELECT ${fields} FROM Opportunity WHERE IsDeleted = false ORDER BY LastModifiedDate DESC`,
  )

  const deals: MappedDeal[] = []
  const result: SyncResult = { synced: 0, skipped: 0, failed: 0, errors: [] }
  let nextUrl: string | null = `/query?q=${query}`

  while (nextUrl) {
    let batch: SFQueryResult<SFOpportunity>
    try {
      batch = await sfRequestWithRetry<SFQueryResult<SFOpportunity>>(
        instanceUrl,
        nextUrl,
        accessToken,
      )
    } catch (error) {
      if (error instanceof SalesforceApiError && error.errorCode === "INVALID_SESSION_ID") {
        await db
          .update(integrations)
          .set({ status: "error", statusMessage: "Session expired — please reconnect Salesforce" })
          .where(eq(integrations.id, integrationId))
        throw error
      }
      throw error
    }

    for (const opportunity of batch.records) {
      try {
        const mapped = mapSFOpportunityToDeal(opportunity)
        if (mapped) {
          deals.push(mapped)
          result.synced++
        } else {
          result.skipped++
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          recordId: opportunity.Id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    nextUrl = batch.done ? null : batch.nextRecordsUrl
  }

  await db
    .update(integrations)
    .set({ lastSyncAt: new Date(), statusMessage: null })
    .where(eq(integrations.id, integrationId))

  return { deals, result }
}

// ─── Connection Management ──────────────────────────────────────────────────

/**
 * Store Salesforce connection after OAuth flow completes.
 */
export async function connectSalesforce(
  orgId: string,
  connectedBy: string,
  tokens: { accessToken: string; refreshToken: string; instanceUrl: string; issuedAt: string },
): Promise<string> {
  const [integration] = await db
    .insert(integrations)
    .values({
      orgId,
      provider: "salesforce",
      name: "Salesforce",
      status: "connected",
      connectedBy,
      connectedAt: new Date(),
      externalAccountId: tokens.instanceUrl,
      settings: {
        _access_token: tokens.accessToken,
        _refresh_token: tokens.refreshToken,
        instance_url: tokens.instanceUrl,
        issued_at: tokens.issuedAt,
        login_url: SALESFORCE_LOGIN_URL,
      },
    })
    .returning()

  return integration.id
}

/**
 * Disconnect Salesforce — revoke the token and update the integration record.
 */
export async function disconnectSalesforce(integrationId: string): Promise<void> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "salesforce") {
    throw new Error("Salesforce integration not found")
  }

  const settings = integration.settings as Record<string, unknown>
  const accessToken = settings._access_token as string

  if (accessToken) {
    try {
      // Revoke the token with Salesforce
      await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: accessToken }).toString(),
      })
    } catch {
      // Best-effort revocation — continue even if Salesforce call fails
    }
  }

  await db
    .update(integrations)
    .set({
      status: "disconnected",
      settings: {},
    })
    .where(eq(integrations.id, integrationId))
}
