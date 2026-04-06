import { pgEnum, pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

/** Distinguishes a general contact message from a demo booking request. */
export const contactSubmissionTypeEnum = pgEnum("contact_submission_type", [
  "contact",
  "demo",
]);

/**
 * contact_submissions — marketing-form submissions from unauthenticated visitors.
 *
 * Used as the fallback store when Resend / email is not configured, and also
 * as a permanent audit record of every inbound inquiry regardless of email.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Visitor fills form → server action → insert row + (maybe) email   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * No org-scoping: submissions arrive before any user account exists.
 */
export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** "contact" | "demo" */
    type: contactSubmissionTypeEnum("type").notNull(),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    company: text("company"),

    // ── contact-specific ──────────────────────────────────────────────
    subject: text("subject"),
    reason: text("reason"), // demo | sales | support | partnership | press | other
    message: text("message"),

    // ── demo-specific ─────────────────────────────────────────────────
    /** AUM range bucket selected in the demo form (e.g. "50-100"). */
    aum: text("aum"),
    /** Role selected in the demo form (e.g. "cfo"). */
    role: text("role"),
    /** For calendar-mode bookings: ISO date string "YYYY-MM-DD". */
    preferredDate: text("preferred_date"),
    /** For calendar-mode bookings: time slot string "10:00 AM". */
    preferredTime: text("preferred_time"),

    /** Extra fields without a dedicated column (future-proofing). */
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contact_submissions_email_idx").on(t.email),
    index("contact_submissions_type_idx").on(t.type),
    index("contact_submissions_created_at_idx").on(t.createdAt),
  ]
);

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type NewContactSubmission = typeof contactSubmissions.$inferInsert;
