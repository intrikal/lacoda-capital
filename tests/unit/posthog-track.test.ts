import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock posthog-js
vi.mock("posthog-js", () => {
  const capture = vi.fn()
  const identify = vi.fn()
  const reset = vi.fn()

  return {
    default: {
      __loaded: true,
      capture,
      identify,
      reset,
      init: vi.fn(),
    },
    __esModule: true,
  }
})

// Must import after mock
import posthog from "posthog-js"
import {
  trackAssetCreated,
  trackDocumentUploaded,
  trackReportGenerated,
  trackSearchPerformed,
  identifyUser,
  resetIdentity,
} from "@/lib/analytics/track"

describe("PostHog tracking helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location for non-demo routes
    Object.defineProperty(window, "location", {
      value: { pathname: "/app/dashboard" },
      writable: true,
    })
  })

  it("fires asset.created event on asset creation", () => {
    trackAssetCreated("real_estate")
    expect(posthog.capture).toHaveBeenCalledWith("asset.created", {
      asset_class: "real_estate",
    })
  })

  it("fires document.uploaded event", () => {
    trackDocumentUploaded("passport")
    expect(posthog.capture).toHaveBeenCalledWith("document.uploaded", {
      document_type: "passport",
    })
  })

  it("fires report.generated event", () => {
    trackReportGenerated("portfolio_summary")
    expect(posthog.capture).toHaveBeenCalledWith("report.generated", {
      report_type: "portfolio_summary",
    })
  })

  it("fires search.performed with query length, not the query itself (no PII)", () => {
    trackSearchPerformed("John Smith", 5)
    expect(posthog.capture).toHaveBeenCalledWith("search.performed", {
      query_length: 10,
      result_count: 5,
    })
    // Verify the actual query string is NOT in the captured properties
    const capturedArgs = (posthog.capture as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(capturedArgs).not.toHaveProperty("query")
  })

  it("identifies user with userId and orgId only — no PII", () => {
    identifyUser("user-123", "org-456")
    expect(posthog.identify).toHaveBeenCalledWith("user-123", {
      org_id: "org-456",
    })
    // Verify no email or name in identify call
    const identifyProps = (posthog.identify as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(identifyProps).not.toHaveProperty("email")
    expect(identifyProps).not.toHaveProperty("name")
  })

  it("does NOT fire events on demo routes", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/demo/app/dashboard" },
      writable: true,
    })

    trackAssetCreated("equities")
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it("does NOT identify users on demo routes", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/demo/app" },
      writable: true,
    })

    identifyUser("user-123", "org-456")
    expect(posthog.identify).not.toHaveBeenCalled()
  })
})
