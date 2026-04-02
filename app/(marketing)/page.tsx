import type { Metadata } from "next"
import { HomePage } from "./_content"

export const metadata: Metadata = {
  title: "Lacoda Capital Holdings | Asset Management OS",
  description:
    "The operating system for asset management and holdings firms. One unified platform for portfolio tracking, document management, compliance, and reporting.",
  keywords: [
    "asset management platform",
    "portfolio management software",
    "wealth management OS",
    "holdings management",
    "family office software",
    "asset tracking",
  ],
  alternates: {
    canonical: "https://lacodacapital.com",
  },
  openGraph: {
    title: "Lacoda Capital Holdings | Asset Management OS",
    description:
      "The operating system for asset management and holdings firms. One unified platform for portfolio tracking, document management, compliance, and reporting.",
    url: "https://lacodacapital.com",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <HomePage />
}
