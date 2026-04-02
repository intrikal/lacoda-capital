import type { Metadata } from "next"
import { FAQPage } from "./_content"

export const metadata: Metadata = {
  title: "FAQ | Lacoda Capital Holdings",
  description:
    "Answers to common questions about Lacoda's platform, pricing, security, integrations, and onboarding process.",
  keywords: [
    "asset management FAQ",
    "wealth management questions",
    "portfolio software help",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/faq",
  },
  openGraph: {
    title: "FAQ | Lacoda Capital Holdings",
    description:
      "Answers to common questions about Lacoda's platform, pricing, security, integrations, and onboarding process.",
    url: "https://lacodacapital.com/faq",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Lacoda Capital?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lacoda Capital is a unified asset management platform designed for enterprises, asset managers, and holding companies. We consolidate your entire portfolio—real estate, equities, private investments, and more—into one secure, intelligent platform with document management, reporting, and stakeholder collaboration tools.",
      },
    },
    {
      "@type": "Question",
      name: "Who is Lacoda built for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lacoda is purpose-built for enterprises, institutional investors, asset managers, private equity firms, and holding companies managing $10M+ in assets. Our platform is designed to handle complex, multi-entity structures with ease.",
      },
    },
    {
      "@type": "Question",
      name: "How is Lacoda different from other portfolio management tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Unlike generic financial software, Lacoda is specifically designed for alternative and illiquid assets. We provide unified tracking across all asset classes, enterprise-grade document management, immutable audit logging, and customizable stakeholder portals—all built with security and compliance as foundational requirements.",
      },
    },
    {
      "@type": "Question",
      name: "Can Lacoda handle multiple entities and complex ownership structures?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Lacoda is designed to handle the most complex ownership structures, including holding companies, LLCs, trusts, partnerships, and layered entity hierarchies. Our platform provides consolidated views while maintaining proper entity separation.",
      },
    },
    {
      "@type": "Question",
      name: "What asset classes does Lacoda support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lacoda supports a comprehensive range of asset classes including real estate, public equities, fixed income, private equity, venture capital, hedge funds, art and collectibles, precious metals, cryptocurrency, cash and banking, and custom asset types you define.",
      },
    },
    {
      "@type": "Question",
      name: "How is Lacoda priced?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lacoda offers three tiers: Starter ($499/month) for portfolios up to $25M AUM, Professional ($1,499/month) for up to $100M AUM, and Enterprise (custom pricing) for larger portfolios with complex needs. All plans include core security features and can be paid annually for a 20% discount.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, all plans include a 14-day free trial with full access to all features. No credit card is required to start. Our team will help you migrate sample data during the trial so you can evaluate the platform with real information.",
      },
    },
    {
      "@type": "Question",
      name: "How is my data protected?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your data is protected with AES-256 encryption at rest and TLS 1.3 encryption in transit—the same standards used by leading financial institutions. All data is stored in SOC 2 Type II certified data centers with geographic redundancy.",
      },
    },
    {
      "@type": "Question",
      name: "Is Lacoda SOC 2 certified?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Lacoda maintains SOC 2 Type II certification. We undergo annual third-party audits that verify our security, availability, and confidentiality controls. SOC 2 reports are available upon request under NDA.",
      },
    },
    {
      "@type": "Question",
      name: "How long does implementation take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most customers are up and running within 2-4 weeks. This includes data migration, user training, and configuration. Complex enterprise implementations may take 6-8 weeks depending on the volume of historical data and custom requirements.",
      },
    },
  ],
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQPage />
    </>
  )
}
