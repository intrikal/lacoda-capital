/**
 * Booking Email Helpers — powered by Resend
 *
 * Sends two types of emails:
 *   • Confirmation: when you approve a request (slot is booked, invite incoming)
 *   • Denial: when you deny a request (polite decline)
 *
 * ENV VARS NEEDED:
 *   RESEND_API_KEY      — from resend.com dashboard
 *   RESEND_FROM_EMAIL   — e.g. "Your Name <you@yourdomain.com>"
 *                         Must be a verified domain in Resend.
 *                         During testing you can use: onboarding@resend.dev
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ""
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Resend API error: ${error}`)
  }
}

// ── Confirmation Email ────────────────────────────────────────────────────────

interface ConfirmationEmailInput {
  toEmail: string
  toName: string
  slotDateTime: string // ISO 8601
  slotDuration: number // minutes
  slotLabel?: string
}

export async function sendConfirmationEmail(
  input: ConfirmationEmailInput,
): Promise<void> {
  const date = new Date(input.slotDateTime).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })

  const callType = input.slotLabel ?? `${input.slotDuration}-minute call`

  await sendEmail({
    to: input.toEmail,
    subject: "Your call is confirmed",
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
        <p>Hi ${input.toName},</p>
        <p>
          Your request has been approved. You should receive a Google Calendar
          invite shortly with the call details.
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
          <p style="margin: 0 0 4px; font-weight: 600;">${callType}</p>
          <p style="margin: 0; color: #52525b;">${date}</p>
        </div>
        <p>Looking forward to connecting.</p>
      </div>
    `,
  })
}

// ── Denial Email ─────────────────────────────────────────────────────────────

interface DenialEmailInput {
  toEmail: string
  toName: string
}

export async function sendDenialEmail(
  input: DenialEmailInput,
): Promise<void> {
  await sendEmail({
    to: input.toEmail,
    subject: "Re: Your call request",
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
        <p>Hi ${input.toName},</p>
        <p>
          Thank you for reaching out. Unfortunately I'm not able to take on any
          new conversations at this time.
        </p>
        <p>I appreciate your interest and wish you the best.</p>
      </div>
    `,
  })
}
