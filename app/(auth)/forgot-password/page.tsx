"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/marketing/logo"
import { createClient } from "@/utils/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      // After clicking the email link, Supabase redirects to the callback
      // which exchanges the code and then forwards to /reset-password
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setIsLoading(false)
      return
    }

    setIsSubmitted(true)
    setIsLoading(false)
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
              Forgot your password?
            </h2>
            <p className="text-lg text-zinc-400 max-w-md">
              No worries. We&apos;ll send you secure instructions to reset your
              password and get you back to managing your portfolio.
            </p>

            {/* Security note */}
            <div className="mt-12 p-4 rounded-lg border border-zinc-800 bg-zinc-950/50">
              <p className="text-sm text-zinc-400">
                <span className="font-medium text-zinc-300">Security tip:</span>{" "}
                We&apos;ll never ask for your password via email. The reset link
                expires in 1 hour for your protection.
              </p>
            </div>
          </div>

          <p className="text-zinc-600 text-sm">
            Need help?{" "}
            <Link href="/contact" className="text-zinc-400 hover:text-zinc-300">
              Contact support
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-6 border-b border-zinc-800">
          <Link href="/">
            <Logo size="sm" />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {!isSubmitted ? (
              <>
                {/* Back link */}
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors mb-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>

                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                    Reset your password
                  </h1>
                  <p className="text-zinc-400">
                    Enter the email address associated with your account and
                    we&apos;ll send you a link to reset your password.
                  </p>
                </div>

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
                        autoFocus
                      />
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
                      "Send reset link"
                    )}
                  </Button>
                </form>

                <p className="mt-8 text-center text-sm text-zinc-500">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="text-tiffany-500 hover:text-tiffany-400 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              /* Success State */
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-tiffany-500/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-tiffany-500" />
                </div>

                <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                  Check your email
                </h1>
                <p className="text-zinc-400 mb-2">
                  We&apos;ve sent a password reset link to:
                </p>
                <p className="text-zinc-100 font-medium mb-6">{email}</p>

                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 text-left mb-8">
                  <p className="text-sm text-zinc-400">
                    <span className="font-medium text-zinc-300">
                      Didn&apos;t receive the email?
                    </span>{" "}
                    Check your spam folder, or make sure you entered the correct
                    email address.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                    onClick={() => {
                      setIsSubmitted(false)
                      setEmail("")
                    }}
                  >
                    Try a different email
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-11"
                    asChild
                  >
                    <Link href="/login">Back to sign in</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
