import type { Metadata } from "next"
import { ApiDocsPage } from "./_content"

export const metadata: Metadata = {
  title: "API Documentation | Lacoda Capital Holdings",
  description:
    "Explore the Lacoda Capital API. Integrate your systems, automate workflows, and build on top of our asset management platform.",
  openGraph: {
    title: "API Documentation | Lacoda Capital Holdings",
    description:
      "Explore the Lacoda Capital API. Integrate your systems, automate workflows, and build on top of our asset management platform.",
    url: "https://lacodacapital.com/docs/api",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <ApiDocsPage />
}
