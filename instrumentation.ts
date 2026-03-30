import * as Sentry from "@sentry/nextjs";
import { validateEnv } from "./lib/validate-env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import Sentry server config for Node.js runtime
    await import("./sentry.server.config");

    // Validate environment variables — throws on missing required vars,
    // warns on missing optional ones. Node.js only (edge functions have
    // different env var access patterns and a restricted runtime).
    validateEnv();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Import Sentry edge config for Edge runtime (middleware, edge API routes)
    await import("./sentry.edge.config");
  }
}

// Capture server-side request errors in Sentry (Next.js instrumentation hook)
export const onRequestError = Sentry.captureRequestError;
