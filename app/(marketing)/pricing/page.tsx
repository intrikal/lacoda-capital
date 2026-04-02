import type { Metadata } from "next"
import { PricingPage } from "./_content"

export const metadata: Metadata = {
  title: "Pricing | Lacoda Capital Holdings",
  description:
    "Simple, transparent pricing for asset management firms of every size. Find the Lacoda plan that fits your team.",
  keywords: [
    "asset management pricing",
    "wealth management software cost",
    "portfolio management plans",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/pricing",
  },
  openGraph: {
    title: "Pricing | Lacoda Capital Holdings",
    description:
      "Simple, transparent pricing for asset management firms of every size. Find the Lacoda plan that fits your team.",
    url: "https://lacodacapital.com/pricing",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Lacoda Capital",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "499",
      priceCurrency: "USD",
      description: "For smaller portfolios getting organized — up to $25M AUM, 3 team members",
    },
    {
      "@type": "Offer",
      name: "Professional",
      price: "1499",
      priceCurrency: "USD",
      description: "For growing firms and asset managers — up to $100M AUM, 10 team members",
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      description: "For large institutions with complex needs — unlimited AUM and team members",
    },
  ],
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <PricingPage />
    </>
  )
}
