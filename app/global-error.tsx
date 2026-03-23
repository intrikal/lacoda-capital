"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home, HelpCircle } from "lucide-react"

/**
 * Global error boundary — catches errors that escape the root layout.
 * This is the last line of defense. It must render its own <html>/<body>
 * since the root layout may have been the source of the error.
 */

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report to Sentry (no-ops gracefully if DSN is not configured)
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-100">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="relative text-center max-w-lg">
            {/* Error icon */}
            <div className="mb-6 flex justify-center">
              <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-12 w-12 text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 mb-4">
              Something went wrong
            </h1>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              A critical error occurred. Don&apos;t worry, your data is safe.
              Please try refreshing the page.
            </p>

            {error.digest && (
              <div className="mb-8 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <p className="text-xs text-zinc-500 font-mono">
                  Error ID: {error.digest}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={reset}
                className="inline-flex items-center px-6 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </button>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium transition-colors"
              >
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </div>

            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center text-sm text-zinc-500 hover:text-teal-400 transition-colors"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Contact support if this keeps happening
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
