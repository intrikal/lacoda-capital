import type { Metadata } from "next"
import { PrivacyPage } from "./_content"

export const metadata: Metadata = {
  title: "Privacy Policy | Lacoda Capital Holdings",
  description:
    "Read Lacoda Capital's privacy policy to understand how we collect, use, and protect your personal information.",
  openGraph: {
    title: "Privacy Policy | Lacoda Capital Holdings",
    description:
      "Read Lacoda Capital's privacy policy to understand how we collect, use, and protect your personal information.",
    url: "https://lacodacapital.com/privacy",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <PrivacyPage />
}
