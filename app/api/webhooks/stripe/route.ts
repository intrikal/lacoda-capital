/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe
 *
 * Receives Stripe events and updates the subscriptions table.
 * Idempotent by checkout session ID / subscription ID.
 *
 * Events handled:
 *   - checkout.session.completed   → Create/update subscription after payment
 *   - customer.subscription.updated → Sync plan changes, status, period dates
 *   - customer.subscription.deleted → Mark subscription as cancelled
 *   - invoice.payment_failed       → Mark subscription as past_due
 *   - invoice.paid                 → Confirm active status
 */

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import Stripe from "stripe"
import { db } from "@/app/db"
import { subscriptions } from "@/app/db/schema"
import { getStripe } from "@/lib/stripe/client"

/** Map Stripe price IDs back to plan tiers. */
function priceToPlan(priceId: string | null): "starter" | "professional" | "enterprise" | null {
  if (!priceId) return null
  const starterMonthly = process.env.STRIPE_PRICE_STARTER_MONTHLY
  const starterAnnual = process.env.STRIPE_PRICE_STARTER_ANNUAL
  const proMonthly = process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY
  const proAnnual = process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL

  if (priceId === starterMonthly || priceId === starterAnnual) return "starter"
  if (priceId === proMonthly || priceId === proAnnual) return "professional"
  return "enterprise"
}

/** Map Stripe subscription status to our enum. */
function mapStatus(
  stripeStatus: Stripe.Subscription.Status,
  cancelAtPeriodEnd: boolean
): "trialing" | "active" | "past_due" | "cancelling" | "cancelled" | "unpaid" {
  if (cancelAtPeriodEnd && stripeStatus === "active") return "cancelling"
  switch (stripeStatus) {
    case "trialing":
      return "trialing"
    case "active":
      return "active"
    case "past_due":
      return "past_due"
    case "canceled":
      return "cancelled"
    case "unpaid":
      return "unpaid"
    default:
      return "cancelled"
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  // Verify signature
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature"
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.orgId
        const plan = session.metadata?.plan as "starter" | "professional" | undefined

        if (!orgId || !plan) break

        // Get subscription details from Stripe
        const stripeSub = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription as string)
          : null

        const priceId = stripeSub?.items.data[0]?.price.id ?? null

        await db
          .update(subscriptions)
          .set({
            plan,
            status: stripeSub?.status === "trialing" ? "trialing" : "active",
            stripeSubscriptionId: stripeSub?.id ?? null,
            stripePriceId: priceId,
            currentPeriodStart: stripeSub?.current_period_start
              ? new Date(stripeSub.current_period_start * 1000)
              : null,
            currentPeriodEnd: stripeSub?.current_period_end
              ? new Date(stripeSub.current_period_end * 1000)
              : null,
            trialEnd: stripeSub?.trial_end
              ? new Date(stripeSub.trial_end * 1000)
              : null,
            cancelAtPeriodEnd: "false",
            metadata: {
              checkoutSessionId: session.id,
              lastPaymentIntentId: session.payment_intent as string | undefined,
            },
          })
          .where(eq(subscriptions.orgId, orgId))

        break
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription
        const orgId = stripeSub.metadata?.orgId

        if (!orgId) break

        const priceId = stripeSub.items.data[0]?.price.id ?? null
        const plan = priceToPlan(priceId) ?? "free"
        const status = mapStatus(stripeSub.status, stripeSub.cancel_at_period_end)

        await db
          .update(subscriptions)
          .set({
            plan,
            status,
            stripePriceId: priceId,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end ? "true" : "false",
            trialEnd: stripeSub.trial_end
              ? new Date(stripeSub.trial_end * 1000)
              : null,
          })
          .where(eq(subscriptions.orgId, orgId))

        break
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription
        const orgId = stripeSub.metadata?.orgId

        if (!orgId) break

        await db
          .update(subscriptions)
          .set({
            plan: "free",
            status: "cancelled",
            cancelAtPeriodEnd: "false",
            stripeSubscriptionId: null,
            stripePriceId: null,
          })
          .where(eq(subscriptions.orgId, orgId))

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        if (!customerId) break

        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeCustomerId, customerId),
        })

        if (sub) {
          await db
            .update(subscriptions)
            .set({ status: "past_due" })
            .where(eq(subscriptions.id, sub.id))
        }

        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        if (!customerId) break

        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeCustomerId, customerId),
        })

        if (sub && sub.status === "past_due") {
          await db
            .update(subscriptions)
            .set({
              status: sub.cancelAtPeriodEnd === "true" ? "cancelling" : "active",
              metadata: {
                ...(sub.metadata as object ?? {}),
                lastInvoiceId: invoice.id,
              },
            })
            .where(eq(subscriptions.id, sub.id))
        }

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("Stripe webhook processing error:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
