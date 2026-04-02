import type { Metadata } from "next"
import { AboutPage } from "./_content"

export const metadata: Metadata = {
  title: "About | Lacoda Capital Holdings",
  description:
    "Learn about Lacoda Capital — the team building the operating system for modern asset management and holdings firms.",
  keywords: [
    "Lacoda Capital team",
    "wealth management company",
    "fintech startup",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/about",
  },
  openGraph: {
    title: "About | Lacoda Capital Holdings",
    description:
      "Learn about Lacoda Capital — the team building the operating system for modern asset management and holdings firms.",
    url: "https://lacodacapital.com/about",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <AboutPage />
}
