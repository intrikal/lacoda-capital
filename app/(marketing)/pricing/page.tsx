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
      price: "299",
      priceCurrency: "USD",
      description: "For advisors just getting organized — up to $500K AUM, 2 team members",
    },
    {
      "@type": "Offer",
      name: "Growth",
      price: "599",
      priceCurrency: "USD",
      description: "For practices scaling their client base — up to $1.5M AUM, 3 team members",
    },
    {
      "@type": "Offer",
      name: "Professional",
      price: "999",
      priceCurrency: "USD",
      description: "For established advisors with a growing book — up to $3M AUM, 5 team members",
    },
    {
      "@type": "Offer",
      name: "Elite",
      price: "1499",
      priceCurrency: "USD",
      description: "For boutique firms managing up to $5M AUM, 10 team members",
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      description: "For institutions with complex needs — unlimited AUM and team members",
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
