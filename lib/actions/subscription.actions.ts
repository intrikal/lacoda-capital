"use server"

import { eq, and, count, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { subscriptions, orgMembers, assets, documents, entities, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { getStripe } from "@/lib/stripe/client"
import {
  STRIPE_PRICE_IDS,
  PLAN_LIMITS,
  checkPlanUsage,
  type PlanTier,
  type BillingInterval,
  type UsageSnapshot,
  type UsageStatus,
} from "@/lib/stripe/plan-limits"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionInfo {
  id: string
  plan: PlanTier
  status: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEnd: string | null
  createdAt: string
}

export interface BillingOverview {
  subscription: SubscriptionInfo | null
  usage: UsageSnapshot
  usageStatuses: UsageStatus[]
  planLimits: typeof PLAN_LIMITS[PlanTier]
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * getSubscription — Fetch the current org's subscription.
 */
export async function getSubscription(): Promise<SubscriptionInfo | null> {
  const session = await requireAuth()
  if (!session.orgId) return null

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.orgId, session.orgId),
  })
  if (!sub) return null

  return {
    id: sub.id,
    plan: sub.plan as PlanTier,
    status: sub.status,
    stripeCustomerId: sub.stripeCustomerId,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd === "true",
    trialEnd: sub.trialEnd?.toISOString() ?? null,
    createdAt: sub.createdAt.toISOString(),
  }
}

/**
 * getUsageSnapshot — Compute current org usage for plan limit checks.
 */
export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const session = await requireAuth()
  if (!session.orgId) return { currentAum: 0, teamMemberCount: 0, storageUsedBytes: 0 }

  const [aumResult, memberResult, storageResult] = await Promise.all([
    // Sum of all active asset values (assets → entities → clients → org)
    db
      .select({ total: sql<number>`coalesce(sum(${assets.currentValue}::numeric), 0)` })
      .from(assets)
      .innerJoin(entities, eq(assets.entityId, entities.id))
      .innerJoin(clients, eq(entities.clientId, clients.id))
      .where(and(eq(clients.orgId, session.orgId), eq(assets.status, "active"))),
    // Count of admin + assistant members (not clients)
    db
      .select({ total: count() })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, session.orgId),
          sql`${orgMembers.role} IN ('admin', 'assistant')`,
          sql`${orgMembers.deletedAt} IS NULL`
        )
      ),
    // Sum of all document file sizes (fileSize is a text column)
    db
      .select({ total: sql<number>`coalesce(sum(${documents.fileSize}::bigint), 0)` })
      .from(documents)
      .where(and(eq(documents.orgId, session.orgId), sql`${documents.deletedAt} IS NULL`)),
  ])

  return {
    currentAum: Number(aumResult[0]?.total ?? 0),
    teamMemberCount: Number(memberResult[0]?.total ?? 0),
    storageUsedBytes: Number(storageResult[0]?.total ?? 0),
  }
}

/**
 * getBillingOverview — Combined subscription + usage data for the billing page.
 */
export async function getBillingOverview(): Promise<BillingOverview> {
  const [subscription, usage] = await Promise.all([
    getSubscription(),
    getUsageSnapshot(),
  ])

  const plan = (subscription?.plan ?? "free") as PlanTier
  const usageStatuses = checkPlanUsage(plan, usage)
  const planLimits = PLAN_LIMITS[plan]

  return { subscription, usage, usageStatuses, planLimits }
}

// ─── Stripe Checkout ──────────────────────────────────────────────────────────

/**
 * createCheckoutSession — Create a Stripe Checkout session for plan subscription.
 *
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckoutSession(input: {
  plan: "starter" | "professional"
  interval: BillingInterval
}): Promise<{ url: string }> {
  const session = await requireRole("admin")
  const stripe = getStripe()
  const { plan, interval } = input

  const priceId = STRIPE_PRICE_IDS[`${plan}_${interval}`]
  if (!priceId) throw new Error(`No Stripe price configured for ${plan} ${interval}`)

  // Get or create Stripe customer
  let sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.orgId, session.orgId),
  })

  let customerId = sub?.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.email,
      metadata: { orgId: session.orgId, userId: session.userId },
    })
    customerId = customer.id

    if (!sub) {
      // Create subscription record
      await db.insert(subscriptions).values({
        orgId: session.orgId,
        plan: "free",
        status: "trialing",
        stripeCustomerId: customerId,
      })
    } else {
      await db
        .update(subscriptions)
        .set({ stripeCustomerId: customerId })
        .where(eq(subscriptions.orgId, session.orgId))
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { orgId: session.orgId },
    },
    success_url: `${siteUrl}/app/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/app/settings/billing?checkout=cancelled`,
    metadata: { orgId: session.orgId, plan, interval },
  })

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "created",
    targetType: "org",
    targetId: session.orgId,
    metadata: { action: "checkout_session_created", plan, interval },
  })

  return { url: checkoutSession.url! }
}

/**
 * createBillingPortalSession — Open Stripe Customer Portal for managing payment.
 */
export async function createBillingPortalSession(): Promise<{ url: string }> {
  const session = await requireRole("admin")
  const stripe = getStripe()

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.orgId, session.orgId),
  })

  if (!sub?.stripeCustomerId) {
    throw new Error("No billing account found. Subscribe to a plan first.")
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${siteUrl}/app/settings/billing`,
  })

  return { url: portalSession.url }
}

// ─── Plan Changes ─────────────────────────────────────────────────────────────

/**
 * cancelSubscription — Request cancellation at end of billing period.
 */
export async function cancelSubscription(): Promise<{ success: boolean }> {
  const session = await requireRole("admin")
  const stripe = getStripe()

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.orgId, session.orgId),
  })

  if (!sub?.stripeSubscriptionId) {
    throw new Error("No active subscription found")
  }

  // Cancel at period end (not immediately)
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: "true", status: "cancelling" })
    .where(eq(subscriptions.orgId, session.orgId))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: session.orgId,
    metadata: { action: "subscription_cancel_requested", plan: sub.plan },
  })

  return { success: true }
}

/**
 * resumeSubscription — Undo a pending cancellation.
 */
export async function resumeSubscription(): Promise<{ success: boolean }> {
  const session = await requireRole("admin")
  const stripe = getStripe()

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.orgId, session.orgId),
  })

  if (!sub?.stripeSubscriptionId) {
    throw new Error("No active subscription found")
  }

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  })

  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: "false", status: "active" })
    .where(eq(subscriptions.orgId, session.orgId))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: session.orgId,
    metadata: { action: "subscription_cancel_reversed", plan: sub.plan },
  })

  return { success: true }
}

/**
 * getInvoices — Fetch recent invoices from Stripe.
 */
export async function getInvoices(limit = 12): Promise<InvoiceItem[]> {
  const session = await requireRole("admin")
  const stripe = getStripe()

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.orgId, session.orgId),
  })

  if (!sub?.stripeCustomerId) return []

  const invoices = await stripe.invoices.list({
    customer: sub.stripeCustomerId,
    limit,
    status: "paid",
  })

  return invoices.data.map((inv) => ({
    id: inv.id,
    amountPaid: (inv.amount_paid ?? 0) / 100,
    currency: inv.currency?.toUpperCase() ?? "USD",
    status: inv.status ?? "draft",
    periodStart: inv.period_start
      ? new Date(inv.period_start * 1000).toISOString()
      : null,
    periodEnd: inv.period_end
      ? new Date(inv.period_end * 1000).toISOString()
      : null,
    invoicePdf: inv.invoice_pdf ?? null,
    hostedUrl: inv.hosted_invoice_url ?? null,
    createdAt: new Date(inv.created * 1000).toISOString(),
  }))
}

export interface InvoiceItem {
  id: string
  amountPaid: number
  currency: string
  status: string
  periodStart: string | null
  periodEnd: string | null
  invoicePdf: string | null
  hostedUrl: string | null
  createdAt: string
}
