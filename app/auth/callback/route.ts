import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Platform admins — bypass the advisor onboarding wizard entirely
const PLATFORM_ADMINS = ["alvinwquach@gmail.com", "binarydecisions1111@gmail.com"]

// Advisors — go through the onboarding wizard on first sign-in
const ADVISORS: string[] = []

// All emails allowed on the platform
const ALLOWED_EMAILS = [...PLATFORM_ADMINS, ...ADVISORS]

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Optional: where to redirect after successful auth (defaults to /app)
  const next = searchParams.get("next") ?? "/app"

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin))
  }

  const supabase = await createClient()

  // Exchange the one-time code for a session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=auth_error", origin))
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Access gate — sign out anyone not on the allowed list
  if (!user || !ALLOWED_EMAILS.includes(user.email ?? "")) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/unauthorized", origin))
  }

  // Everyone goes through the onboarding walkthrough on their first sign-in
  const onboardingComplete = user.user_metadata?.onboarding_completed
  if (!onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
