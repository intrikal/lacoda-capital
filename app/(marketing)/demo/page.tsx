import type { Metadata } from "next"
import { DemoPage } from "./_content"

export const metadata: Metadata = {
  title: "Request a Demo | Lacoda Capital Holdings",
  description:
    "See Lacoda in action. Schedule a personalized demo of our asset management operating system for your firm.",
  keywords: [
    "asset management demo",
    "portfolio software trial",
    "wealth management walkthrough",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/demo",
  },
  openGraph: {
    title: "Request a Demo | Lacoda Capital Holdings",
    description:
      "See Lacoda in action. Schedule a personalized demo of our asset management operating system for your firm.",
    url: "https://lacodacapital.com/demo",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <DemoPage />
}
