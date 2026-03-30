import type { Metadata } from "next"
import { FAQPage } from "./_content"

export const metadata: Metadata = {
  title: "FAQ | Lacoda Capital Holdings",
  description:
    "Answers to common questions about Lacoda's platform, pricing, security, integrations, and onboarding process.",
  openGraph: {
    title: "FAQ | Lacoda Capital Holdings",
    description:
      "Answers to common questions about Lacoda's platform, pricing, security, integrations, and onboarding process.",
    url: "https://lacodacapital.com/faq",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <FAQPage />
}
