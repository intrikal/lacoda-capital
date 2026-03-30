import type { Metadata } from "next"
import { DemoPage } from "./_content"

export const metadata: Metadata = {
  title: "Request a Demo | Lacoda Capital Holdings",
  description:
    "See Lacoda in action. Schedule a personalized demo of our asset management operating system for your firm.",
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
