"use client"

import * as React from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useSpring, animated, config } from "@react-spring/web"
import {
  ArrowRight,
  Shield,
  FileText,
  BarChart3,
  Lock,
  Users,
  CheckCircle2,
  Building2,
  TrendingUp,
  Briefcase,
  Banknote,
  Upload,
  Zap,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TestimonialsSection } from "@/components/marketing/testimonials-section"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// Dynamically import 3D component and animations to avoid SSR issues
const BioFabricLedger = dynamic(
  () =>
    import("@/components/animations/biofabric-ledger").then(
      (mod) => mod.BioFabricLedger
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] w-full flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="w-8 h-8 border-2 border-teal-400/20 border-t-teal-400 rounded-full animate-spin" />
      </div>
    ),
  }
)

const FlowingMesh = dynamic(
  () =>
    import("@/components/3d/flowing-mesh").then(
      (mod) => mod.FlowingMesh
    ),
  {
    ssr: false,
    loading: () => null,
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// Animated Section Component
// ─────────────────────────────────────────────────────────────────────────────

interface FadeInSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

function FadeInSection({ children, className, delay = 0 }: FadeInSectionProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const spring = useSpring({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0px)" : "translateY(30px)",
    config: config.gentle,
    delay: reducedMotion ? 0 : delay,
    immediate: reducedMotion,
  })

  return (
    <animated.div ref={ref} style={spring} className={className}>
      {children}
    </animated.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection() {
  const reducedMotion = useReducedMotion()

  const heroSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900" />
      <div className="absolute inset-0 bg-grid opacity-20" />

      {/* Three.js Flowing Mesh - Stripe-style shader */}
      <FlowingMesh />

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent lg:w-2/3" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32">
        <animated.div style={heroSpring} className="max-w-2xl">
          <Badge variant="primary" className="mb-6">
            One Source of Truth
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.1]">
            <span className="text-zinc-100">Your assets. </span>
            <span className="text-gradient inline">Finally unified.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl leading-8 text-zinc-400 max-w-xl">
            Stop juggling spreadsheets, portals, and paper trails. Lacoda brings
            your entire portfolio into one secure, intelligent platform.
          </p>

          <div className="mt-10 flex items-center gap-4 flex-wrap">
            <Button variant="glow" size="lg" asChild>
              <Link href="/demo">
                Request Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/platform">Learn More</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex items-center gap-6 text-zinc-500 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-400" />
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-teal-400" />
              <span>Bank-level encryption</span>
            </div>
          </div>
        </animated.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Section
// ─────────────────────────────────────────────────────────────────────────────

function StatsSection() {
  const capabilities = [
    { value: "8 Asset Classes", label: "Real estate, equities, PE, VC, fixed income, crypto, commodities & cash" },
    { value: "Bank-Grade", label: "AES-256 encryption at rest, TLS 1.3 in transit" },
    { value: "8 Integrations", label: "Plaid, Stripe, DocuSign, Salesforce & more" },
    { value: "Real-Time", label: "Portfolio updates across all asset classes" },
  ]

  return (
    <section className="py-16 border-y border-zinc-800/50 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {capabilities.map((cap) => (
            <FadeInSection key={cap.value}>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-tiffany-500">
                  {cap.value}
                </p>
                <p className="mt-2 text-sm text-zinc-400">{cap.label}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Problem Statement Section (Chaos)
// ─────────────────────────────────────────────────────────────────────────────

function ProblemSection() {
  const chaosItems = [
    { icon: Building2, label: "Real Estate", desc: "Scattered across 5 portals" },
    { icon: TrendingUp, label: "Equities", desc: "Multiple brokerage accounts" },
    { icon: Briefcase, label: "Private Deals", desc: "Lost in email threads" },
    { icon: Banknote, label: "Cash & Banking", desc: "Fragmented visibility" },
    { icon: FileText, label: "Documents", desc: "Filing cabinets & folders" },
  ]

  return (
    <section className="py-24 lg:py-32 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="warning" className="mb-6">
              The Problem
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Your wealth is everywhere.{" "}
              <span className="text-zinc-500">Except in one place.</span>
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              Asset managers and enterprises spend countless hours hunting for
              information across disconnected systems. It&apos;s chaos pretending to
              be organization.
            </p>
          </div>
        </FadeInSection>

        <FadeInSection delay={200}>
          <div className="mt-16 flex flex-wrap justify-center gap-4">
            {chaosItems.map((item) => (
              <Card
                key={item.label}
                className="group hover:border-amber-500/30 transition-colors w-[140px] sm:w-[160px]"
              >
                <CardContent className="p-4 text-center">
                  <item.icon className="h-8 w-8 mx-auto text-zinc-500 group-hover:text-amber-400 transition-colors" />
                  <p className="mt-3 font-medium text-zinc-300 text-sm">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Solution Section (Clarity)
// ─────────────────────────────────────────────────────────────────────────────

function SolutionSection() {
  const features = [
    {
      icon: BarChart3,
      title: "Portfolio Intelligence",
      description:
        "Real-time visibility across all asset classes. Track performance, valuations, and allocations in one unified view.",
    },
    {
      icon: FileText,
      title: "Document Vault",
      description:
        "Secure, searchable repository for every agreement, deed, and statement. Never lose a document again.",
    },
    {
      icon: Shield,
      title: "Immutable Ledger",
      description:
        "Every action logged. Every change tracked. Complete audit trail for compliance and accountability.",
    },
    {
      icon: Users,
      title: "Stakeholder Portal",
      description:
        "Controlled access for advisors, attorneys, and family members. Right information, right people.",
    },
  ]

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-950" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="primary" className="mb-6">
              The Solution
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              From chaos to <span className="text-gradient">clarity</span>
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              One platform. One source of truth. Complete visibility and control
              over your entire portfolio.
            </p>
          </div>
        </FadeInSection>

        <div className="mt-16 grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FadeInSection key={feature.title} delay={index * 100}>
              <Card className="group h-full hover:border-teal-500/30 transition-all hover:shadow-[0_0_30px_rgba(20,184,166,0.1)]">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100 text-lg">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-zinc-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// How It Works Section
// ─────────────────────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: Upload,
      title: "Connect Your Assets",
      description:
        "Link your accounts, upload documents, or let our team handle the migration for a service fee. We support integrations with Plaid, Stripe, DocuSign, QuickBooks, Salesforce, Google Drive, and more.",
    },
    {
      number: "02",
      icon: Zap,
      title: "Unified Automatically",
      description:
        "Our platform normalizes data across asset classes, creating a single source of truth in minutes.",
    },
    {
      number: "03",
      icon: Eye,
      title: "Complete Visibility",
      description:
        "Access real-time dashboards, generate reports, and share controlled views with stakeholders.",
    },
  ]

  return (
    <section className="py-24 lg:py-32 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Up and running in days, not months
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              We handle the heavy lifting so you can focus on what matters.
            </p>
          </div>
        </FadeInSection>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <FadeInSection key={step.number} delay={index * 100}>
              <div className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-zinc-800" />
                )}

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6">
                    <step.icon className="h-10 w-10 text-tiffany-500" />
                  </div>
                  <p className="text-sm font-mono text-tiffany-500 mb-2">{step.number}</p>
                  <h3 className="text-xl font-semibold text-zinc-100 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Ledger Section
// ─────────────────────────────────────────────────────────────────────────────

function LiveLedgerSection() {
  return (
    <section className="py-24 lg:py-32 bg-zinc-900 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeInSection>
            <Badge variant="primary" className="mb-6">
              Live Portfolio View
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Watch your wealth{" "}
              <span className="text-gradient">in motion</span>
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              Real-time visibility into every asset class. Track flows, monitor
              performance, and see your complete financial picture update live.
            </p>

            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
                <span className="text-zinc-300">Real-time valuation updates</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
                <span className="text-zinc-300">Capital flow tracking</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
                <span className="text-zinc-300">Multi-asset class visibility</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
                <span className="text-zinc-300">Immutable audit ledger</span>
              </li>
            </ul>

            <div className="mt-10">
              <Button variant="glow" asChild>
                <Link href="/platform">
                  Explore the Platform
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeInSection>

          <FadeInSection delay={200}>
            <BioFabricLedger className="shadow-2xl shadow-teal-500/5" />
          </FadeInSection>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Trust Section
// ─────────────────────────────────────────────────────────────────────────────

function TrustSection() {
  const trustPoints = [
    "Bank-grade AES-256 encryption at rest",
    "TLS 1.3 encryption in transit",
    "Role-based access control (RBAC)",
    "Immutable audit logging",
    "Multi-region redundancy",
    "Regular security audits",
  ]

  return (
    <section className="py-24 lg:py-32 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeInSection>
            <Badge variant="secondary" className="mb-6">
              Security & Trust
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
              Built for assets that matter
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              Your wealth deserves enterprise-grade security. Every byte encrypted.
              Every action logged. Every access controlled.
            </p>

            <ul className="mt-8 space-y-4">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
                  <span className="text-zinc-300">{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Button variant="outline" asChild>
                <Link href="/security">
                  Learn about our security
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeInSection>

          <FadeInSection delay={200}>
            <div className="relative">
              {/* Vault visualization */}
              <div className="aspect-square rounded-2xl border border-zinc-800 bg-zinc-950 p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5" />
                <div className="absolute inset-4 border border-dashed border-zinc-700 rounded-xl" />
                <div className="absolute inset-8 border border-zinc-800 rounded-lg bg-zinc-900/50" />

                {/* Center lock icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-6 rounded-full bg-teal-500/10 border border-teal-500/20">
                    <Lock className="h-12 w-12 text-teal-400" />
                  </div>
                </div>

                {/* Corner accents */}
                <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-teal-500/30" />
                <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-teal-500/30" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-teal-500/30" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-teal-500/30" />
              </div>
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA Section
// ─────────────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-950" />

      <FadeInSection>
        <div className="relative mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-100">
            Ready to unify your portfolio?
          </h2>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
            See how Lacoda can unify your portfolio. Book a 30-minute walkthrough.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button variant="glow" size="xl" asChild>
              <Link href="/demo">
                Schedule a Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            No credit card required. 30-minute personalized walkthrough.
          </p>
        </div>
      </FadeInSection>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Export
// ─────────────────────────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <LiveLedgerSection />
      <TestimonialsSection />
      <TrustSection />
      <CTASection />
    </>
  )
}
