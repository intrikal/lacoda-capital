import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: "noindex, nofollow",
}

export default function ClientRouteLayout({ children }: { children: React.ReactNode }) {
  return children
}
