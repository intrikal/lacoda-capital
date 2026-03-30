import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-full px-6 py-16">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-teal-500/10 border border-teal-500/20">
            <FileQuestion className="h-12 w-12 text-teal-400" />
          </div>
        </div>

        {/* 404 */}
        <div className="mb-4">
          <span className="text-7xl font-bold text-gradient">404</span>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-semibold text-zinc-100 mb-3">
          Page not found
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          This page doesn&apos;t exist or you don&apos;t have access.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/app">
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/app/help">
              Help Center
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
