import Link from "next/link"
import { Search, Home, HelpCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/marketing/logo"

export default function NotFound() {
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

        {/* 404 Display */}
        <div className="mb-6">
          <span className="text-8xl font-bold text-gradient">404</span>
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 mb-4">
          Page not found
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          We couldn&apos;t find what you&apos;re looking for. The page may have been moved,
          deleted, or perhaps it never existed. Let&apos;s get you back on track.
        </p>

        {/* Search suggestion */}
        <div className="mb-8 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3 text-zinc-400">
            <Search className="h-5 w-5 text-teal-400" />
            <span className="text-sm">
              Try searching for what you need, or use the navigation below.
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="glow" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">
              <HelpCircle className="mr-2 h-4 w-4" />
              Contact Support
            </Link>
          </Button>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back to previous page
          </Link>
        </div>

        {/* Helpful links */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <p className="text-sm text-zinc-500 mb-4">Popular destinations</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/platform" className="text-zinc-400 hover:text-teal-400 transition-colors">
              Platform
            </Link>
            <Link href="/pricing" className="text-zinc-400 hover:text-teal-400 transition-colors">
              Pricing
            </Link>
            <Link href="/demo" className="text-zinc-400 hover:text-teal-400 transition-colors">
              Request Demo
            </Link>
            <Link href="/about" className="text-zinc-400 hover:text-teal-400 transition-colors">
              About Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
