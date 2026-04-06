"use server"

import { db } from "@/app/db"
import { contactSubmissions } from "@/app/db/schema"
import { contactFormSchema, demoFormSchema } from "@/lib/validations/contact.schema"
import type { ContactFormInput, DemoFormInput } from "@/lib/validations/contact.schema"

// ─── Result type ─────────────────────────────────────────────────────────────

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

// ─── Email helper (Resend via Supabase Edge Function) ────────────────────────
//
// Architecture:
//   Next.js server action
//     → POST /api/email (internal route wrapping Supabase Edge Function)
//     → Supabase Edge Function "send-email"
//     → Resend API
//
// If CONTACT_FORM_EMAIL is unset, email is skipped entirely and only the
// DB row is written. This lets the app work in dev without any email config.

async function sendEmailNotification(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Can't reach Supabase Edge Function — skip silently
    return
  }

  const edgeFnUrl = `${supabaseUrl}/functions/v1/send-email`

  const res = await fetch(edgeFnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ to, subject, html: body }),
  })

  if (!res.ok) {
    // Don't fail the whole action if email fails; the DB row is the source of truth.
    console.error("[contact.actions] send-email edge function error:", await res.text())
  }
}

function buildContactEmailHtml(input: ContactFormInput): string {
  return `
    <h2>New Contact Form Submission</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><strong>Name</strong></td><td>${input.firstName} ${input.lastName}</td></tr>
      <tr><td><strong>Email</strong></td><td>${input.email}</td></tr>
      ${input.company ? `<tr><td><strong>Company</strong></td><td>${input.company}</td></tr>` : ""}
      <tr><td><strong>Subject</strong></td><td>${input.subject}</td></tr>
      ${input.reason ? `<tr><td><strong>Topic</strong></td><td>${input.reason}</td></tr>` : ""}
      <tr><td><strong>Message</strong></td><td style="white-space:pre-wrap">${input.message}</td></tr>
    </table>
  `
}

function buildDemoEmailHtml(input: DemoFormInput): string {
  return `
    <h2>New Demo Request</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><strong>Name</strong></td><td>${input.firstName} ${input.lastName}</td></tr>
      <tr><td><strong>Email</strong></td><td>${input.email}</td></tr>
      <tr><td><strong>Company</strong></td><td>${input.company}</td></tr>
      ${input.aum ? `<tr><td><strong>AUM Range</strong></td><td>${input.aum}</td></tr>` : ""}
      ${input.role ? `<tr><td><strong>Role</strong></td><td>${input.role}</td></tr>` : ""}
      ${input.preferredDate ? `<tr><td><strong>Preferred Date</strong></td><td>${input.preferredDate}</td></tr>` : ""}
      ${input.preferredTime ? `<tr><td><strong>Preferred Time</strong></td><td>${input.preferredTime}</td></tr>` : ""}
    </table>
  `
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function submitContactForm(raw: unknown): Promise<ActionResult> {
  const parsed = contactFormSchema.safeParse(raw)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid form data"
    return { success: false, error: message }
  }

  const input = parsed.data

  try {
    await db.insert(contactSubmissions).values({
      type: "contact",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      company: input.company ?? null,
      subject: input.subject,
      reason: input.reason ?? null,
      message: input.message,
    })
  } catch (err) {
    console.error("[contact.actions] DB insert failed:", err)
    return { success: false, error: "Something went wrong. Please try again." }
  }

  const recipientEmail = process.env.CONTACT_FORM_EMAIL
  if (recipientEmail) {
    await sendEmailNotification(
      recipientEmail,
      `[Lacoda] Contact: ${input.subject}`,
      buildContactEmailHtml(input)
    )
  }

  return { success: true }
}

export async function submitDemoForm(raw: unknown): Promise<ActionResult> {
  const parsed = demoFormSchema.safeParse(raw)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid form data"
    return { success: false, error: message }
  }

  const input = parsed.data

  try {
    await db.insert(contactSubmissions).values({
      type: "demo",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      company: input.company ?? null,
      aum: input.aum ?? null,
      role: input.role ?? null,
      preferredDate: input.preferredDate ?? null,
      preferredTime: input.preferredTime ?? null,
    })
  } catch (err) {
    console.error("[contact.actions] DB insert failed:", err)
    return { success: false, error: "Something went wrong. Please try again." }
  }

  const recipientEmail = process.env.CONTACT_FORM_EMAIL
  if (recipientEmail) {
    const modeLabel = input.preferredDate ? "Calendar Booking" : "Demo Request"
    await sendEmailNotification(
      recipientEmail,
      `[Lacoda] ${modeLabel}: ${input.firstName} ${input.lastName} — ${input.company}`,
      buildDemoEmailHtml(input)
    )
  }

  return { success: true }
}
