import { NextRequest, NextResponse } from "next/server"
import { previewClient } from "@/lib/sanity/client"
import { getSlotById } from "@/lib/sanity/fetch"
import { bookingRequestSchema } from "@/lib/validations/booking.schema"

/**
 * POST /api/v1/booking
 *
 * Receives a booking request from the public schedule form.
 *
 * Steps:
 *   1. Validate request body with Zod
 *   2. Check the slot is still "available" (guard against race conditions)
 *   3. Create a bookingRequest document in Sanity (status: "pending")
 *   4. Patch the slot to status: "pending" (hides it from the form)
 *   5. Return 201
 *
 * After this, you review the request in Sanity Studio and set the status
 * to "approved" or "denied". A webhook fires to /api/webhooks/sanity/booking.
 */

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Validate
  const parsed = bookingRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    )
  }

  const { name, email, company, reason, slotId } = parsed.data

  // Confirm slot is still available
  const slot = await getSlotById(slotId)
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  }
  if (slot.status !== "available") {
    return NextResponse.json(
      { error: "This slot is no longer available. Please choose another." },
      { status: 409 },
    )
  }

  try {
    // Create the booking request document
    await previewClient.create({
      _type: "bookingRequest",
      name,
      email,
      company: company ?? null,
      reason,
      status: "pending",
      submittedAt: new Date().toISOString(),
      slot: {
        _type: "reference",
        _ref: slotId,
      },
    })

    // Mark the slot as pending so no one else can grab it
    await previewClient
      .patch(slotId)
      .set({ status: "pending" })
      .commit()

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error("[booking/POST] Sanity write error:", err)
    return NextResponse.json(
      { error: "Failed to save request. Please try again." },
      { status: 500 },
    )
  }
}
