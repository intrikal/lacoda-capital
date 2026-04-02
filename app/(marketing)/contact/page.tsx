import type { Metadata } from "next"
import { ContactPage } from "./_content"

export const metadata: Metadata = {
  title: "Contact | Lacoda Capital Holdings",
  description:
    "Get in touch with the Lacoda Capital team. We're here to answer your questions about our asset management platform.",
  keywords: [
    "contact Lacoda Capital",
    "asset management support",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/contact",
  },
  openGraph: {
    title: "Contact | Lacoda Capital Holdings",
    description:
      "Get in touch with the Lacoda Capital team. We're here to answer your questions about our asset management platform.",
    url: "https://lacodacapital.com/contact",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <ContactPage />
}
