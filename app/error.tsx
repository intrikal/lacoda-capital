"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/marketing/logo"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      {/* Background accents */}
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl" />

      <div className="relative text-center max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Error icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-12 w-12 text-amber-400" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 mb-4">
          Something went wrong
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          We hit an unexpected bump in the road. Don&apos;t worry, your data is safe.
          This is usually temporary and trying again often helps.
        </p>

        {/* Error details (only in development or if digest exists) */}
        {error.digest && (
          <div className="mb-8 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <p className="text-xs text-zinc-500 font-mono">
              Error ID: {error.digest}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="glow" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Support link */}
        <div className="mt-8">
          <Link
            href="/contact"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-teal-400 transition-colors"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Contact support if this keeps happening
          </Link>
        </div>

        {/* Reassurance message */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <p className="text-sm text-zinc-500">
            Your portfolio data is securely stored and unaffected by this error.
          </p>
        </div>
      </div>
    </div>
  )
}
