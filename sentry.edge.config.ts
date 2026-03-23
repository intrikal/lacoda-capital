import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Gracefully handle missing DSN — app works without Sentry
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Lower sample rate for edge — runs on every request
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  beforeSend(event) {
    // Strip user PII on edge as well
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
    }
    return event;
  },
});
