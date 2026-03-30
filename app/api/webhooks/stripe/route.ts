import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq } from "drizzle-orm"
import { dispatchAlert } from "@/lib/alerts"
import { getStripe } from "@/lib/stripe/client"

/**
 * Stripe Webhook Handler
 *
 * Receives events from Stripe when:
 * - invoice.paid          → update billing record to "paid"
 * - invoice.payment_failed → flag billing record
 * - checkout.session.completed → confirm payment
 * - customer.subscription.* → subscription lifecycle
 *
 * Stripe sends a POST with a JSON body and a Stripe-Signature header.
 * We verify the signature before processing any event.
 *
 * SETUP:
 *   1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   2. URL: https://your-domain.com/api/webhooks/stripe
 *   3. Events to listen for: invoice.paid, invoice.payment_failed, checkout.session.completed
 *   4. Copy the Signing Secret → set as STRIPE_WEBHOOK_SECRET env var
 */

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header" }, { status: 400 })
  }

  // Verify webhook signature
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  let stripe
  try {
    stripe = getStripe()
  } catch {
    console.error("[stripe-webhook] Stripe client not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  let event: { type: string; data: { object: Record<string, unknown> } }

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as typeof event
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Process the event
  try {
    switch (event.type) {
      case "invoice.paid": {
        const invoice = event.data.object
        const billingRecordId = (invoice.metadata as Record<string, string>)?.lacoda_billing_record_id

        if (billingRecordId) {
          // Update billing record status to "paid"
          // TODO: Import and update billing_records table when billing actions are wired
          console.log(`[stripe-webhook] Invoice paid for billing record: ${billingRecordId}`)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object
        const billingRecordId = (invoice.metadata as Record<string, string>)?.lacoda_billing_record_id

        if (billingRecordId) {
          console.log(`[stripe-webhook] Payment failed for billing record: ${billingRecordId}`)
        }
        break
      }

      case "checkout.session.completed": {
        const session = event.data.object
        console.log(`[stripe-webhook] Checkout completed: ${session.id}`)
        break
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }

    Sentry.addBreadcrumb({
      category: "webhook.stripe",
      message: `Stripe webhook processed: ${event.type}`,
      level: "info",
    })
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[stripe-webhook] Processing error:", err)

    Sentry.withScope((scope) => {
      scope.setTag("webhook", "stripe")
      scope.setContext("webhook", { eventType: event.type })
      scope.captureException(err instanceof Error ? err : new Error(String(err)))
    })

    dispatchAlert({
      title: "Stripe webhook processing failed",
      description: `Error processing ${event.type}: ${err instanceof Error ? err.message : String(err)}`,
      severity: "critical",
      source: "stripe-webhook",
    }).catch(() => {})

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
