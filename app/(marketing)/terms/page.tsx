import type { Metadata } from "next"
import { TermsPage } from "./_content"

export const metadata: Metadata = {
  title: "Terms of Service | Lacoda Capital Holdings",
  description:
    "Read the terms and conditions governing use of the Lacoda Capital platform and services.",
  openGraph: {
    title: "Terms of Service | Lacoda Capital Holdings",
    description:
      "Read the terms and conditions governing use of the Lacoda Capital platform and services.",
    url: "https://lacodacapital.com/terms",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <TermsPage />
}
