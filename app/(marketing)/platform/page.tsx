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
  Shield,
  Zap,
  CheckCircle2,
  BookOpen,
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
      "OCR-powered search",
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
      "Role-based permissions",
      "Activity tracking",
      "Branded experience",
      "Secure messaging",
    ],
  },
]

const integrations = [
  {
    name: "QuickBooks",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.006 3.84c4.506 0 8.16 3.654 8.16 8.16s-3.654 8.16-8.16 8.16a8.127 8.127 0 01-5.277-1.944v1.535H4.97V4.248h1.759v1.534A8.126 8.126 0 0112.006 3.84zm-4.86 4.471v7.378a6.378 6.378 0 004.86 2.231c3.531 0 6.4-2.869 6.4-6.4s-2.869-6.4-6.4-6.4a6.378 6.378 0 00-4.86 2.231v.96zm3.09 1.189a3.31 3.31 0 013.31-3.31 3.31 3.31 0 110 6.62 3.31 3.31 0 01-3.31-3.31z" />
      </svg>
    ),
  },
  {
    name: "Yardi",
    logo: (
      <svg viewBox="0 0 100 24" className="h-6 w-auto" fill="currentColor">
        <text x="0" y="18" fontSize="18" fontWeight="700" fontFamily="system-ui, sans-serif">YARDI</text>
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
    name: "Dropbox",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M6 1.807L0 5.629l6 3.822 6-3.822zM18 1.807l-6 3.822 6 3.822 6-3.822zM0 13.274l6 3.822 6-3.822-6-3.822zM18 9.452l-6 3.822 6 3.822 6-3.822zM6 18.519l6 3.822 6-3.822-6-3.822z" />
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
    name: "OneDrive",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M13.63 11.32L7.92 14.9l-.01.01a3.28 3.28 0 00-1.68-.46c-.49 0-.96.11-1.38.3A3.297 3.297 0 000 17.97 3.3 3.3 0 003.3 21.3h.04l.01-.01h13.27l.02.01A4.06 4.06 0 0020.7 17.24 4.064 4.064 0 0017.8 13.3a4.04 4.04 0 00-1.19.18l-.02-.01a5.2 5.2 0 00-2.96-2.15zm-.42-.72a5.23 5.23 0 00-4.77-3.14c-2.04 0-3.81 1.18-4.67 2.88a5.2 5.2 0 012.17-.47c.82 0 1.59.19 2.28.53l.05.03 5.28-3.29-.34 3.46z" />
      </svg>
    ),
  },
  {
    name: "Box",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M.956 14.534l5.4-3.57L12 14.534l-5.644 3.57zm16.688 0L12 18.104l-5.644-3.57L12 14.534zm-11.288-3.57L12 7.394l5.644 3.57L12 14.534zm5.644-7.57L6.356 7.394l5.644 3.57 5.644-3.57zM0 17.896l6.356 4.032L12 18.358l-5.644-3.57zm12 .462l5.644 3.57L24 17.896l-6.356-4.032z" />
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

export default function PlatformPage() {
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
              Six pillars that form the foundation of modern asset management.
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
