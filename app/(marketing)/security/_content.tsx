"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import {
  ArrowRight,
  Shield,
  Lock,
  Key,
  Eye,
  Server,
  FileCheck,
  Users,
  CheckCircle2,
  ExternalLink,
  Building2,
  Globe,
  Database,
  Fingerprint,
  Monitor,
  Cpu,
  RefreshCw,
  ShieldCheck,
  HardDrive,
  Cloud,
  Network,
  BadgeCheck,
  Scale,
  Award,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// ─────────────────────────────────────────────────────────────────────────────
// Security Data
// ─────────────────────────────────────────────────────────────────────────────

const securityPillars = [
  {
    icon: Lock,
    title: "Encryption at Rest",
    description:
      "All data encrypted using AES-256 encryption, the gold standard used by banks, governments, and defense organizations worldwide.",
    details: [
      "AES-256 bit encryption",
      "Encrypted backups",
    ],
  },
  {
    icon: Shield,
    title: "Encryption in Transit",
    description:
      "TLS 1.3 with perfect forward secrecy ensures all data transmission is secure and cannot be intercepted or decrypted.",
    details: [
      "TLS 1.3 protocol",
      "Perfect forward secrecy",
      "HSTS enforcement",
    ],
  },
  {
    icon: Fingerprint,
    title: "Multi-Factor Authentication",
    description:
      "Enforce strong authentication across your organization with support for modern authentication standards.",
    details: [
      "TOTP authenticator apps",
      "SSO/SAML integration",
    ],
  },
  {
    icon: Users,
    title: "Role-Based Access Control",
    description:
      "Granular permissions ensure users access only what they need. Principle of least privilege enforced at every level.",
    details: [
      "Custom role definitions",
      "Entity-level permissions",
      "Document-level access",
      "Time-based access rules",
    ],
  },
  {
    icon: Eye,
    title: "Immutable Audit Logging",
    description:
      "Comprehensive, tamper-proof logging of every action for complete accountability and regulatory compliance.",
    details: [
      "Cryptographic log integrity",
      "User activity tracking",
      "API access logging",
      "Compliance-ready exports",
    ],
  },
  {
    icon: Monitor,
    title: "Security Monitoring",
    description:
      "Automated monitoring and alerting continuously watches for threats, anomalies, and suspicious activity.",
    details: [
      "Real-time threat detection",
      "Anomaly alerting",
      "Automated incident response",
    ],
  },
]

const complianceCertifications = [
  {
    name: "SOC 2 Type II",
    icon: Award,
    status: "in_progress",
    description:
      "SOC 2 Type II audit planned. Compliance controls and audit logging are built into the platform.",
    link: "Contact Security Team",
  },
  {
    name: "GDPR Compliant",
    icon: Globe,
    status: "compliant",
    description:
      "Full compliance with EU General Data Protection Regulation including data subject rights and cross-border transfer mechanisms.",
    link: "Learn More",
  },
  {
    name: "CCPA Compliant",
    icon: Scale,
    status: "compliant",
    description:
      "California Consumer Privacy Act compliance with comprehensive data handling and disclosure procedures.",
    link: "Learn More",
  },
  {
    name: "ISO 27001",
    icon: BadgeCheck,
    status: "in_progress",
    description:
      "Information Security Management System certification in progress.",
    link: "Learn More",
  },
  {
    name: "PCI DSS",
    icon: CreditCardIcon,
    status: "compliant",
    description:
      "Payment processing is handled by Stripe, a PCI Level 1 certified provider.",
    link: "Learn More",
  },
]

const infrastructureFeatures = [
  {
    icon: Cloud,
    title: "Enterprise Cloud Infrastructure",
    description:
      "Hosted on AWS with enterprise-grade infrastructure including auto-scaling, load balancing, and geographic distribution.",
  },
  {
    icon: Database,
    title: "Data Redundancy",
    description:
      "Real-time replication across multiple availability zones. Point-in-time recovery with 30-day retention.",
  },
  {
    icon: HardDrive,
    title: "Backup & Recovery",
    description:
      "Automated daily backups with geographic redundancy. Regular disaster recovery testing with documented RPO/RTO.",
  },
  {
    icon: Network,
    title: "Network Security",
    description:
      "Multi-layer network security including WAF, DDoS protection, private VPC, and network segmentation.",
  },
  {
    icon: Server,
    title: "Physical Security",
    description:
      "Data centers with 24/7 physical security, biometric access controls, and SOC 2 certified facilities.",
  },
  {
    icon: Cpu,
    title: "Performance & Availability",
    description:
      "High availability with continuous monitoring. Automatic failover and self-healing infrastructure.",
  },
]

const securityPractices = [
  {
    category: "Testing & Assessment",
    items: [
      "Annual penetration testing by independent security firms",
      "Quarterly vulnerability assessments",
      "Automated security scanning in CI/CD pipeline",
    ],
  },
  {
    category: "Operational Security",
    items: [
      "Automated monitoring and alerting",
      "Documented incident response procedures",
      "Regular tabletop exercises and security drills",
      "Threat intelligence integration",
    ],
  },
  {
    category: "People & Process",
    items: [
      "Background checks for all employees",
      "Mandatory security awareness training",
      "Secure development lifecycle (SDLC)",
      "Vendor security assessment program",
    ],
  },
  {
    category: "Business Continuity",
    items: [
      "Documented disaster recovery plan",
      "Regular DR testing and validation",
      "Geographic redundancy for critical systems",
      "Cyber insurance coverage",
    ],
  },
]

const enterpriseFeatures = [
  {
    icon: Building2,
    title: "Single Sign-On (SSO)",
    description: "Integrate with your identity provider. Support for SAML 2.0, OIDC, and major IdPs.",
  },
  {
    icon: Key,
    title: "Custom Security Policies",
    description: "Configure password requirements, session timeouts, and IP allowlists.",
  },
  {
    icon: RefreshCw,
    title: "Custom Data Retention",
    description: "Configure data retention policies to meet your compliance requirements.",
  },
]

// Credit card icon component since it's not exported from lucide
function CreditCardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}

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
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export function SecurityPage() {
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
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        {/* Gradient accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/5 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <animated.div style={heroSpring} className="max-w-3xl mx-auto text-center">
            <Badge variant="primary" className="mb-6">
              Enterprise Security
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100">
              Built for assets that{" "}
              <span className="text-gradient">matter most</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              Your wealth deserves bank-level protection. Lacoda combines
              enterprise-grade security controls, continuous monitoring, and
              rigorous compliance standards to protect your most sensitive
              financial information.
            </p>
            <div className="mt-10 flex justify-center gap-4 flex-wrap">
              <Button variant="glow" size="lg" asChild>
                <Link href="/demo">
                  Request Security Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">
                  Contact Security Team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex items-center justify-center gap-8 flex-wrap">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <ShieldCheck className="h-5 w-5 text-teal-400" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Lock className="h-5 w-5 text-teal-400" />
                <span>AES-256 Encryption</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Globe className="h-5 w-5 text-teal-400" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Server className="h-5 w-5 text-teal-400" />
                <span>High Availability</span>
              </div>
            </div>
          </animated.div>
        </div>
      </section>

      {/* Security Pillars */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Defense in Depth
              </h2>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
                Multiple layers of security controls protect your data at every level,
                from network to application to physical infrastructure.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityPillars.map((pillar, index) => (
              <FadeInSection key={pillar.title} delay={index * 50}>
                <Card className="h-full hover:border-teal-500/30 transition-colors group">
                  <CardContent className="p-6">
                    <div className="p-3 rounded-lg bg-teal-500/10 w-fit group-hover:bg-teal-500/20 transition-colors">
                      <pillar.icon className="h-6 w-6 text-teal-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-zinc-100">
                      {pillar.title}
                    </h3>
                    <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                      {pillar.description}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {pillar.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-xs text-zinc-500">
                          <CheckCircle2 className="h-3 w-3 text-teal-500" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Certifications */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <Badge variant="primary" className="mb-6">
                Compliance
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Compliance & Certifications
              </h2>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
                We maintain rigorous compliance certifications and undergo regular
                third-party audits to verify our security controls.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complianceCertifications.map((cert, index) => (
              <FadeInSection key={cert.name} delay={index * 50}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <cert.icon className="h-5 w-5 text-zinc-400" />
                      </div>
                      <Badge
                        variant={
                          cert.status === "certified"
                            ? "success"
                            : cert.status === "compliant"
                            ? "primary"
                            : "warning"
                        }
                      >
                        {cert.status === "certified"
                          ? "Certified"
                          : cert.status === "compliant"
                          ? "Compliant"
                          : "In Progress"}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-zinc-100">{cert.name}</h3>
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                      {cert.description}
                    </p>
                    <Link href={cert.link === "Contact Security Team" ? "/contact" : "/contact"} className="mt-4 text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1 w-fit">
                      {cert.link}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-6">
                Infrastructure
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Enterprise-Grade Infrastructure
              </h2>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
                Built on battle-tested cloud infrastructure with redundancy,
                high availability, and comprehensive disaster recovery.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {infrastructureFeatures.map((feature, index) => (
              <FadeInSection key={feature.title} delay={index * 50}>
                <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 transition-colors">
                  <feature.icon className="h-8 w-8 text-teal-400 mb-4" />
                  <h3 className="font-semibold text-zinc-100">{feature.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Vault Visualization */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeInSection>
              <Badge variant="primary" className="mb-6">
                The Vault
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Your documents live in a fortress
              </h2>
              <p className="mt-4 text-zinc-400 leading-relaxed">
                Every document uploaded to Lacoda is protected by multiple layers
                of security. Data is transmitted securely and stored in encrypted
                form. Access is strictly controlled and every view is logged.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Automatic version history with immutable records",
                  "Expiration tracking and compliance alerts",
                  "Secure sharing with time-limited, revocable links",
                  "Complete audit trail of all document access",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-zinc-300">
                    <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeInSection>

            <FadeInSection delay={200}>
              <div className="relative">
                <div className="aspect-square rounded-2xl border border-zinc-800 bg-zinc-950 p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5" />

                  {/* Animated security layers */}
                  <div className="absolute inset-4 border border-dashed border-zinc-700 rounded-xl opacity-50 animate-pulse" />
                  <div className="absolute inset-8 border border-zinc-800 rounded-lg opacity-75" />
                  <div className="absolute inset-12 border border-zinc-700 rounded-md" />

                  {/* Center vault icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-8 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30">
                      <Shield className="h-16 w-16 text-teal-400" />
                    </div>
                  </div>

                  {/* Orbiting security elements */}
                  <div className="absolute top-1/4 left-1/4 p-2 rounded-full bg-zinc-800 border border-zinc-700">
                    <Lock className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="absolute top-1/4 right-1/4 p-2 rounded-full bg-zinc-800 border border-zinc-700">
                    <Key className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="absolute bottom-1/4 left-1/4 p-2 rounded-full bg-zinc-800 border border-zinc-700">
                    <Eye className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="absolute bottom-1/4 right-1/4 p-2 rounded-full bg-zinc-800 border border-zinc-700">
                    <FileCheck className="h-4 w-4 text-zinc-400" />
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

      {/* Security Practices */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Security Practices
              </h2>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
                Beyond certifications, we maintain a comprehensive security program
                with continuous improvement and regular validation.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-8">
            {securityPractices.map((practice, index) => (
              <FadeInSection key={practice.category} delay={index * 100}>
                <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/50">
                  <h3 className="font-semibold text-zinc-100 mb-4">
                    {practice.category}
                  </h3>
                  <ul className="space-y-3">
                    {practice.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-zinc-400 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <Badge variant="primary" className="mb-6">
                Enterprise
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Advanced Security for Enterprises
              </h2>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
                Additional security controls and customization options available
                for organizations with advanced requirements.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enterpriseFeatures.map((feature, index) => (
              <FadeInSection key={feature.title} delay={index * 50}>
                <Card className="h-full hover:border-teal-500/30 transition-colors">
                  <CardContent className="p-6">
                    <feature.icon className="h-8 w-8 text-teal-400 mb-4" />
                    <h3 className="font-semibold text-zinc-100">{feature.title}</h3>
                    <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
                  </CardContent>
                </Card>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Security FAQ */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-zinc-100">
                Security Questions
              </h2>
              <p className="mt-4 text-zinc-400">
                Common questions from our enterprise customers.
              </p>
            </div>
          </FadeInSection>

          <div className="space-y-4">
            {[
              {
                q: "Where is my data stored?",
                a: "All data is stored in AWS data centers in the United States (us-east-1 and us-west-2). Enterprise customers can request specific data residency configurations for compliance with regional regulations. We do not store or process data outside of certified cloud infrastructure.",
              },
              {
                q: "Can I get a copy of your SOC 2 report?",
                a: "Our SOC 2 Type II audit is planned and in progress. Once complete, the report will be available upon request under NDA. Please contact security@lacoda.com or request through your account manager.",
              },
              {
                q: "Do you support SSO?",
                a: "Yes, we support SAML 2.0 and OpenID Connect (OIDC) for single sign-on integration. We have pre-built integrations with Azure AD and Google Workspace. Custom SAML IdP configurations are supported on Enterprise plans.",
              },
              {
                q: "How do you handle security incidents?",
                a: "We maintain a documented incident response plan with automated monitoring and alerting. In the event of a security incident, affected customers are notified within 72 hours with full details and remediation steps. We maintain cyber insurance and conduct regular incident response drills.",
              },
              {
                q: "Can I conduct my own security assessment?",
                a: "Yes, Enterprise customers can conduct security assessments including penetration testing with advance coordination. We also welcome security questionnaires and can provide responses to standard frameworks like SIG, CAIQ, and VSA.",
              },
              {
                q: "What happens to my data if I cancel?",
                a: "Upon account cancellation, you can export all your data. After a 30-day grace period, all data is cryptographically erased from our systems, including backups. We provide written confirmation of data destruction upon request.",
              },
            ].map((faq, index) => (
              <FadeInSection key={index} delay={index * 50}>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-zinc-100">{faq.q}</h3>
                    <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                      {faq.a}
                    </p>
                  </CardContent>
                </Card>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <Shield className="h-12 w-12 text-teal-400 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Have security questions?
              </h2>
              <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                Our security team is available to discuss your requirements, answer
                questions, and provide documentation for your due diligence process.
              </p>
              <div className="mt-8 flex justify-center gap-4 flex-wrap">
                <Button variant="glow" size="lg" asChild>
                  <Link href="/demo">
                    Schedule Security Review
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="mailto:security@lacoda.com">
                    security@lacoda.com
                  </Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-zinc-500">
                Response within 1 business day for security inquiries
              </p>
            </div>
          </FadeInSection>
        </div>
      </section>
    </>
  )
}
