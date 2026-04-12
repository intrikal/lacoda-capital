import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "*.supabase.co";

const ContentSecurityPolicy = [
  // Only allow loading the page itself from the same origin
  `default-src 'self'`,
  // Scripts: self + PostHog (analytics) + Stripe.js + Plaid Link
  `script-src 'self' 'unsafe-inline' https://us.i.posthog.com https://js.stripe.com https://cdn.plaid.com`,
  // Styles: self + inline (needed by many UI libs)
  `style-src 'self' 'unsafe-inline'`,
  // Images: self + data URIs + PostHog + Stripe + Supabase storage
  `img-src 'self' data: blob: https://us.i.posthog.com https://${supabaseHost}`,
  // Fonts: self
  `font-src 'self'`,
  // API/XHR/fetch: self + PostHog + Supabase + Sentry + Stripe + Plaid
  `connect-src 'self' https://us.i.posthog.com https://${supabaseHost} https://*.sentry.io https://api.stripe.com https://production.plaid.com https://sandbox.plaid.com https://development.plaid.com`,
  // Frames: Stripe Elements + Plaid Link iframe (must allow these, deny everything else)
  `frame-src https://js.stripe.com https://hooks.stripe.com https://cdn.plaid.com`,
  // Workers: self + blob (Sentry uses blob workers)
  `worker-src 'self' blob:`,
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
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
