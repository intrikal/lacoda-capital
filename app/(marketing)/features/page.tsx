"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
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
  BarChart3,
  Clock,
  Globe,
  Smartphone,
  LineChart,
  TrendingUp,
  Building2,
  Briefcase,
  Banknote,
  FileText,
  Lock,
  Eye,
  Settings,
  Upload,
  Download,
  Filter,
  Search,
  Tag,
  Calendar,
  Mail,
  MessageSquare,
  Share2,
  Link2,
  Database,
  Cloud,
  RefreshCw,
  Activity,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// ─────────────────────────────────────────────────────────────────────────────
// Feature Data
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureDetail {
  icon: LucideIcon
  title: string
  description: string
}

interface FeatureSection {
  id: string
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  details: FeatureDetail[]
  screenshot?: string
  badge?: string
}

const featureSections: FeatureSection[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Unified Dashboard",
    subtitle: "Your entire portfolio at a glance",
    description:
      "Stop jumping between spreadsheets, portals, and email threads. The Lacoda dashboard consolidates all your assets, performance metrics, and key insights into one powerful view.",
    badge: "Core Feature",
    details: [
      {
        icon: PieChart,
        title: "Asset Allocation",
        description:
          "Interactive charts showing allocation across asset classes, entities, and geographies. Drill down to individual holdings.",
      },
      {
        icon: LineChart,
        title: "Performance Tracking",
        description:
          "Real-time and historical performance metrics. Track IRR, MOIC, and custom benchmarks across your portfolio.",
      },
      {
        icon: TrendingUp,
        title: "Valuation Updates",
        description:
          "Automatic market data feeds for public securities. Structured workflows for updating private asset valuations.",
      },
      {
        icon: Filter,
        title: "Custom Views",
        description:
          "Save filtered views by entity, asset class, or time period. Switch between consolidated and entity-level perspectives.",
      },
    ],
  },
  {
    id: "document-vault",
    icon: FolderLock,
    title: "Document Vault",
    subtitle: "Enterprise-grade document management",
    description:
      "Every agreement, deed, statement, and contract in one secure, searchable repository. Never lose a document again.",
    badge: "Most Popular",
    details: [
      {
        icon: Search,
        title: "OCR-Powered Search",
        description:
          "Full-text search across all documents, including scanned PDFs. Find any document in seconds.",
      },
      {
        icon: Tag,
        title: "Smart Organization",
        description:
          "Organize with folders, tags, and custom metadata. Link documents to specific assets and entities.",
      },
      {
        icon: Clock,
        title: "Version History",
        description:
          "Automatic versioning preserves every revision. Compare versions and restore previous states instantly.",
      },
      {
        icon: Calendar,
        title: "Expiration Tracking",
        description:
          "Set expiration dates and renewal reminders. Never miss a lease renewal or license expiration.",
      },
    ],
  },
  {
    id: "audit-ledger",
    icon: FileSearch,
    title: "Immutable Audit Ledger",
    subtitle: "Complete accountability and compliance",
    description:
      "Every action in Lacoda is logged in a tamper-proof audit trail. Know who did what, when, and from where. Built for regulatory compliance and fiduciary accountability.",
    badge: "Enterprise Ready",
    details: [
      {
        icon: Eye,
        title: "Activity Tracking",
        description:
          "Comprehensive logging of all user actions including views, edits, exports, and permission changes.",
      },
      {
        icon: Shield,
        title: "Tamper-Proof",
        description:
          "Cryptographically secured logs that cannot be modified or deleted. Chain-of-custody integrity guaranteed.",
      },
      {
        icon: Download,
        title: "Audit Exports",
        description:
          "Generate compliance reports for auditors, regulators, or internal review with one click.",
      },
      {
        icon: Activity,
        title: "Real-time Monitoring",
        description:
          "Live feed of sensitive actions. Configure alerts for specific activities or unusual patterns.",
      },
    ],
  },
  {
    id: "reporting",
    icon: BarChart3,
    title: "Reporting Engine",
    subtitle: "Professional reports in seconds",
    description:
      "Generate comprehensive portfolio reports, compliance summaries, and client statements. Automate recurring reports and customize to match your brand.",
    details: [
      {
        icon: FileText,
        title: "Report Templates",
        description:
          "Pre-built templates for portfolio summaries, capital account statements, and compliance reports.",
      },
      {
        icon: Settings,
        title: "Custom Builder",
        description:
          "Drag-and-drop report builder for custom layouts. Include charts, tables, and narrative sections.",
      },
      {
        icon: RefreshCw,
        title: "Scheduled Generation",
        description:
          "Automate monthly, quarterly, or annual reports. Deliver via email or make available in client portals.",
      },
      {
        icon: Globe,
        title: "White-Label",
        description:
          "Add your logo, colors, and branding. Generate client-ready reports that represent your firm.",
      },
    ],
  },
  {
    id: "alerts",
    icon: Bell,
    title: "Smart Alerts",
    subtitle: "Proactive notifications that matter",
    description:
      "Stay ahead with intelligent alerts for document expirations, valuation changes, compliance deadlines, and portfolio thresholds. Never be caught off guard.",
    details: [
      {
        icon: Calendar,
        title: "Expiration Alerts",
        description:
          "Automatic reminders for document expirations, lease renewals, and license deadlines.",
      },
      {
        icon: TrendingUp,
        title: "Threshold Alerts",
        description:
          "Set custom thresholds for portfolio values, allocation drift, or performance metrics.",
      },
      {
        icon: Mail,
        title: "Flexible Delivery",
        description:
          "Receive alerts via email, in-app notifications, or both. Configure frequency and priority levels.",
      },
      {
        icon: Settings,
        title: "Custom Rules",
        description:
          "Build sophisticated alert rules with conditions, actions, and escalation paths.",
      },
    ],
  },
  {
    id: "client-portal",
    icon: Users,
    title: "Stakeholder Portal",
    subtitle: "Controlled access for everyone",
    description:
      "Provide secure, role-based access to clients, advisors, attorneys, and family members. Share the right information with the right people—nothing more, nothing less.",
    details: [
      {
        icon: Lock,
        title: "Granular Permissions",
        description:
          "Define exactly what each user can see and do. Entity-level, asset-level, and document-level controls.",
      },
      {
        icon: Eye,
        title: "Activity Visibility",
        description:
          "See when stakeholders access information. Track engagement and ensure accountability.",
      },
      {
        icon: Share2,
        title: "Secure Sharing",
        description:
          "Share documents and reports with time-limited, password-protected links. Revoke access instantly.",
      },
      {
        icon: MessageSquare,
        title: "Secure Messaging",
        description:
          "Built-in messaging for stakeholder communication. Keep conversations in context with related assets.",
      },
    ],
  },
]

// Asset class support
const assetClasses = [
  { icon: Building2, name: "Real Estate" },
  { icon: TrendingUp, name: "Public Equities" },
  { icon: Briefcase, name: "Private Equity" },
  { icon: LineChart, name: "Hedge Funds" },
  { icon: Banknote, name: "Fixed Income" },
  { icon: Database, name: "Digital Assets" },
  { icon: Globe, name: "Art & Collectibles" },
  { icon: Cloud, name: "Cash & Banking" },
]

// Integrations
const integrations = [
  "QuickBooks",
  "Yardi",
  "Salesforce",
  "DocuSign",
  "Dropbox",
  "Google Drive",
  "OneDrive",
  "Box",
  "Plaid",
  "Bloomberg",
]

// ─────────────────────────────────────────────────────────────────────────────
// Feature Section Component
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureSectionComponentProps {
  feature: FeatureSection
  index: number
  isReversed: boolean
}

function FeatureSectionComponent({
  feature,
  index,
  isReversed,
}: FeatureSectionComponentProps) {
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
    immediate: reducedMotion,
  })

  const Icon = feature.icon

  return (
    <animated.section
      ref={ref}
      style={spring}
      id={feature.id}
      className={cn(
        "py-16 lg:py-24 scroll-mt-24",
        index % 2 === 1 && "bg-zinc-900"
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          className={cn(
            "grid lg:grid-cols-2 gap-12 lg:gap-16 items-center",
            isReversed && "lg:grid-flow-dense"
          )}
        >
          {/* Content */}
          <div className={cn(isReversed && "lg:col-start-2")}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <Icon className="h-6 w-6 text-teal-400" />
              </div>
              {feature.badge && (
                <Badge variant="primary">{feature.badge}</Badge>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
              {feature.title}
            </h2>
            <p className="mt-2 text-lg text-teal-400">{feature.subtitle}</p>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              {feature.description}
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {feature.details.map((detail) => (
                <div key={detail.title} className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-zinc-800 flex-shrink-0 mt-0.5">
                    <detail.icon className="h-4 w-4 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-200 text-sm">
                      {detail.title}
                    </h4>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      {detail.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot Placeholder */}
          <div className={cn(isReversed && "lg:col-start-1")}>
            <div className="aspect-[4/3] rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="p-4 rounded-full bg-zinc-800/50 inline-block mb-4">
                    <Icon className="h-12 w-12 text-zinc-600" />
                  </div>
                  <p className="text-zinc-600 text-sm">Screenshot placeholder</p>
                  <p className="text-zinc-700 text-xs mt-1">{feature.title}</p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-red-500/50" />
              <div className="absolute top-4 left-8 w-2 h-2 rounded-full bg-amber-500/50" />
              <div className="absolute top-4 left-12 w-2 h-2 rounded-full bg-green-500/50" />
            </div>
          </div>
        </div>
      </div>
    </animated.section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
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
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 relative">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <animated.div style={heroSpring} className="max-w-3xl mx-auto text-center">
            <Badge variant="primary" className="mb-6">
              Platform Features
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100">
              Everything you need to{" "}
              <span className="text-gradient">manage wealth</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              A comprehensive platform built specifically for enterprises and
              asset managers. Six core capabilities that transform how you work.
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

      {/* Quick Navigation */}
      <section className="py-8 border-y border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur z-40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {featureSections.map((feature) => (
              <a
                key={feature.id}
                href={`#${feature.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <feature.icon className="h-4 w-4" />
                {feature.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      {featureSections.map((feature, index) => (
        <FeatureSectionComponent
          key={feature.id}
          feature={feature}
          index={index}
          isReversed={index % 2 === 1}
        />
      ))}

      {/* Asset Classes */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-6">
              Multi-Asset Support
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Track every asset class
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
              From real estate to digital assets, Lacoda handles the full spectrum
              of investments with specialized tracking for each.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {assetClasses.map((asset) => (
              <Card
                key={asset.name}
                className="group hover:border-teal-500/30 transition-colors"
              >
                <CardContent className="p-6 text-center">
                  <div className="p-3 rounded-lg bg-zinc-800 inline-block group-hover:bg-teal-500/10 transition-colors">
                    <asset.icon className="h-6 w-6 text-zinc-400 group-hover:text-teal-400 transition-colors" />
                  </div>
                  <p className="mt-3 font-medium text-zinc-300 text-sm">
                    {asset.name}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="primary" className="mb-6">
              Integrations
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Connects with your stack
            </h2>
            <p className="mt-4 text-zinc-400">
              Import data, sync documents, and automate workflows with your existing tools.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {integrations.map((name) => (
              <div
                key={name}
                className="px-6 py-3 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-400 text-sm hover:border-zinc-700 hover:text-zinc-300 transition-colors"
              >
                {name}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-zinc-500 text-sm">
              Need a custom integration?{" "}
              <Link href="/contact" className="text-teal-400 hover:text-teal-300">
                Talk to our team
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-6">
                Developer API
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Build on top of Lacoda
              </h2>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Our RESTful API provides programmatic access to your portfolio data,
                documents, and reports. Build custom integrations, automate workflows,
                or power your own applications with Lacoda data.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "RESTful API with comprehensive documentation",
                  "OAuth 2.0 authentication",
                  "Webhooks for real-time updates",
                  "Rate limits suitable for enterprise use",
                  "SDKs for Python, JavaScript, and Ruby",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-zinc-300 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button variant="outline" asChild>
                  <Link href="/demo">
                    Request API Access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div>
              {/* Code preview placeholder */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <span className="ml-2 text-xs text-zinc-500">api-example.js</span>
                </div>
                <pre className="p-4 text-sm overflow-x-auto">
                  <code className="text-zinc-400">
                    <span className="text-purple-400">const</span>{" "}
                    <span className="text-zinc-200">lacoda</span> ={" "}
                    <span className="text-amber-400">require</span>
                    <span className="text-zinc-500">(</span>
                    <span className="text-green-400">&apos;@lacoda/sdk&apos;</span>
                    <span className="text-zinc-500">)</span>;{"\n\n"}
                    <span className="text-purple-400">const</span>{" "}
                    <span className="text-zinc-200">client</span> ={" "}
                    <span className="text-amber-400">new</span>{" "}
                    <span className="text-cyan-400">lacoda</span>.
                    <span className="text-amber-400">Client</span>
                    <span className="text-zinc-500">({"{"}</span>
                    {"\n"}
                    {"  "}
                    <span className="text-zinc-200">apiKey</span>:{" "}
                    <span className="text-green-400">&apos;your-api-key&apos;</span>
                    {"\n"}
                    <span className="text-zinc-500">{"})"}</span>;{"\n\n"}
                    <span className="text-gray-500">// Get portfolio summary</span>
                    {"\n"}
                    <span className="text-purple-400">const</span>{" "}
                    <span className="text-zinc-200">portfolio</span> ={" "}
                    <span className="text-purple-400">await</span>{" "}
                    <span className="text-zinc-200">client</span>.
                    <span className="text-amber-400">portfolio</span>.
                    <span className="text-amber-400">get</span>
                    <span className="text-zinc-500">()</span>;
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <Badge variant="primary" className="mb-6">
                Mobile Access
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Your portfolio in your pocket
              </h2>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Access your portfolio, review documents, and respond to alerts from
                anywhere. Native iOS and Android apps provide a secure, optimized
                mobile experience.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Real-time portfolio access",
                  "Document viewing and approval",
                  "Push notifications for alerts",
                  "Biometric authentication",
                  "Offline document access",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-zinc-300 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-4">
                <Button variant="outline">
                  <Smartphone className="mr-2 h-4 w-4" />
                  iOS App
                </Button>
                <Button variant="outline">
                  <Smartphone className="mr-2 h-4 w-4" />
                  Android App
                </Button>
              </div>
            </div>
            <div className="lg:order-1">
              {/* Mobile preview placeholder */}
              <div className="flex justify-center">
                <div className="w-64 h-[500px] rounded-[3rem] border-4 border-zinc-800 bg-zinc-900 relative overflow-hidden">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-800 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Smartphone className="h-16 w-16 text-zinc-700 mx-auto" />
                      <p className="mt-4 text-zinc-600 text-sm">Mobile preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-100">
            Ready to see these features in action?
          </h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
            Schedule a personalized demo and we&apos;ll show you how Lacoda can
            transform your asset management workflow.
          </p>
          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Button variant="glow" size="lg" asChild>
              <Link href="/demo">
                Schedule Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
