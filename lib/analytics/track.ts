/**
 * PostHog event tracking helpers.
 *
 * Track: page views (auto), feature events (asset.created, document.uploaded,
 * report.generated, search.performed). Identify by org_id + user_id only — NO PII.
 *
 * Do NOT track on /demo/* routes.
 */

import posthog from "posthog-js"

function isDemo(): boolean {
  if (typeof window === "undefined") return false
  return window.location.pathname.startsWith("/demo")
}

function safeCapture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return
  if (isDemo()) return
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}

/**
 * Identify the current user — called after auth is resolved.
 * Only sends org_id and user_id. NO email, name, or financial data.
 */
export function identifyUser(userId: string, orgId: string) {
  if (typeof window === "undefined") return
  if (isDemo()) return
  if (!posthog.__loaded) return
  posthog.identify(userId, { org_id: orgId })
}

/**
 * Reset identity on logout.
 */
export function resetIdentity() {
  if (typeof window === "undefined") return
  if (!posthog.__loaded) return
  posthog.reset()
}

// ─── Feature Events ──────────────────────────────────────────────────────────

export function trackAssetCreated(assetClass: string) {
  safeCapture("asset.created", { asset_class: assetClass })
}

export function trackDocumentUploaded(documentType?: string) {
  safeCapture("document.uploaded", { document_type: documentType })
}

export function trackReportGenerated(reportType: string) {
  safeCapture("report.generated", { report_type: reportType })
}

export function trackSearchPerformed(query: string, resultCount: number) {
  safeCapture("search.performed", {
    query_length: query.length,
    result_count: resultCount,
  })
}

export function trackComplianceControlCreated(framework?: string) {
  safeCapture("compliance.control.created", { framework })
}

export function trackEvidenceLinked(controlCode: string) {
  safeCapture("compliance.evidence.linked", { control_code: controlCode })
}

export function trackIntegrationConnected(provider: string) {
  safeCapture("integration.connected", { provider })
}

export function trackSubscriptionUpgradeClicked(plan: string) {
  safeCapture("subscription.upgrade_clicked", { plan })
}

export function trackClientCreated() {
  safeCapture("client.created")
}

export function trackTaskCompleted() {
  safeCapture("task.completed")
}

// ─── Marketing Funnel Events ─────────────────────────────────────────────────

export function trackHomepageCtaClicked(cta: string, location: string) {
  safeCapture("marketing.homepage_cta_clicked", { cta, location })
}
