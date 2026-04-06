import { NextResponse } from "next/server"

/**
 * POST /api/v1/booking
 * Booking system has been removed. This endpoint is no longer active.
 */
export function POST() {
  return NextResponse.json({ error: "Booking is not available." }, { status: 501 })
}
