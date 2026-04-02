import type { Metadata } from "next"
import { FeaturesPage } from "./_content"

export const metadata: Metadata = {
  title: "Features | Lacoda Capital Holdings",
  description:
    "Portfolio tracking, document vault, compliance tools, reporting, and more — everything your asset management firm needs in one platform.",
  keywords: [
    "portfolio tracking",
    "document management",
    "compliance reporting",
    "AI extraction",
    "fund analytics",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/features",
  },
  openGraph: {
    title: "Features | Lacoda Capital Holdings",
    description:
      "Portfolio tracking, document vault, compliance tools, reporting, and more — everything your asset management firm needs in one platform.",
    url: "https://lacodacapital.com/features",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <FeaturesPage />
}
