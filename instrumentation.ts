import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import Sentry server config for Node.js runtime
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Import Sentry edge config for Edge runtime (middleware, edge API routes)
    await import("./sentry.edge.config");
  }
}

// Capture server-side request errors in Sentry (Next.js instrumentation hook)
export const onRequestError = Sentry.captureRequestError;
