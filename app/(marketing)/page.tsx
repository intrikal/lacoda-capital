import type { Metadata } from "next"
import { HomePage } from "./_content"

export const metadata: Metadata = {
  title: "Lacoda Capital Holdings | Asset Management OS",
  description:
    "The operating system for asset management and holdings firms. One unified platform for portfolio tracking, document management, compliance, and reporting.",
  openGraph: {
    title: "Lacoda Capital Holdings | Asset Management OS",
    description:
      "The operating system for asset management and holdings firms. One unified platform for portfolio tracking, document management, compliance, and reporting.",
    url: "https://lacodacapital.com",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <HomePage />
}
