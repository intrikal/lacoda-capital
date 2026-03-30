import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import * as Sentry from "@sentry/nextjs"
import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq } from "drizzle-orm"
import { dispatchAlert } from "@/lib/alerts"

/**
 * Plaid Webhook Handler
 *
 * Receives events from Plaid when:
 * - TRANSACTIONS: New transactions available, removed, or sync needed
 * - HOLDINGS:     Investment holdings updated
 * - ITEM:         Account connection status changed (error, pending expiration)
 * - ASSETS:       Asset report ready
 *
 * Plaid sends a POST with a JSON body and a Plaid-Verification header.
 *
 * SETUP:
 *   1. Webhook URL is set during Plaid Link token creation (in plaid.ts)
 *   2. URL: https://your-domain.com/api/webhooks/plaid
 *   3. Set PLAID_WEBHOOK_SECRET in your env for verification
 */

export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify Plaid-Verification header using HMAC-SHA256
  const plaidSignature = req.headers.get("plaid-verification")
  if (!plaidSignature) {
    return NextResponse.json({ error: "Missing Plaid-Verification header" }, { status: 400 })
  }

  const webhookSecret = process.env.PLAID_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[plaid-webhook] PLAID_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(body, "utf8")
    .digest("hex")

  const sigBuffer = Buffer.from(plaidSignature, "utf8")
  const expectedBuffer = Buffer.from(expectedSignature, "utf8")

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let event: {
    webhook_type: string
    webhook_code: string
    item_id: string
    error?: { error_code: string; error_message: string }
    new_transactions?: number
  }

  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { webhook_type, webhook_code, item_id } = event

  try {
    // Find the integration by Plaid item_id
    const integration = await db.query.integrations.findFirst({
      where: eq(integrations.externalAccountId, item_id),
    })

    if (!integration) {
      console.warn(`[plaid-webhook] No integration found for item_id: ${item_id}`)
      return NextResponse.json({ received: true })
    }

    switch (webhook_type) {
      case "TRANSACTIONS": {
        switch (webhook_code) {
          case "SYNC_UPDATES_AVAILABLE":
            // New transactions available — trigger a sync
            console.log(
              `[plaid-webhook] New transactions for ${integration.name} (${item_id})`,
            )
            // TODO: Trigger transaction sync and update valuations
            await db
              .update(integrations)
              .set({ statusMessage: `New transactions available` })
              .where(eq(integrations.id, integration.id))
            break

          case "INITIAL_UPDATE":
            console.log(`[plaid-webhook] Initial transaction data ready for ${item_id}`)
            break

          case "HISTORICAL_UPDATE":
            console.log(`[plaid-webhook] Historical transaction data ready for ${item_id}`)
            break
        }
        break
      }

      case "HOLDINGS": {
        if (webhook_code === "DEFAULT_UPDATE") {
          console.log(`[plaid-webhook] Holdings updated for ${integration.name} (${item_id})`)
          // TODO: Fetch new holdings and update asset valuations
          await db
            .update(integrations)
            .set({ statusMessage: "Holdings update available", lastSyncAt: new Date() })
            .where(eq(integrations.id, integration.id))
        }
        break
      }

      case "ITEM": {
        switch (webhook_code) {
          case "ERROR":
            // Connection error — mark integration
            console.error(
              `[plaid-webhook] Item error for ${item_id}: ${event.error?.error_message}`,
            )
            await db
              .update(integrations)
              .set({
                status: "error",
                statusMessage: event.error?.error_message ?? "Connection error",
              })
              .where(eq(integrations.id, integration.id))

            dispatchAlert({
              title: `Plaid connection error: ${integration.name}`,
              description: event.error?.error_message ?? "Connection error occurred.",
              severity: "warning",
              source: "plaid-webhook",
              orgId: integration.orgId,
              actionUrl: "/app/settings/integrations",
            }).catch(() => {})
            break

          case "PENDING_EXPIRATION":
            // Access is about to expire — user needs to re-authenticate
            console.warn(`[plaid-webhook] Pending expiration for ${item_id}`)
            await db
              .update(integrations)
              .set({
                statusMessage: "Bank login needs to be re-verified — click to reconnect",
              })
              .where(eq(integrations.id, integration.id))

            dispatchAlert({
              title: `Plaid login expiring: ${integration.name}`,
              description: "Bank login needs to be re-verified. Balances will stop syncing if not reconnected.",
              severity: "warning",
              source: "plaid-webhook",
              orgId: integration.orgId,
              actionUrl: "/app/settings/integrations",
            }).catch(() => {})
            break

          case "USER_PERMISSION_REVOKED":
            console.warn(`[plaid-webhook] User revoked permission for ${item_id}`)
            await db
              .update(integrations)
              .set({ status: "disconnected" })
              .where(eq(integrations.id, integration.id))
            break
        }
        break
      }

      default:
        console.log(`[plaid-webhook] Unhandled: ${webhook_type}.${webhook_code}`)
    }

    Sentry.addBreadcrumb({
      category: "webhook.plaid",
      message: `Plaid webhook processed: ${webhook_type}.${webhook_code}`,
      data: { itemId: item_id },
      level: "info",
    })
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[plaid-webhook] Processing error:", err)

    Sentry.withScope((scope) => {
      scope.setTag("webhook", "plaid")
      scope.setContext("webhook", { webhookType: webhook_type, webhookCode: webhook_code, itemId: item_id })
      scope.captureException(err instanceof Error ? err : new Error(String(err)))
    })

    dispatchAlert({
      title: "Plaid webhook processing failed",
      description: `Error: ${err instanceof Error ? err.message : String(err)}`,
      severity: "critical",
      source: "plaid-webhook",
    }).catch(() => {})

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
