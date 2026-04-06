"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import {
  ArrowRight,
  LayoutDashboard,
  FolderLock,
  FileSearch,
  PieChart,
  Bell,
  Users,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const features = [
  {
    icon: LayoutDashboard,
    title: "Unified Dashboard",
    description:
      "See your entire portfolio at a glance. Real-time KPIs, allocation breakdowns, and performance metrics in one view.",
    details: [
      "Multi-asset class support",
      "Customizable widgets",
      "Date range filtering",
      "Export capabilities",
    ],
  },
  {
    icon: FolderLock,
    title: "Document Vault",
    description:
      "Enterprise-grade document management with version control, expiration tracking, and intelligent search.",
    details: [
      "Unlimited storage",
      "Full-text search across document names and tags",
      "Automatic expiration alerts",
      "Folder & tag organization",
    ],
  },
  {
    icon: FileSearch,
    title: "Audit Ledger",
    description:
      "Immutable record of every action. Know who did what, when, and why. Built for compliance.",
    details: [
      "Tamper-proof logging",
      "User activity tracking",
      "Sensitive action flagging",
      "Export for auditors",
    ],
  },
  {
    icon: PieChart,
    title: "Reporting Engine",
    description:
      "Generate professional reports in seconds. Portfolio summaries, compliance snapshots, tax preparation.",
    details: [
      "Custom report builder",
      "Scheduled generation",
      "PDF & Excel export",
      "White-label options",
    ],
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Stay ahead with proactive notifications. Document expirations, valuation updates, compliance deadlines.",
    details: [
      "Customizable rules",
      "Email & in-app delivery",
      "Priority levels",
      "Snooze & acknowledge",
    ],
  },
  {
    icon: Users,
    title: "Client Portal",
    description:
      "Provide controlled access to stakeholders. Clients, advisors, and family members see only what they should.",
    details: [
      "Portfolio & transaction views",
      "Financial goal tracking with progress",
      "Secure messaging",
      "Calendar with Google Calendar sync",
      "Document access",
      "Beneficiary management",
      "Transfer requests",
    ],
  },
  {
    icon: Brain,
    title: "AI Intelligence",
    description:
      "AI-powered tools that work within your existing workflow—extract, draft, and summarize with you in control.",
    details: [
      "AI document extraction with confidence scoring",
      "Smart report narrative generation",
      "Automated email drafting for document requests",
      "Weekly AI-prioritized alert digest",
    ],
  },
  {
    icon: LineChart,
    title: "Fund Analytics",
    description:
      "Purpose-built performance metrics for private equity, venture capital, and alternative investments.",
    details: [
      "IRR & TWR performance calculations",
      "TVPI/DPI/RVPI fund metrics",
      "Capital call & distribution tracking",
      "Benchmark comparisons",
    ],
  },
  {
    icon: Building2,
    title: "Entity & Deal Management",
    description:
      "Manage complex legal structures, deal pipelines, insurance policies, and beneficiary designations.",
    details: [
      "Legal entity structures and ownership",
      "Deal pipeline with Kanban stages",
      "Insurance policy tracking",
      "Beneficiary management",
    ],
  },
  {
    icon: Wallet,
    title: "Financial Operations",
    description:
      "Every dollar accounted for—multi-currency support, tax tracking, billing, and inter-account transfers.",
    details: [
      "Multi-currency consolidation with exchange rates",
      "Tax write-off tracking",
      "Client billing records",
      "Inter-account transfers",
    ],
  },
  {
    icon: Database,
    title: "Data & Integration",
    description:
      "Import, export, and connect your data with flexible tools for bulk operations and API access.",
    details: [
      "CSV bulk import with column mapping",
      "PDF report generation (portfolio summary & holdings)",
      "Global command search (⌘K)",
      "API key management",
      "GDPR data export & account deletion",
      "Custom portal branding",
      "First-login onboarding wizard",
    ],
  },
]

const integrations = [
  {
    name: "Stripe",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
      </svg>
    ),
  },
  {
    name: "Plaid",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M11.07 0L6.55 3.265l4.99 3.68L16.06 3.3zM4.44 4.775L0 8.095l4.965 3.64 4.515-3.295zm13.21.065l-4.49 3.3 4.965 3.64L23.06 8.5zM8.885 9.135L4.44 12.4l4.965 3.64 4.49-3.3zm6.59.065L11 12.5l4.99 3.68 4.51-3.265zM2.27 13.465L0 15.13v.025l2.3 1.69 2.14-1.565zm11.045.03l-4.49 3.3.58.425 3.91 2.87 4.515-3.295zm-6.59.065l-4.465 3.27 4.99 3.68 4.49-3.3zm13.21.065l-2.3 1.69 2.325 1.71.025-.02v-.025zM8.885 18.2l-4.44 3.265L9.43 24l4.49-3.3z" />
      </svg>
    ),
  },
  {
    name: "QuickBooks",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.006 3.84c4.506 0 8.16 3.654 8.16 8.16s-3.654 8.16-8.16 8.16a8.127 8.127 0 01-5.277-1.944v1.535H4.97V4.248h1.759v1.534A8.126 8.126 0 0112.006 3.84zm-4.86 4.471v7.378a6.378 6.378 0 004.86 2.231c3.531 0 6.4-2.869 6.4-6.4s-2.869-6.4-6.4-6.4a6.378 6.378 0 00-4.86 2.231v.96zm3.09 1.189a3.31 3.31 0 013.31-3.31 3.31 3.31 0 110 6.62 3.31 3.31 0 01-3.31-3.31z" />
      </svg>
    ),
  },
  {
    name: "Salesforce",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M10.006 5.17a4.168 4.168 0 013.074-1.358 4.2 4.2 0 013.998 2.88 3.476 3.476 0 011.142-.192 3.52 3.52 0 013.52 3.52 3.52 3.52 0 01-.478 1.776 3.076 3.076 0 011.597 2.694 3.076 3.076 0 01-3.076 3.076c-.263 0-.518-.034-.762-.096a3.348 3.348 0 01-2.992 1.856 3.348 3.348 0 01-1.544-.376 3.6 3.6 0 01-3.006 1.612 3.6 3.6 0 01-3.312-2.18 3 3 0 01-.396.026 3.168 3.168 0 01-3.168-3.168c0-.672.21-1.296.567-1.808A3.396 3.396 0 013.12 10.19a3.396 3.396 0 013.236-3.396 4.168 4.168 0 013.65-1.624z" />
      </svg>
    ),
  },
  {
    name: "DocuSign",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M12.48 4.32L5.04 11.76l2.64 2.64 4.8-4.8V24h3.6V9.6l4.8 4.8 2.64-2.64L16.08 4.32A2.539 2.539 0 0014.28 3.6a2.539 2.539 0 00-1.8.72zM0 0h24v3.6H0z" />
      </svg>
    ),
  },
  {
    name: "Google Drive",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M7.71 14.29L2.19 22.7h11.03l5.52-8.41zM8.3 1.3L0 14.5h5.52L13.82 1.3zM14.59 1.3l-5.52 8.41 5.52 8.41L24 9.71h-5.52z" />
      </svg>
    ),
  },
  {
    name: "Dropbox",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M6 1.807L0 5.629l6 3.822 6-3.822zM18 1.807l-6 3.822 6 3.822 6-3.822zM0 13.274l6 3.822 6-3.822-6-3.822zM18 9.452l-6 3.822 6 3.822 6-3.822zM6 18.519l6 3.822 6-3.822-6-3.822z" />
      </svg>
    ),
  },
]

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0]
  index: number
}) {
  const reducedMotion = useReducedMotion()
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const spring = useSpring({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0px)" : "translateY(30px)",
    config: config.gentle,
    delay: reducedMotion ? 0 : index * 100,
    immediate: reducedMotion,
  })

  return (
    <animated.div ref={ref} style={spring}>
      <Card className="h-full hover:border-teal-500/30 transition-all group">
        <CardContent className="p-6">
          <div className="p-3 rounded-lg bg-teal-500/10 w-fit group-hover:bg-teal-500/20 transition-colors">
            <feature.icon className="h-6 w-6 text-teal-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-100">
            {feature.title}
          </h3>
          <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
            {feature.description}
          </p>
          <ul className="mt-4 space-y-2">
            {feature.details.map((detail) => (
              <li key={detail} className="flex items-center gap-2 text-sm text-zinc-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                {detail}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </animated.div>
  )
}

export function PlatformPage() {
  const reducedMotion = useReducedMotion()

  const heroSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <>
      {/* Hero */}
      <section className="pt-12 pb-16 lg:pt-16 lg:pb-24 relative">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <animated.div style={heroSpring} className="max-w-3xl mx-auto text-center">
            <Badge variant="primary" className="mb-6">
              Platform Overview
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100">
              Everything you need.{" "}
              <span className="text-gradient">Nothing you don&apos;t.</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              Purpose-built for asset managers, enterprises, and holding
              companies. Every feature designed to save time and reduce risk.
            </p>
            <div className="mt-10 flex justify-center gap-4 flex-wrap">
              <Button variant="glow" size="lg" asChild>
                <Link href="/demo">
                  Get a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </animated.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Core Capabilities
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
              Ten capabilities that form the foundation of modern asset management.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-6">
              Integrations
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Connects with your existing tools
            </h2>
            <p className="mt-4 text-zinc-400">
              Import data, sync documents, and automate workflows.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                title={integration.name}
                className="px-5 py-3 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors flex items-center gap-2"
              >
                {integration.logo}
                <span className="text-sm">{integration.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
            Ready to see it in action?
          </h2>
          <p className="mt-4 text-zinc-400">
            Schedule a personalized demo with our team.
          </p>
          <div className="mt-8">
            <Button variant="glow" size="lg" asChild>
              <Link href="/demo">
                Request Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
