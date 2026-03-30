import type { Metadata } from "next"
import { PricingPage } from "./_content"

export const metadata: Metadata = {
  title: "Pricing | Lacoda Capital Holdings",
  description:
    "Simple, transparent pricing for asset management firms of every size. Find the Lacoda plan that fits your team.",
  openGraph: {
    title: "Pricing | Lacoda Capital Holdings",
    description:
      "Simple, transparent pricing for asset management firms of every size. Find the Lacoda plan that fits your team.",
    url: "https://lacodacapital.com/pricing",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <PricingPage />
}
