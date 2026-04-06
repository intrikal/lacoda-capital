"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/marketing/logo"
import { loginAction, getOAuthUrlAction } from "@/lib/actions/auth.actions"
import { checkDomainSso } from "@/lib/actions/sso.actions"

// Social login icons
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M11.4 24H0V12.6h11.4V24z" fill="#00A4EF"/>
      <path d="M24 24H12.6V12.6H24V24z" fill="#FFB900"/>
      <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#F25022"/>
      <path d="M24 11.4H12.6V0H24v11.4z" fill="#7FBA00"/>
    </svg>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? undefined
  const authError = searchParams.get("error")

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState(
    authError === "auth_failed" ? "Authentication failed. Please try again." :
    authError === "link_expired" ? "This link has expired. Please request a new one." :
    ""
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Check if this email domain has SSO enforced
    const ssoResult = await checkDomainSso(email)
    if (ssoResult.enforced) {
      setError("Your organization requires single sign-on (SSO). Please use the SSO login button or contact your IT admin.")
      setIsLoading(false)
      return
    }

    const result = await loginAction(email, password, next)
    // If we reach here, the action returned an error (redirect throws, not returns)
    if ("error" in result) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: "google" | "azure") => {
    setIsLoading(true)
    const result = await getOAuthUrlAction(provider)
    if ("error" in result) {
      setError(result.error)
      setIsLoading(false)
      return
    }
    window.location.href = result.url
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-900 relative flex-col">
        {/* Dot pattern background */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-tiffany-500/5 via-transparent to-cyan-500/5" />

        <div className="relative z-10 flex flex-col h-full p-10">
          <Link href="/">
            <Logo size="md" />
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-bold text-zinc-100 mb-4">
              Welcome back.
            </h2>
            <p className="text-lg text-zinc-400 max-w-md">
              Access your unified portfolio dashboard and manage your assets
              with enterprise-grade security.
            </p>

            {/* Feature highlights */}
            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-8 h-8 rounded-lg bg-tiffany-500/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-tiffany-500" />
                </div>
                <span>Bank-level encryption</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-8 h-8 rounded-lg bg-tiffany-500/10 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-tiffany-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <span>Audit trail on every action</span>
              </div>
            </div>
          </div>

          <p className="text-zinc-600 text-sm">
            Trusted by leading institutions and asset managers
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-6 border-b border-zinc-800">
          <Link href="/">
            <Logo size="sm" />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                Sign in to your account
              </h1>
              <p className="text-zinc-400">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-tiffany-500 hover:text-tiffany-400 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                onClick={() => handleSocialLogin("google")}
                disabled={isLoading}
              >
                <GoogleIcon className="w-5 h-5 mr-3" />
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                onClick={() => handleSocialLogin("azure")}
                disabled={isLoading}
              >
                <MicrosoftIcon className="w-5 h-5 mr-3" />
                Continue with Microsoft
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-zinc-950 px-4 text-zinc-500">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-tiffany-500 hover:text-tiffany-400 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-tiffany-500 to-cyan-500 hover:from-tiffany-600 hover:to-cyan-600 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Demo Access */}
            <div className="mt-8 rounded-lg border border-dashed border-zinc-700 p-4">
              <p className="text-xs font-medium text-zinc-400 text-center mb-3">
                Demo Access
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-sm"
                  onClick={() => window.location.href = "/demo/app"}
                  disabled={isLoading}
                >
                  Admin Dashboard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-sm"
                  onClick={() => window.location.href = "/demo/client"}
                  disabled={isLoading}
                >
                  Client Portal
                </Button>
              </div>
              <p className="text-[10px] text-zinc-600 text-center mt-2">
                Demo mode — no account required. Sign up to use real data.
              </p>
            </div>

            <p className="mt-8 text-center text-xs text-zinc-500">
              By signing in, you agree to our{" "}
              <Link
                href="/terms"
                className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  )
}
