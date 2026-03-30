import type { Metadata } from "next"
import { LearnPage } from "./_content"

export const metadata: Metadata = {
  title: "Learn | Lacoda Capital Holdings",
  description:
    "Resources, guides, and educational content to help asset managers and holdings firms get the most out of Lacoda.",
  openGraph: {
    title: "Learn | Lacoda Capital Holdings",
    description:
      "Resources, guides, and educational content to help asset managers and holdings firms get the most out of Lacoda.",
    url: "https://lacodacapital.com/learn",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <LearnPage />
}
