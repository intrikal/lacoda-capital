"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config, useTrail } from "@react-spring/web"
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
  Wallet,
  FolderLock,
  GitBranch,
  Calendar,
  MessageSquare,
  Calculator,
  Target,
  PieChart,
  Zap,
  Globe,
  Clock,
  Eye,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// ─────────────────────────────────────────────────────────────────────────────
// Animated Components
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

function StaggeredList({ children, className }: { children: React.ReactNode[], className?: string }) {
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

  const trail = useTrail(children.length, {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0px)" : "translateY(20px)",
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <div ref={ref} className={className}>
      {trail.map((style, index) => (
        <animated.div key={index} style={style}>
          {children[index]}
        </animated.div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection() {
  const reducedMotion = useReducedMotion()

  const heroSpring = useSpring({
    from: { opacity: 0, transform: "translateY(40px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const subtitleSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    delay: 150,
    immediate: reducedMotion,
  })

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-tiffany-500/10 via-transparent to-transparent" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <animated.div style={heroSpring}>
          <Badge variant="outline" className="mb-6 border-tiffany-500/30 text-tiffany-400">
            Wealth Management Infrastructure
          </Badge>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-100 mb-6">
            The Operating System for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-tiffany-400 to-cyan-400">
              Modern Wealth
            </span>
          </h1>
        </animated.div>

        <animated.div style={subtitleSpring}>
          <p className="text-xl sm:text-2xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Lacoda Capital unifies client management, asset tracking, compliance,
            and reporting into one powerful platform built for wealth advisors
            managing high-net-worth portfolios.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8" asChild>
              <Link href="/demo">
                Request Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <Link href="/platform">
                Explore Platform
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-zinc-500">
            Trusted by 200+ wealth management firms · SOC 2 Type II Certified
          </p>
        </animated.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Problem Section
// ─────────────────────────────────────────────────────────────────────────────

const problems = [
  {
    title: "Scattered Tools",
    description: "Client data in spreadsheets, documents in Dropbox, compliance in another app. Nothing talks to each other.",
  },
  {
    title: "Manual Reporting",
    description: "Hours spent every quarter pulling data, building reports, and hoping the numbers are right.",
  },
  {
    title: "Compliance Anxiety",
    description: "Audit trails are incomplete. Document expiration dates slip through. Regulatory reviews are stressful.",
  },
  {
    title: "Client Experience Gap",
    description: "Your clients expect a portal like they have with their bank. You're still sending PDF attachments.",
  },
]

function ProblemSection() {
  return (
    <section className="py-24 px-6 bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <FadeInSection className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
            Wealth Management is Broken
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Most advisors are running their practice on duct tape and spreadsheets.
            The tools built for enterprise don&apos;t fit. The tools built for retail don&apos;t scale.
          </p>
        </FadeInSection>

        <div className="grid md:grid-cols-2 gap-6">
          {problems.map((problem, index) => (
            <FadeInSection key={problem.title} delay={index * 100}>
              <Card className="bg-zinc-900 border-zinc-700 hover:border-zinc-600 transition-colors h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-rose-500/10 shrink-0">
                      <div className="h-2 w-2 rounded-full bg-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{problem.title}</h3>
                      <p className="text-zinc-400">{problem.description}</p>
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
// Solution Section
// ─────────────────────────────────────────────────────────────────────────────

function SolutionSection() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-6xl mx-auto">
        <FadeInSection className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-tiffany-500/30 text-tiffany-400">
            The Solution
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
            One Platform. Complete Control.
          </h2>
          <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
            Lacoda Capital brings together everything you need to manage wealth at scale—
            from client onboarding to compliance reporting, all in one unified system.
          </p>
        </FadeInSection>

        <FadeInSection delay={200}>
          <div className="relative rounded-2xl border border-zinc-700 bg-zinc-900 p-8 md:p-12 overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-tiffany-500/5 to-transparent" />

            <div className="relative grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-tiffany-500/10 w-fit">
                  <Briefcase className="h-6 w-6 text-tiffany-500" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-100">Unified Data</h3>
                <p className="text-zinc-400">
                  Clients, assets, entities, documents, and transactions—all connected
                  in a single source of truth.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-tiffany-500/10 w-fit">
                  <Zap className="h-6 w-6 text-tiffany-500" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-100">Automated Workflows</h3>
                <p className="text-zinc-400">
                  Document expiration alerts, compliance reminders, report generation—
                  the platform works so you don&apos;t have to.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-tiffany-500/10 w-fit">
                  <Eye className="h-6 w-6 text-tiffany-500" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-100">Client Transparency</h3>
                <p className="text-zinc-400">
                  Give clients a beautiful portal to view their portfolio, documents,
                  and communicate with your team.
                </p>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Features Section
// ─────────────────────────────────────────────────────────────────────────────

const platformFeatures = [
  {
    icon: GitBranch,
    title: "Deal Pipeline",
    description: "Track investments from prospecting through due diligence, negotiation, and exit. Kanban-style deal flow management.",
  },
  {
    icon: Users,
    title: "Client CRM",
    description: "Complete client profiles with AUM tracking, contact history, assigned assets, and activity timeline.",
  },
  {
    icon: Briefcase,
    title: "Asset Management",
    description: "Track real estate, equities, private equity, fixed income, crypto, and alternatives with valuation history.",
  },
  {
    icon: Building2,
    title: "Entity Management",
    description: "Manage LLCs, trusts, corporations, and subsidiaries. Track ownership structures and compliance requirements.",
  },
  {
    icon: FolderLock,
    title: "Document Vault",
    description: "Secure document storage with version control, expiration tracking, and granular access permissions.",
  },
  {
    icon: Wallet,
    title: "Financial Tracking",
    description: "Monitor accounts, transactions, spending patterns, loans, and credit across all client relationships.",
  },
  {
    icon: Calculator,
    title: "Tax Optimization",
    description: "Track deductions, estimate tax liability, and identify write-off opportunities for clients.",
  },
  {
    icon: Shield,
    title: "Compliance & Audit",
    description: "SOC 2 controls, immutable audit logs, and regulatory reporting built into every workflow.",
  },
  {
    icon: BarChart3,
    title: "Reporting & Benchmarks",
    description: "Portfolio analytics, benchmark comparisons, and automated quarterly reports for clients.",
  },
  {
    icon: Target,
    title: "Goal Tracking",
    description: "Set and monitor financial goals with projections, milestone tracking, and progress visualization.",
  },
  {
    icon: Calendar,
    title: "Calendar & Tasks",
    description: "Integrated scheduling for client meetings, compliance deadlines, and team coordination.",
  },
  {
    icon: MessageSquare,
    title: "Secure Messaging",
    description: "Encrypted communication between advisors and clients, integrated with activity feeds.",
  },
]

function PlatformFeaturesSection() {
  return (
    <section className="py-24 px-6 bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <FadeInSection className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-tiffany-500/30 text-tiffany-400">
            Platform Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
            Everything You Need to Manage Wealth
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            A comprehensive suite of tools designed for the complexity of high-net-worth wealth management.
          </p>
        </FadeInSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformFeatures.map((feature, index) => (
            <FadeInSection key={feature.title} delay={index * 50}>
              <Card className="bg-zinc-900 border-zinc-700 hover:border-tiffany-500/50 transition-all duration-300 h-full group">
                <CardContent className="p-6">
                  <div className="p-2 rounded-lg bg-zinc-800 group-hover:bg-tiffany-500/10 transition-colors w-fit mb-4">
                    <feature.icon className="h-5 w-5 text-zinc-400 group-hover:text-tiffany-500 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100 mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400">{feature.description}</p>
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
// For Advisors Section
// ─────────────────────────────────────────────────────────────────────────────

const advisorBenefits = [
  "Single dashboard for all client relationships",
  "Real-time portfolio valuations and performance",
  "Automated compliance monitoring and alerts",
  "Custom reporting with your branding",
  "Team collaboration with role-based access",
  "Integration with existing tools via API",
]

function ForAdvisorsSection() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-zinc-950 to-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeInSection>
            <Badge variant="outline" className="mb-4 border-tiffany-500/30 text-tiffany-400">
              For Wealth Advisors
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-6">
              Run Your Practice Like a Modern Firm
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              Whether you&apos;re an independent RIA or an enterprise, Lacoda gives you
              enterprise-grade infrastructure without the enterprise complexity.
            </p>

            <ul className="space-y-4">
              {advisorBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-tiffany-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">{benefit}</span>
                </li>
              ))}
            </ul>

            <Button className="mt-8" size="lg" asChild>
              <Link href="/demo">
                See the Advisor Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </FadeInSection>

          <FadeInSection delay={200}>
            <div className="relative">
              <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-4">
                {/* Mock dashboard preview */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-tiffany-500/20 to-tiffany-600/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-tiffany-500">LC</span>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">Lacoda Capital</p>
                      <p className="text-xs text-zinc-500">Advisor Dashboard</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-0">Live</Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-800">
                    <p className="text-xs text-zinc-500">Total AUM</p>
                    <p className="text-lg font-bold text-zinc-100">$847M</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800">
                    <p className="text-xs text-zinc-500">Clients</p>
                    <p className="text-lg font-bold text-zinc-100">142</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800">
                    <p className="text-xs text-zinc-500">YTD Return</p>
                    <p className="text-lg font-bold text-emerald-400">+18.4%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {["Pipeline: 8 active deals", "Compliance: All clear", "Messages: 3 unread"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-tiffany-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 -top-4 -right-4 w-full h-full rounded-2xl border border-tiffany-500/10" />
              <div className="absolute -z-20 -top-8 -right-8 w-full h-full rounded-2xl border border-tiffany-500/5" />
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// For Clients Section
// ─────────────────────────────────────────────────────────────────────────────

const clientFeatures = [
  {
    icon: PieChart,
    title: "Portfolio Dashboard",
    description: "Real-time view of holdings, allocation, and performance with interactive charts.",
  },
  {
    icon: FileText,
    title: "Document Access",
    description: "Secure access to statements, tax documents, and reports—no more email attachments.",
  },
  {
    icon: RefreshCw,
    title: "Transfer Requests",
    description: "Request deposits, withdrawals, and transfers directly through the portal.",
  },
  {
    icon: MessageSquare,
    title: "Advisor Messaging",
    description: "Communicate securely with your advisor without leaving the platform.",
  },
]

function ForClientsSection() {
  return (
    <section className="py-24 px-6 bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        <FadeInSection className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400">
            For Your Clients
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
            A Client Experience That Builds Trust
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Give your clients the transparency they expect with a beautiful,
            secure portal branded to your firm.
          </p>
        </FadeInSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {clientFeatures.map((feature, index) => (
            <FadeInSection key={feature.title} delay={index * 100}>
              <Card className="bg-zinc-800 border-zinc-700 text-center h-full">
                <CardContent className="p-6">
                  <div className="p-3 rounded-xl bg-cyan-500/10 w-fit mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100 mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400">{feature.description}</p>
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
// Security Section
// ─────────────────────────────────────────────────────────────────────────────

const securityFeatures = [
  { icon: Shield, title: "SOC 2 Type II", description: "Annually audited security controls" },
  { icon: Lock, title: "End-to-End Encryption", description: "AES-256 encryption at rest and in transit" },
  { icon: Eye, title: "Audit Logging", description: "Immutable record of all system activity" },
  { icon: Globe, title: "99.99% Uptime", description: "Enterprise-grade reliability SLA" },
]

function SecuritySection() {
  return (
    <section className="py-24 px-6 bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <FadeInSection className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400">
            Security & Compliance
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
            Built for Regulated Industries
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Your clients trust you with their wealth. We take that responsibility seriously
            with enterprise-grade security at every layer.
          </p>
        </FadeInSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feature, index) => (
            <FadeInSection key={feature.title} delay={index * 100}>
              <div className="text-center p-6 rounded-xl border border-zinc-700 bg-zinc-900">
                <div className="p-3 rounded-xl bg-emerald-500/10 w-fit mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-zinc-100 mb-1">{feature.title}</h3>
                <p className="text-sm text-zinc-500">{feature.description}</p>
              </div>
            </FadeInSection>
          ))}
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
    <section className="py-24 px-6 bg-gradient-to-b from-zinc-900 to-zinc-950">
      <div className="max-w-4xl mx-auto">
        <FadeInSection>
          <div className="relative rounded-3xl border border-zinc-700 bg-zinc-900 p-8 md:p-12 text-center overflow-hidden">
            {/* Decorative gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-gradient-to-b from-tiffany-500/10 to-transparent blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
                Ready to Modernize Your Practice?
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
                Join hundreds of wealth advisors who&apos;ve transformed their operations with Lacoda Capital.
                See why the future of wealth management starts here.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="text-base px-8" asChild>
                  <Link href="/demo">
                    Schedule a Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8" asChild>
                  <Link href="/pricing">
                    View Pricing
                  </Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Free 14-day trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Dedicated onboarding</span>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MarketingCopyPage() {
  return (
    <main className="bg-zinc-950">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <PlatformFeaturesSection />
      <ForAdvisorsSection />
      <ForClientsSection />
      <SecuritySection />
      <CTASection />
    </main>
  )
}
