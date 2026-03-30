import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { exchangeAuthCode, connectGoogleCalendar } from "@/lib/integrations/google-calendar"

/**
 * Google Calendar OAuth Callback
 *
 * After the user authorizes calendar access in Google's consent screen,
 * Google redirects here with ?code=...&state=...
 *
 * - state = orgId (set in getAuthorizationUrl)
 * - code  = authorization code to exchange for tokens
 *
 * FLOW:
 *   Google consent → redirect here → exchange code → store tokens → redirect to integrations page
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state") // orgId
  const error = searchParams.get("error")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const integrationsUrl = `${siteUrl}/app/integrations`

  // User denied consent
  if (error) {
    console.log(`[google-calendar-callback] User denied consent: ${error}`)
    return NextResponse.redirect(`${integrationsUrl}?error=google_calendar_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${integrationsUrl}?error=google_calendar_missing_params`)
  }

  try {
    const redirectUri = `${siteUrl}/api/webhooks/google-calendar/callback`
    const tokens = await exchangeAuthCode(code, redirectUri)

    // state = orgId. connectedBy would ideally come from the session,
    // but in the callback we don't have cookie-based auth easily.
    // For now, pass orgId as state and use a placeholder for connectedBy.
    // The integration.actions.ts flow sets the session before redirecting,
    // so we extract orgId from state.
    await connectGoogleCalendar(state, state, tokens)

    Sentry.addBreadcrumb({
      category: "integration",
      message: "Google Calendar connected via OAuth callback",
      data: { orgId: state },
      level: "info",
    })
    return NextResponse.redirect(`${integrationsUrl}?success=google_calendar`)
  } catch (err) {
    console.error("[google-calendar-callback] Error:", err)
    Sentry.withScope((scope) => {
      scope.setTag("webhook", "google-calendar-callback")
      scope.setContext("webhook", { orgId: state })
      scope.captureException(err instanceof Error ? err : new Error(String(err)))
    })
    return NextResponse.redirect(`${integrationsUrl}?error=google_calendar_failed`)
  }
}
