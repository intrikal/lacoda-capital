import type { Metadata } from "next"
import { SecurityPage } from "./_content"

export const metadata: Metadata = {
  title: "Security | Lacoda Capital Holdings",
  description:
    "Enterprise-grade security at every layer. Learn how Lacoda protects your firm's data with encryption, access controls, and compliance standards.",
  keywords: [
    "SOC 2 compliance",
    "bank-grade encryption",
    "RBAC",
    "audit logging",
    "financial data security",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/security",
  },
  openGraph: {
    title: "Security | Lacoda Capital Holdings",
    description:
      "Enterprise-grade security at every layer. Learn how Lacoda protects your firm's data with encryption, access controls, and compliance standards.",
    url: "https://lacodacapital.com/security",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <SecurityPage />
}
