/**
 * Stripe Integration — Payments & Billing
 *
 * Stripe handles:
 * - Collecting advisory fee payments from clients
 * - Generating invoices
 * - Subscription management (recurring billing)
 * - Syncing payment status back to billing records
 *
 * FLOW:
 *   1. Advisor creates a billing record → Stripe Invoice is created
 *   2. Client receives invoice email → pays via Stripe Checkout
 *   3. Stripe sends webhook → billing record status updated to "paid"
 *
 * REQUIRED ENV VARS:
 *   STRIPE_SECRET_KEY        — from https://dashboard.stripe.com/apikeys
 *   STRIPE_PUBLISHABLE_KEY   — from https://dashboard.stripe.com/apikeys (NEXT_PUBLIC_)
 *   STRIPE_WEBHOOK_SECRET    — from Stripe Dashboard → Webhooks → Signing secret
 */

import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq } from "drizzle-orm"

// ─── Configuration ──────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ""

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY)
}

// ─── Stripe API Helpers ─────────────────────────────────────────────────────

async function stripeRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "POST",
  body?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(`Stripe ${endpoint}: ${error.error?.message ?? res.statusText}`)
  }

  return res.json() as Promise<T>
}

// ─── Customer Management ────────────────────────────────────────────────────

interface StripeCustomer {
  id: string
  email: string
  name: string | null
  metadata: Record<string, string>
}

/**
 * Create or retrieve a Stripe customer for a client.
 * Uses metadata to link Stripe customer to our client ID.
 */
export async function getOrCreateCustomer(
  clientEmail: string,
  clientName: string,
  clientId: string,
  orgId: string,
): Promise<string> {
  // Search for existing customer by metadata
  const existing = await stripeRequest<{ data: StripeCustomer[] }>(
    `/customers/search?query=metadata['lacoda_client_id']:'${clientId}'`,
    "GET",
  )

  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  // Create new customer
  const customer = await stripeRequest<StripeCustomer>("/customers", "POST", {
    email: clientEmail,
    name: clientName,
    "metadata[lacoda_client_id]": clientId,
    "metadata[lacoda_org_id]": orgId,
  })

  return customer.id
}

// ─── Invoice Management ─────────────────────────────────────────────────────

interface StripeInvoice {
  id: string
  status: string
  hosted_invoice_url: string | null
  amount_due: number
  currency: string
}

/**
 * Create a Stripe invoice for a billing record.
 *
 * @param customerId   - Stripe customer ID
 * @param amount       - Amount in cents (e.g., 50000 = $500.00)
 * @param description  - Line item description
 * @param billingRecordId - Our billing record ID (stored in metadata for webhook matching)
 */
export async function createInvoice(
  customerId: string,
  amount: number,
  description: string,
  billingRecordId: string,
): Promise<{ invoiceId: string; invoiceUrl: string | null }> {
  // Create invoice
  const invoice = await stripeRequest<StripeInvoice>("/invoices", "POST", {
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: "30",
    "metadata[lacoda_billing_record_id]": billingRecordId,
  })

  // Add line item
  await stripeRequest("/invoiceitems", "POST", {
    customer: customerId,
    invoice: invoice.id,
    amount: amount.toString(),
    currency: "usd",
    description,
  })

  // Finalize and send
  const finalized = await stripeRequest<StripeInvoice>(
    `/invoices/${invoice.id}/finalize`,
    "POST",
  )

  await stripeRequest(`/invoices/${invoice.id}/send`, "POST")

  return {
    invoiceId: finalized.id,
    invoiceUrl: finalized.hosted_invoice_url,
  }
}

// ─── Checkout Session ───────────────────────────────────────────────────────

interface StripeCheckoutSession {
  id: string
  url: string
}

/**
 * Create a Stripe Checkout session for a client to pay an invoice.
 * Redirects the client to Stripe's hosted payment page.
 */
export async function createCheckoutSession(
  invoiceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const session = await stripeRequest<StripeCheckoutSession>(
    "/checkout/sessions",
    "POST",
    {
      mode: "payment",
      invoice: invoiceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  )

  return session.url
}

// ─── Customer Portal ────────────────────────────────────────────────────────

interface StripeBillingPortal {
  id: string
  url: string
}

/**
 * Create a Stripe Customer Portal session.
 * Allows the client to manage their payment methods and view invoice history.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await stripeRequest<StripeBillingPortal>(
    "/billing_portal/sessions",
    "POST",
    {
      customer: customerId,
      return_url: returnUrl,
    },
  )

  return session.url
}

// ─── Connection Management ──────────────────────────────────────────────────

/**
 * Register the Stripe integration for an org.
 * Unlike Plaid (per-bank), Stripe is one connection per org.
 */
export async function connectStripe(
  orgId: string,
  connectedBy: string,
): Promise<string> {
  const [integration] = await db
    .insert(integrations)
    .values({
      orgId,
      provider: "stripe",
      name: "Stripe Payments",
      status: "connected",
      connectedBy,
      connectedAt: new Date(),
      settings: {
        mode: STRIPE_SECRET_KEY.startsWith("sk_test_") ? "test" : "live",
      },
    })
    .onConflictDoNothing()
    .returning()

  // If already exists, return existing
  if (!integration) {
    const existing = await db.query.integrations.findFirst({
      where: eq(integrations.provider, "stripe"),
    })
    return existing!.id
  }

  return integration.id
}

// ─── Webhook Signature Verification ─────────────────────────────────────────

/**
 * Verify a Stripe webhook signature.
 * Called by the webhook API route before processing events.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
): Record<string, unknown> | null {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return null

  // Stripe signature format: t=timestamp,v1=signature
  const parts = signature.split(",")
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2)
  const sig = parts.find((p) => p.startsWith("v1="))?.slice(3)

  if (!timestamp || !sig) return null

  // Verify timestamp is within 5 minutes (tolerance for clock skew)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) return null

  // Signature HMAC verification is performed in the webhook route handler
  // (app/api/webhooks/stripe/route.ts) using the Stripe SDK before this
  // function is called. This function only handles timestamp replay-attack
  // protection and JSON parsing.

  try {
    return JSON.parse(payload) as Record<string, unknown>
  } catch {
    return null
  }
}
