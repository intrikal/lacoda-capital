import type { Metadata } from "next"
import { PlatformPage } from "./_content"

export const metadata: Metadata = {
  title: "Platform | Lacoda Capital Holdings",
  description:
    "A unified platform built for asset managers and holdings firms. Explore how Lacoda connects portfolio, operations, and compliance in one place.",
  keywords: [
    "unified dashboard",
    "document vault",
    "audit ledger",
    "portfolio analytics",
    "asset management features",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/platform",
  },
  openGraph: {
    title: "Platform | Lacoda Capital Holdings",
    description:
      "A unified platform built for asset managers and holdings firms. Explore how Lacoda connects portfolio, operations, and compliance in one place.",
    url: "https://lacodacapital.com/platform",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <PlatformPage />
}
