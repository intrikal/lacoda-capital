"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/marketing/logo"
import { createClient } from "@/utils/supabase/client"

// Keep in sync with app/auth/callback/route.ts
const PLATFORM_ADMINS = ["alvinwquach@gmail.com", "binarydecisions1111@gmail.com"]
const ADVISORS: string[] = []
const ALLOWED_EMAILS = [...PLATFORM_ADMINS, ...ADVISORS]

// Password strength checker
function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" }
  if (score <= 2) return { score, label: "Fair", color: "bg-yellow-500" }
  if (score <= 3) return { score, label: "Good", color: "bg-tiffany-500" }
  return { score, label: "Strong", color: "bg-green-500" }
}

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

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [agreedToTerms, setAgreedToTerms] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [emailSent, setEmailSent] = React.useState(false)

  const passwordStrength = getPasswordStrength(formData.password)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the terms"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // Access gate — block non-allowed emails before calling Supabase
    if (!ALLOWED_EMAILS.includes(formData.email)) {
      setErrors({ email: "Access restricted. Only authorized users can create an account." })
      return
    }

    setIsLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { full_name: formData.fullName },
        // After email confirmation, Supabase redirects here to exchange the code.
        // The callback handles admin vs advisor routing automatically.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setErrors({ submit: authError.message })
      setIsLoading(false)
      return
    }

    // If email confirmation is disabled in Supabase, session is returned immediately.
    // Everyone goes through the onboarding walkthrough on first sign-in.
    if (data.session) {
      router.push("/onboarding")
      return
    }

    // Otherwise show the "check your email" screen
    setEmailSent(true)
  }

  const handleSocialSignup = async (provider: "google" | "azure") => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    // OAuth redirects the browser — no further handling needed here
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-tiffany-500/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-tiffany-500" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-3">Check your email</h1>
          <p className="text-zinc-400 mb-2">
            We sent a confirmation link to{" "}
            <span className="text-zinc-200 font-medium">{formData.email}</span>
          </p>
          <p className="text-zinc-500 text-sm">
            Click the link in the email to activate your account and continue to onboarding.
          </p>
        </div>
      </div>
    )
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
              Start your journey<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-tiffany-500 to-cyan-500">
                to unified wealth.
              </span>
            </h2>
            <p className="text-lg text-zinc-400 max-w-md">
              Join leading institutions and asset managers who trust Lacoda
              to manage their portfolios.
            </p>

            {/* Benefits list */}
            <div className="mt-12 space-y-4">
              {[
                "Free 14-day trial, no credit card required",
                "Setup in under 5 minutes",
                "Cancel anytime",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 text-zinc-400">
                  <div className="w-5 h-5 rounded-full bg-tiffany-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-tiffany-500" />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-zinc-600 text-sm">
            Enterprise-grade security for your most valuable assets
          </p>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
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
                Create your account
              </h1>
              <p className="text-zinc-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-tiffany-500 hover:text-tiffany-400 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                onClick={() => handleSocialSignup("google")}
                disabled={isLoading}
              >
                <GoogleIcon className="w-5 h-5 mr-3" />
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                onClick={() => handleSocialSignup("azure")}
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

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Smith"
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    className={cn("pl-10 h-11", errors.fullName && "border-red-500")}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-red-400">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={cn("pl-10 h-11", errors.email && "border-red-500")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className={cn("pl-10 pr-10 h-11", errors.password && "border-red-500")}
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
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password}</p>
                )}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            i <= passwordStrength.score
                              ? passwordStrength.color
                              : "bg-zinc-800"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500">
                      Password strength:{" "}
                      <span className={cn(
                        passwordStrength.score <= 1 && "text-red-400",
                        passwordStrength.score === 2 && "text-yellow-400",
                        passwordStrength.score === 3 && "text-tiffany-400",
                        passwordStrength.score >= 4 && "text-green-400"
                      )}>
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    className={cn(
                      "pl-10 pr-10 h-11",
                      errors.confirmPassword && "border-red-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-400">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) =>
                      setAgreedToTerms(checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm text-zinc-400 font-normal leading-relaxed cursor-pointer"
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-tiffany-500 hover:text-tiffany-400 underline underline-offset-2"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-tiffany-500 hover:text-tiffany-400 underline underline-offset-2"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.terms && (
                  <p className="text-sm text-red-400">{errors.terms}</p>
                )}
              </div>

              {errors.submit && (
                <p className="text-sm text-red-400">{errors.submit}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-tiffany-500 to-cyan-500 hover:from-tiffany-600 hover:to-cyan-600 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
