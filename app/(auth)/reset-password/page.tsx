"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/marketing/logo"

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

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [tokenValid, setTokenValid] = React.useState(true)

  const passwordStrength = getPasswordStrength(password)

  // Simulate token validation
  React.useEffect(() => {
    // In production, validate token with API
    // For demo, we'll consider it valid if present
    if (!token) {
      setTokenValid(false)
    }
  }, [token])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSuccess(true)
    setIsLoading(false)
  }

  // Invalid/expired token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-zinc-950 flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-[45%] bg-zinc-900 relative flex-col">
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-tiffany-500/5 via-transparent to-cyan-500/5" />

          <div className="relative z-10 flex flex-col h-full p-10">
            <Link href="/">
              <Logo size="md" />
            </Link>

            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-4xl font-bold text-zinc-100 mb-4">
                Reset link expired
              </h2>
              <p className="text-lg text-zinc-400 max-w-md">
                For your security, password reset links expire after 1 hour.
                Please request a new link to continue.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Error State */}
        <div className="flex-1 flex flex-col">
          <div className="lg:hidden p-6 border-b border-zinc-800">
            <Link href="/">
              <Logo size="sm" />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-md text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>

              <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                Invalid or expired link
              </h1>
              <p className="text-zinc-400 mb-8">
                This password reset link is invalid or has expired. Please
                request a new one to reset your password.
              </p>

              <div className="space-y-3">
                <Button
                  className="w-full h-11 bg-gradient-to-r from-tiffany-500 to-cyan-500 hover:from-tiffany-600 hover:to-cyan-600 text-white font-medium"
                  asChild
                >
                  <Link href="/forgot-password">Request new link</Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-11"
                  asChild
                >
                  <Link href="/login">Back to sign in</Link>
                </Button>
              </div>
            </div>
          </div>
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
              Create a new password
            </h2>
            <p className="text-lg text-zinc-400 max-w-md">
              Choose a strong password to keep your account secure. We recommend
              using a mix of letters, numbers, and symbols.
            </p>

            {/* Password tips */}
            <div className="mt-12 space-y-3">
              <p className="text-sm font-medium text-zinc-300">
                Strong password tips:
              </p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-tiffany-500" />
                  At least 8 characters long
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-tiffany-500" />
                  Mix of uppercase and lowercase letters
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-tiffany-500" />
                  Include numbers and symbols
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-tiffany-500" />
                  Avoid common words or personal info
                </li>
              </ul>
            </div>
          </div>
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
            {!isSuccess ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                    Set new password
                  </h1>
                  <p className="text-zinc-400">
                    Your new password must be different from previously used
                    passwords.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (errors.password) {
                            setErrors((prev) => ({ ...prev, password: "" }))
                          }
                        }}
                        className={cn(
                          "pl-10 pr-10 h-11",
                          errors.password && "border-red-500"
                        )}
                        autoFocus
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
                    {password && (
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
                          <span
                            className={cn(
                              passwordStrength.score <= 1 && "text-red-400",
                              passwordStrength.score === 2 && "text-yellow-400",
                              passwordStrength.score === 3 && "text-tiffany-400",
                              passwordStrength.score >= 4 && "text-green-400"
                            )}
                          >
                            {passwordStrength.label}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (errors.confirmPassword) {
                            setErrors((prev) => ({ ...prev, confirmPassword: "" }))
                          }
                        }}
                        className={cn(
                          "pl-10 pr-10 h-11",
                          errors.confirmPassword && "border-red-500"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label={
                          showConfirmPassword ? "Hide password" : "Show password"
                        }
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

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-tiffany-500 to-cyan-500 hover:from-tiffany-600 hover:to-cyan-600 text-white font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Reset password"
                    )}
                  </Button>
                </form>
              </>
            ) : (
              /* Success State */
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-tiffany-500/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-tiffany-500" />
                </div>

                <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                  Password reset successful
                </h1>
                <p className="text-zinc-400 mb-8">
                  Your password has been successfully updated. You can now sign
                  in with your new password.
                </p>

                <Button
                  className="w-full h-11 bg-gradient-to-r from-tiffany-500 to-cyan-500 hover:from-tiffany-600 hover:to-cyan-600 text-white font-medium"
                  onClick={() => router.push("/login")}
                >
                  Continue to sign in
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-tiffany-500/20 border-t-tiffany-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  )
}
