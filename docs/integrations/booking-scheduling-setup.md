# Booking & Scheduling System Setup Guide

The booking system allows prospective clients to request time slots, which you review in Sanity Studio, then automatically creates Google Calendar events and sends confirmation emails on approval.

> **Status:** The public booking API (`POST /api/v1/booking`) is currently disabled (returns 501). The demo request form at `/demo` uses a simpler contact submission flow. See the "Re-enabling" section below to activate the full booking pipeline.

---

## Architecture

```
Public booking form
  → POST /api/v1/booking
  → Validates with Zod (bookingRequestSchema)
  → Creates bookingRequest doc in Sanity (status: pending)
  → Updates slot status: available → pending

Advisor reviews in Sanity Studio
  → Sets status to "approved" or "denied"
  → Sanity fires webhook on save

Webhook handler (/api/webhooks/sanity/booking)
  → Verifies HMAC-SHA256 signature
  → If approved:
      → Creates Google Calendar event (attendee gets invite)
      → Updates slot: pending → booked
      → Sends confirmation email via Resend
  → If denied:
      → Reopens slot: pending → available
      → Sends polite decline email
```

---

## 1. Sanity CMS Setup

You need two document types registered in your Sanity Studio:

### Availability Slot (`lib/sanity/schemas/availability-slot.ts`)

| Field | Type | Notes |
|-------|------|-------|
| `dateTime` | datetime | Slot start time |
| `duration` | number | 15, 30, 45, or 60 minutes |
| `label` | string? | e.g. "Discovery Call" |
| `status` | enum | `available → pending → booked` |

### Booking Request (`lib/sanity/schemas/booking-request.ts`)

| Field | Type | Notes |
|-------|------|-------|
| `name` | string (readonly) | Requester's name |
| `email` | string (readonly) | Requester's email |
| `company` | string (readonly) | Company name |
| `reason` | text (readonly) | Why they want to connect |
| `slot` | reference | Points to an availability slot |
| `status` | enum | `pending → approved / denied` |
| `internalNotes` | text | Your private notes |

Register both schemas in your Sanity Studio configuration.

---

## 2. Sanity Webhook

Configure in Sanity Dashboard:

1. Go to **Manage** > your project > **API** > **Webhooks**
2. Create a new webhook:
   - **Name:** Booking approval
   - **URL:** `https://your-domain.com/api/webhooks/sanity/booking`
   - **Dataset:** production
   - **Trigger on:** Update
   - **Filter:** `_type == "bookingRequest"`
   - **Secret:** Generate a random string
3. Copy the secret

### Add to `.env`

```env
SANITY_WEBHOOK_SECRET=your-random-secret
```

The webhook handler verifies signatures using HMAC-SHA256 with timing-safe comparison.

---

## 3. Email Integration

Booking confirmation and denial emails are sent via Resend through the `send-email` Edge Function.

| File | Purpose |
|------|---------|
| `lib/schedule/email.ts` | `sendConfirmationEmail()` and `sendDenialEmail()` |

Confirmation emails include:
- Approval message
- Call details (date, time, duration)
- Note about incoming Google Calendar invite

### Required env var

```bash
# Set as Supabase secret (not in .env):
npx supabase secrets set RESEND_API_KEY=re_xxx
```

---

## 4. Google Calendar (Personal)

When a booking is approved, an event is created on your personal Google Calendar and the requester receives a calendar invite.

This uses `lib/schedule/google-calendar.ts` (separate from the per-org Google Calendar integration).

Follow the **Personal Calendar** section in [google-calendar-setup.md](google-calendar-setup.md#6-personal-calendar-for-booking-confirmations) to set up:

```env
PERSONAL_GOOGLE_REFRESH_TOKEN=1//your-refresh-token
PERSONAL_GOOGLE_CALENDAR_ID=primary
```

If not configured, bookings will still be approved and emails sent — just no calendar event is created.

---

## 5. Environment Variables

| Variable | Required | Where |
|----------|----------|-------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Yes | `.env` |
| `NEXT_PUBLIC_SANITY_DATASET` | Yes | `.env` |
| `SANITY_API_TOKEN` | Yes | `.env` |
| `SANITY_WEBHOOK_SECRET` | Yes | `.env` |
| `RESEND_API_KEY` | Yes | Supabase secret |
| `GOOGLE_CLIENT_ID` | For calendar | `.env` |
| `GOOGLE_CLIENT_SECRET` | For calendar | `.env` |
| `PERSONAL_GOOGLE_REFRESH_TOKEN` | For calendar | `.env` |
| `PERSONAL_GOOGLE_CALENDAR_ID` | For calendar | `.env` |

---

## 6. Key Files

| File | Purpose |
|------|---------|
| `app/api/v1/booking/route.ts` | Public booking API (currently 501) |
| `app/api/webhooks/sanity/booking/route.ts` | Webhook handler for approval/denial |
| `lib/schedule/email.ts` | Confirmation/denial email templates |
| `lib/schedule/google-calendar.ts` | Personal calendar event creation |
| `lib/validations/booking.schema.ts` | Zod validation schema |
| `lib/sanity/schemas/availability-slot.ts` | Sanity slot schema |
| `lib/sanity/schemas/booking-request.ts` | Sanity request schema |
| `lib/sanity/queries.ts` | GROQ queries for slots/requests |
| `lib/sanity/fetch.ts` | Typed fetch functions |
| `components/schedule/booking-request-form.tsx` | React booking form component |

---

## 7. Re-enabling the Full Booking System

The booking API currently returns 501. To activate:

1. Restore the implementation in `app/api/v1/booking/route.ts` (check git history, commit `5ac0b9a`)
2. Create a public schedule page (e.g. `app/(marketing)/schedule/page.tsx`) that renders `<BookingRequestForm slots={...} />`
3. Register Sanity schemas in your Sanity Studio
4. Configure the webhook in Sanity Dashboard
5. Set all env vars listed above
6. Create availability slots in Sanity Studio

---

## 8. Current Demo Form (Active Alternative)

The demo request form at `/demo` currently uses a simpler flow:

1. User fills name/email/company form
2. `submitDemoForm` server action validates with `demoFormSchema`
3. Writes to `contactSubmissions` table (type: "demo")
4. Sends notification email to `CONTACT_FORM_EMAIL`

This does NOT interact with Sanity slots or the booking system.
