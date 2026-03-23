import * as Sentry from "@sentry/nextjs";

// ─── PII fields to strip from error reports ────────────────────────
// Financial platform — never send user emails or financial data to Sentry
const PII_KEYS = new Set([
  "email",
  "user_email",
  "userEmail",
  "password",
  "ssn",
  "social_security",
  "account_number",
  "accountNumber",
  "routing_number",
  "routingNumber",
  "credit_card",
  "creditCard",
  "balance",
  "net_worth",
  "netWorth",
  "salary",
  "income",
]);

function stripPii(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (PII_KEYS.has(key)) {
      cleaned[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = stripPii(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Gracefully handle missing DSN — app works without Sentry
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay for debugging — 1% of sessions, 100% on error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Strip PII before sending to Sentry
  beforeSend(event) {
    // Remove user email if captured
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
    }

    // Strip PII from extra context
    if (event.extra) {
      event.extra = stripPii(event.extra as Record<string, unknown>);
    }

    // Strip PII from breadcrumb data
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => {
        if (crumb.data) {
          crumb.data = stripPii(crumb.data as Record<string, unknown>);
        }
        return crumb;
      });
    }

    return event;
  },
});
