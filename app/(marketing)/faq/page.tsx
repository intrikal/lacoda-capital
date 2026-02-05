"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import {
  ArrowRight,
  ChevronDown,
  HelpCircle,
  CreditCard,
  Shield,
  Rocket,
  Search,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Data
// ─────────────────────────────────────────────────────────────────────────────

type FAQCategory = "general" | "pricing" | "security" | "getting-started"

interface FAQItem {
  question: string
  answer: string
  category: FAQCategory
}

const categories: { id: FAQCategory; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", icon: HelpCircle },
  { id: "pricing", label: "Pricing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "getting-started", label: "Getting Started", icon: Rocket },
]

const faqs: FAQItem[] = [
  // General
  {
    category: "general",
    question: "What is Lacoda Capital?",
    answer:
      "Lacoda Capital is a unified asset management platform designed for enterprises, asset managers, and holding companies. We consolidate your entire portfolio—real estate, equities, private investments, and more—into one secure, intelligent platform with document management, reporting, and stakeholder collaboration tools.",
  },
  {
    category: "general",
    question: "Who is Lacoda built for?",
    answer:
      "Lacoda is purpose-built for enterprises, institutional investors, asset managers, private equity firms, and holding companies managing $10M+ in assets. Our platform is designed to handle complex, multi-entity structures with ease.",
  },
  {
    category: "general",
    question: "How is Lacoda different from other portfolio management tools?",
    answer:
      "Unlike generic financial software, Lacoda is specifically designed for alternative and illiquid assets. We provide unified tracking across all asset classes, enterprise-grade document management, immutable audit logging, and customizable stakeholder portals—all built with security and compliance as foundational requirements.",
  },
  {
    category: "general",
    question: "Can Lacoda handle multiple entities and complex ownership structures?",
    answer:
      "Absolutely. Lacoda is designed to handle the most complex ownership structures, including holding companies, LLCs, trusts, partnerships, and layered entity hierarchies. Our platform provides consolidated views while maintaining proper entity separation.",
  },
  {
    category: "general",
    question: "Do you offer a mobile app?",
    answer:
      "Yes, Lacoda offers iOS and Android apps that provide secure access to your portfolio, documents, and alerts on the go. The mobile experience is optimized for reviewing information, approving requests, and staying informed—not for complex data entry.",
  },
  {
    category: "general",
    question: "What asset classes does Lacoda support?",
    answer:
      "Lacoda supports a comprehensive range of asset classes including real estate, public equities, fixed income, private equity, venture capital, hedge funds, art and collectibles, precious metals, cryptocurrency, cash and banking, and custom asset types you define.",
  },

  // Pricing
  {
    category: "pricing",
    question: "How is Lacoda priced?",
    answer:
      "Lacoda offers three tiers: Starter ($499/month) for portfolios up to $25M AUM, Professional ($1,499/month) for up to $100M AUM, and Enterprise (custom pricing) for larger portfolios with complex needs. All plans include core security features and can be paid annually for a 20% discount.",
  },
  {
    category: "pricing",
    question: "What counts toward AUM limits?",
    answer:
      "AUM limits are based on the total value of assets tracked in your Lacoda portfolio. We measure this at the end of each month and average over the quarter. We provide alerts as you approach limits and never cut off access unexpectedly.",
  },
  {
    category: "pricing",
    question: "Is there a free trial?",
    answer:
      "Yes, all plans include a 14-day free trial with full access to all features. No credit card is required to start. Our team will help you migrate sample data during the trial so you can evaluate the platform with real information.",
  },
  {
    category: "pricing",
    question: "Can I change plans later?",
    answer:
      "Yes, you can upgrade at any time and the change takes effect immediately with prorated billing. Downgrades take effect at the next billing cycle. Enterprise customers can work with their account manager on custom arrangements.",
  },
  {
    category: "pricing",
    question: "Are there any setup fees?",
    answer:
      "No setup fees for Starter and Professional plans. Enterprise plans may include optional onboarding and data migration services with custom pricing based on complexity and volume.",
  },
  {
    category: "pricing",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) and ACH bank transfers. Enterprise customers can pay via invoice with NET-30 terms. We also support wire transfers for international customers.",
  },

  // Security
  {
    category: "security",
    question: "How is my data protected?",
    answer:
      "Your data is protected with AES-256 encryption at rest and TLS 1.3 encryption in transit—the same standards used by leading financial institutions. All data is stored in SOC 2 Type II certified data centers with geographic redundancy.",
  },
  {
    category: "security",
    question: "Is Lacoda SOC 2 certified?",
    answer:
      "Yes, Lacoda maintains SOC 2 Type II certification. We undergo annual third-party audits that verify our security, availability, and confidentiality controls. SOC 2 reports are available upon request under NDA.",
  },
  {
    category: "security",
    question: "Do you support multi-factor authentication?",
    answer:
      "Yes, MFA is available on all plans and can be enforced organization-wide. We support authenticator apps (Google Authenticator, Authy), hardware security keys (YubiKey), and SMS backup codes.",
  },
  {
    category: "security",
    question: "Where is my data stored?",
    answer:
      "Data is stored in enterprise-grade cloud infrastructure (AWS) with data centers in the United States. Enterprise customers can request specific data residency configurations for compliance with regional regulations.",
  },
  {
    category: "security",
    question: "Can I export or delete my data?",
    answer:
      "Yes, you can export all your data at any time in standard formats (CSV, JSON, PDF). For account deletion, we provide a complete data export followed by cryptographic erasure of all your information from our systems.",
  },
  {
    category: "security",
    question: "What happens if there's a security incident?",
    answer:
      "We maintain a comprehensive incident response plan with 24/7 monitoring. In the unlikely event of a security incident, affected customers are notified within 72 hours with full details and remediation steps. We also maintain cyber insurance.",
  },

  // Getting Started
  {
    category: "getting-started",
    question: "How long does implementation take?",
    answer:
      "Most customers are up and running within 2-4 weeks. This includes data migration, user training, and configuration. Complex enterprise implementations may take 6-8 weeks depending on the volume of historical data and custom requirements.",
  },
  {
    category: "getting-started",
    question: "Can you help migrate my existing data?",
    answer:
      "Absolutely. Our implementation team specializes in data migration from spreadsheets, legacy systems, and other platforms. We handle data mapping, validation, and cleanup to ensure a smooth transition.",
  },
  {
    category: "getting-started",
    question: "What integrations are available?",
    answer:
      "Lacoda integrates with QuickBooks, Yardi, Salesforce, DocuSign, and major cloud storage providers (Dropbox, Google Drive, OneDrive, Box). We also offer a REST API for custom integrations. Enterprise customers can request specific integrations.",
  },
  {
    category: "getting-started",
    question: "Is training included?",
    answer:
      "Yes, all plans include onboarding training via video call. Professional and Enterprise plans include additional training sessions, admin certification, and access to our learning portal with on-demand tutorials.",
  },
  {
    category: "getting-started",
    question: "How do I add my team members?",
    answer:
      "Team members can be added from the Settings panel. Simply enter their email, assign a role with appropriate permissions, and they'll receive an invitation to join. You can create custom roles to match your organization's access requirements.",
  },
  {
    category: "getting-started",
    question: "Can I import documents from other systems?",
    answer:
      "Yes, you can bulk import documents from your computer, cloud storage (Dropbox, Google Drive, OneDrive), or other document management systems. Our import tools preserve folder structures and support automatic tagging based on file names.",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Accordion Item Component
// ─────────────────────────────────────────────────────────────────────────────

interface AccordionItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

function AccordionItem({ question, answer, isOpen, onToggle }: AccordionItemProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState(0)

  React.useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [answer])

  return (
    <div className="border-b border-zinc-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-zinc-100 group-hover:text-teal-400 transition-colors pr-4">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-zinc-500 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180 text-teal-400"
          )}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ height: isOpen ? height : 0 }}
      >
        <div ref={contentRef} className="pb-5 pr-12">
          <p className="text-zinc-400 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Section Component
// ─────────────────────────────────────────────────────────────────────────────

interface FAQSectionProps {
  category: FAQCategory
  items: FAQItem[]
}

function FAQSection({ category, items }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)
  const categoryInfo = categories.find((c) => c.id === category)

  if (!categoryInfo) return null

  const Icon = categoryInfo.icon

  return (
    <div id={category} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-teal-500/10">
          <Icon className="h-5 w-5 text-teal-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">{categoryInfo.label}</h2>
      </div>
      <Card>
        <CardContent className="p-6">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function FAQPage() {
  const reducedMotion = useReducedMotion()
  const [activeCategory, setActiveCategory] = React.useState<FAQCategory | "all">("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  const heroSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  // Filter FAQs based on category and search
  const filteredFAQs = React.useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory
      const matchesSearch =
        searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  // Group filtered FAQs by category
  const groupedFAQs = React.useMemo(() => {
    const groups: Record<FAQCategory, FAQItem[]> = {
      general: [],
      pricing: [],
      security: [],
      "getting-started": [],
    }
    filteredFAQs.forEach((faq) => {
      groups[faq.category].push(faq)
    })
    return groups
  }, [filteredFAQs])

  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 relative">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <animated.div style={heroSpring} className="max-w-3xl mx-auto text-center">
            <Badge variant="primary" className="mb-6">
              FAQ
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100">
              Frequently Asked{" "}
              <span className="text-gradient">Questions</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              Find answers to common questions about Lacoda Capital. Can&apos;t find
              what you&apos;re looking for? Our team is here to help.
            </p>

            {/* Search */}
            <div className="mt-10 max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-colors"
                />
              </div>
            </div>
          </animated.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 border-b border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur z-40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeCategory === "all"
                  ? "bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/30"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              All Questions
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2",
                  activeCategory === cat.id
                    ? "bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/30"
                    : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                )}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">No results found</h3>
              <p className="mt-2 text-zinc-500">
                Try adjusting your search or filter to find what you&apos;re looking for.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {categories.map((cat) => {
                const items = groupedFAQs[cat.id]
                if (items.length === 0) return null
                return <FAQSection key={cat.id} category={cat.id} items={items} />
              })}
            </div>
          )}
        </div>
      </section>

      {/* Still Have Questions CTA */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/50">
            <HelpCircle className="h-12 w-12 text-teal-400 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Still have questions?
            </h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Our team is ready to answer your questions and help you understand how
              Lacoda can work for your organization.
            </p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button variant="glow" size="lg" asChild>
                <Link href="/contact">
                  Contact Us
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/demo">Schedule a Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
