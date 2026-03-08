import Link from "next/link"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Access restricted</h1>
        <p className="text-zinc-400 mb-8">
          This platform is currently in private access. Your account is not
          authorized to sign in.
        </p>

        <Button
          className="w-full h-11 bg-gradient-to-r from-tiffany-500 to-cyan-500 hover:from-tiffany-600 hover:to-cyan-600 text-white font-medium"
          asChild
        >
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  )
}
