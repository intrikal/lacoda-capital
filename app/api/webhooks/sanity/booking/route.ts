import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { previewClient } from "@/lib/sanity/client"
import { getBookingRequestById } from "@/lib/sanity/fetch"
import {
  createBookingEvent,
  buildEndDateTime,
  isPersonalCalendarConfigured,
} from "@/lib/schedule/google-calendar"
import {
  sendConfirmationEmail,
  sendDenialEmail,
} from "@/lib/schedule/email"

/**
 * POST /api/webhooks/sanity/booking
 *
 * Sanity fires this when a bookingRequest document is updated.
 * We only act when status changes to "approved" or "denied".
 *
 * ── SANITY STUDIO SETUP ─────────────────────────────────────────────────────
 *
 * In your Sanity project dashboard (manage.sanity.io):
 *   1. Go to API → Webhooks → Add webhook
 *   2. Name: "Booking approval"
 *   3. URL: https://yoursite.vercel.app/api/webhooks/sanity/booking
 *   4. Dataset: production
 *   5. Trigger on: Update
 *   6. Filter: _type == "bookingRequest"
 *   7. Projections: {_id, status, name, email}  (or leave empty for full doc)
 *   8. Secret: set a random string → add to SANITY_WEBHOOK_SECRET env var
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

const WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET ?? ""

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!WEBHOOK_SECRET || !signatureHeader) return false

  // Sanity signature format: "v1,t=<timestamp>,v1=<hex-signature>"
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=")),
  )
  const timestamp = parts["t"]
  const signature = parts["v1"]
  if (!timestamp || !signature) return false

  const payload = `${timestamp}.${rawBody}`
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    )
  } catch {
    return false
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signatureHeader = req.headers.get("sanity-webhook-signature")

  if (!verifySignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: { _id?: string; status?: string }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { _id: requestId, status } = payload

  // Only act on approval/denial transitions
  if (!requestId || (status !== "approved" && status !== "denied")) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Fetch the full booking request (with slot details expanded)
  const booking = await getBookingRequestById(requestId)
  if (!booking) {
    console.error(`[sanity/booking] Booking request not found: ${requestId}`)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  // ── Approved ────────────────────────────────────────────────────────────────
  if (status === "approved") {
    const slot = booking.slot
    const endDateTime = buildEndDateTime(slot.dateTime, slot.duration)

    // Create Google Calendar event (best-effort — don't fail the whole request)
    if (isPersonalCalendarConfigured()) {
      try {
        await createBookingEvent({
          summary: `Call with ${booking.name}${booking.company ? ` (${booking.company})` : ""}`,
          description: booking.reason,
          startDateTime: slot.dateTime,
          endDateTime,
          attendeeEmail: booking.email,
        })
      } catch (err) {
        console.error("[sanity/booking] Google Calendar error:", err)
      }
    } else {
      console.warn(
        "[sanity/booking] PERSONAL_GOOGLE_REFRESH_TOKEN not set — skipping calendar event",
      )
    }

    // Mark slot as booked
    try {
      await previewClient
        .patch(slot._id)
        .set({ status: "booked" })
        .commit()
    } catch (err) {
      console.error("[sanity/booking] Failed to mark slot as booked:", err)
    }

    // Send confirmation email
    try {
      await sendConfirmationEmail({
        toEmail: booking.email,
        toName: booking.name,
        slotDateTime: slot.dateTime,
        slotDuration: slot.duration,
        slotLabel: slot.label,
      })
    } catch (err) {
      console.error("[sanity/booking] Confirmation email error:", err)
    }
  }

  // ── Denied ──────────────────────────────────────────────────────────────────
  if (status === "denied") {
    // Reopen the slot so someone else can request it
    try {
      await previewClient
        .patch(booking.slot._id)
        .set({ status: "available" })
        .commit()
    } catch (err) {
      console.error("[sanity/booking] Failed to reopen slot:", err)
    }

    // Send denial email
    try {
      await sendDenialEmail({
        toEmail: booking.email,
        toName: booking.name,
      })
    } catch (err) {
      console.error("[sanity/booking] Denial email error:", err)
    }
  }

  return NextResponse.json({ ok: true })
}
