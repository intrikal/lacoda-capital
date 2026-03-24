import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during build
  silent: true,

  // Upload source maps to Sentry for better stack traces
  // Requires SENTRY_AUTH_TOKEN env var in CI
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source maps and logger config moved to webpack-specific options
  sourcemaps: {
    disable: !process.env.CI,
  },

});
