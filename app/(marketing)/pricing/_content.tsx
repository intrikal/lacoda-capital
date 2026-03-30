"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import { ArrowRight, Check, X, HelpCircle, Minus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { createCheckoutSession } from "@/lib/actions/subscription.actions"

const plans = [
  {
    name: "Starter",
    planKey: "starter" as const,
    description: "For smaller portfolios getting organized",
    price: "$499",
    period: "/month",
    highlight: false,
    features: [
      { name: "Up to $25M AUM", included: true },
      { name: "3 team members", included: true },
      { name: "Document Vault (10GB)", included: true },
      { name: "Basic reporting", included: true },
      { name: "Email support", included: true },
      { name: "Audit ledger", included: true },
      { name: "API access", included: false },
      { name: "Custom integrations", included: false },
      { name: "Dedicated CSM", included: false },
    ],
    cta: "Start Free Trial",
    ctaVariant: "outline" as const,
    stripeCheckout: true,
  },
  {
    name: "Professional",
    planKey: "professional" as const,
    description: "For growing firms and asset managers",
    price: "$1,499",
    period: "/month",
    highlight: true,
    badge: "Most Popular",
    features: [
      { name: "Up to $100M AUM", included: true },
      { name: "10 team members", included: true },
      { name: "Document Vault (100GB)", included: true },
      { name: "Advanced reporting", included: true },
      { name: "Priority support", included: true },
      { name: "Audit ledger", included: true },
      { name: "API access", included: true },
      { name: "Custom integrations", included: false },
      { name: "Dedicated CSM", included: false },
    ],
    cta: "Start Free Trial",
    ctaVariant: "glow" as const,
    stripeCheckout: true,
  },
  {
    name: "Enterprise",
    planKey: "enterprise" as const,
    description: "For large institutions with complex needs",
    price: "Custom",
    period: "",
    highlight: false,
    features: [
      { name: "Unlimited AUM", included: true },
      { name: "Unlimited team members", included: true },
      { name: "Document Vault (Unlimited)", included: true },
      { name: "Custom reporting", included: true },
      { name: "24/7 phone support", included: true },
      { name: "Audit ledger", included: true },
      { name: "API access", included: true },
      { name: "Custom integrations", included: true },
      { name: "Dedicated CSM", included: true },
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    stripeCheckout: false,
  },
]

const featureComparison = [
  {
    category: "Portfolio Management",
    features: [
      { name: "Asset tracking", starter: true, professional: true, enterprise: true },
      { name: "Performance analytics", starter: "Basic", professional: "Advanced", enterprise: "Custom" },
      { name: "Multi-currency support", starter: true, professional: true, enterprise: true },
      { name: "Real-time valuations", starter: false, professional: true, enterprise: true },
      { name: "Custom asset classes", starter: false, professional: true, enterprise: true },
    ],
  },
  {
    category: "Document Management",
    features: [
      { name: "Document storage", starter: "10 GB", professional: "100 GB", enterprise: "Unlimited" },
      { name: "Version control", starter: true, professional: true, enterprise: true },
      { name: "Expiration alerts", starter: true, professional: true, enterprise: true },
      { name: "OCR & search", starter: false, professional: true, enterprise: true },
      { name: "E-signature integration", starter: false, professional: true, enterprise: true },
    ],
  },
  {
    category: "Security & Compliance",
    features: [
      { name: "SOC 2 Type II", starter: true, professional: true, enterprise: true },
      { name: "Role-based access", starter: true, professional: true, enterprise: true },
      { name: "Audit logging", starter: true, professional: true, enterprise: true },
      { name: "SSO/SAML", starter: false, professional: true, enterprise: true },
      { name: "Custom security policies", starter: false, professional: false, enterprise: true },
    ],
  },
  {
    category: "Integrations & API",
    features: [
      { name: "API access", starter: false, professional: true, enterprise: true },
      { name: "Webhooks", starter: false, professional: true, enterprise: true },
      { name: "Bank feeds", starter: false, professional: true, enterprise: true },
      { name: "Custom integrations", starter: false, professional: false, enterprise: true },
      { name: "Data warehouse sync", starter: false, professional: false, enterprise: true },
    ],
  },
  {
    category: "Support",
    features: [
      { name: "Email support", starter: true, professional: true, enterprise: true },
      { name: "Priority support", starter: false, professional: true, enterprise: true },
      { name: "Phone support", starter: false, professional: false, enterprise: true },
      { name: "Dedicated CSM", starter: false, professional: false, enterprise: true },
      { name: "Custom onboarding", starter: false, professional: false, enterprise: true },
    ],
  },
]

const faqs = [
  {
    question: "What counts toward AUM limits?",
    answer:
      "AUM limits are based on the total value of assets tracked in your Lacoda portfolio. We measure this at the end of each month and average over the quarter.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes! You can upgrade at any time and the change takes effect immediately. Downgrades take effect at the next billing cycle.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes, all plans include a 14-day free trial. No credit card required to start. We'll help you migrate your data during the trial.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards and ACH bank transfers. Enterprise customers can pay via invoice with NET-30 terms.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No setup fees for Starter and Professional plans. Enterprise plans may include onboarding and migration services with custom pricing.",
  },
  {
    question: "What if I exceed my AUM limit?",
    answer:
      "We'll notify you when you're approaching your limit. You'll have 30 days to upgrade or reduce your tracked assets. We never cut off access unexpectedly.",
  },
  {
    question: "Can I add more team members?",
    answer:
      "Additional team members can be added for $49/month each on Starter and Professional plans. Enterprise plans include unlimited team members.",
  },
  {
    question: "Do you offer discounts for nonprofits?",
    answer:
      "Yes, we offer 20% off for qualified nonprofit organizations. Contact our sales team to learn more about our nonprofit program.",
  },
]

export function PricingPage() {
  const reducedMotion = useReducedMotion()
  const [annual, setAnnual] = React.useState(false)
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null)
  const [checkoutLoading, setCheckoutLoading] = React.useState<string | null>(null)

  const handleCheckout = async (planKey: "starter" | "professional") => {
    setCheckoutLoading(planKey)
    try {
      const interval = annual ? "annual" : "monthly"
      const { url } = await createCheckoutSession({ plan: planKey, interval })
      window.location.href = url
    } catch {
      // If not logged in, redirect to login first
      window.location.href = `/login?next=/pricing`
    } finally {
      setCheckoutLoading(null)
    }
  }

  const heroSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-teal-400 mx-auto" />
      ) : (
        <Minus className="h-5 w-5 text-zinc-600 mx-auto" />
      )
    }
    return <span className="text-sm text-zinc-300">{value}</span>
  }

  return (
    <TooltipProvider>
      <>
        {/* Hero */}
        <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 relative">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <animated.div style={heroSpring} className="max-w-3xl mx-auto text-center">
              <Badge variant="primary" className="mb-6">
                Pricing
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100">
                Simple, transparent{" "}
                <span className="text-gradient">pricing</span>
              </h1>
              <p className="mt-6 text-lg text-zinc-400">
                No hidden fees. No surprises. Choose the plan that fits your
                portfolio.
              </p>

              {/* Billing Toggle */}
              <div className="mt-10 flex items-center justify-center gap-4">
                <span
                  className={cn(
                    "text-sm font-medium",
                    !annual ? "text-zinc-100" : "text-zinc-500"
                  )}
                >
                  Monthly
                </span>
                <button
                  onClick={() => setAnnual(!annual)}
                  className={cn(
                    "relative inline-flex h-7 w-14 items-center rounded-full transition-colors",
                    annual ? "bg-teal-600" : "bg-zinc-700"
                  )}
                  aria-pressed={annual}
                  aria-label="Toggle annual billing"
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 rounded-full bg-white transition-transform",
                      annual ? "translate-x-8" : "translate-x-1"
                    )}
                  />
                </button>
                <span
                  className={cn(
                    "text-sm font-medium flex items-center gap-2",
                    annual ? "text-zinc-100" : "text-zinc-500"
                  )}
                >
                  Annual
                  <Badge variant="success" className="text-xs">
                    Save 20%
                  </Badge>
                </span>
              </div>
            </animated.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 lg:py-24 bg-zinc-900">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative",
                    plan.highlight &&
                      "border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.1)]"
                  )}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="primary">{plan.badge}</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold text-zinc-100">
                        {plan.price === "Custom"
                          ? "Custom"
                          : annual
                          ? `$${Math.round(
                              parseInt(plan.price.replace("$", "").replace(",", "")) * 0.8
                            ).toLocaleString()}`
                          : plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-zinc-400">{plan.period}</span>
                      )}
                      {annual && plan.price !== "Custom" && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Billed annually
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => (
                        <li
                          key={feature.name}
                          className="flex items-center gap-3 text-sm"
                        >
                          {feature.included ? (
                            <Check className="h-4 w-4 text-teal-400 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                          )}
                          <span
                            className={
                              feature.included ? "text-zinc-300" : "text-zinc-500"
                            }
                          >
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {plan.stripeCheckout ? (
                      <Button
                        variant={plan.ctaVariant}
                        className="w-full"
                        onClick={() => handleCheckout(plan.planKey as "starter" | "professional")}
                        disabled={checkoutLoading !== null}
                      >
                        {checkoutLoading === plan.planKey && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {plan.cta}
                      </Button>
                    ) : (
                      <Button
                        variant={plan.ctaVariant}
                        className="w-full"
                        asChild
                      >
                        <Link href="/demo">{plan.cta}</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                Compare Plans
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Detailed feature comparison
              </h2>
              <p className="mt-4 text-zinc-400">
                See exactly what&apos;s included in each plan.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-4 px-4 text-zinc-400 font-medium w-1/4">
                      Features
                    </th>
                    <th className="text-center py-4 px-4 text-zinc-100 font-semibold">
                      Starter
                    </th>
                    <th className="text-center py-4 px-4 text-zinc-100 font-semibold">
                      <div className="flex flex-col items-center">
                        Professional
                        <Badge variant="primary" className="mt-1 text-xs">Popular</Badge>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 text-zinc-100 font-semibold">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((category) => (
                    <React.Fragment key={category.category}>
                      <tr className="border-b border-zinc-800">
                        <td
                          colSpan={4}
                          className="py-4 px-4 bg-zinc-900/50"
                        >
                          <span className="text-sm font-semibold text-teal-400">
                            {category.category}
                          </span>
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr
                          key={feature.name}
                          className="border-b border-zinc-800/50 hover:bg-zinc-900/30"
                        >
                          <td className="py-3 px-4 text-sm text-zinc-300">
                            {feature.name}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {renderFeatureValue(feature.starter)}
                          </td>
                          <td className="py-3 px-4 text-center bg-teal-500/5">
                            {renderFeatureValue(feature.professional)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {renderFeatureValue(feature.enterprise)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* All Plans Include */}
        <section className="py-16 lg:py-24 bg-zinc-900">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-zinc-100">
                All plans include
              </h2>
              <p className="mt-2 text-zinc-400">
                Core features available on every plan
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "SOC 2 Type II security", tooltip: "Enterprise-grade security certification" },
                { name: "Bank-grade encryption", tooltip: "AES-256 encryption at rest and in transit" },
                { name: "Role-based access control", tooltip: "Granular permissions for team members" },
                { name: "Immutable audit ledger", tooltip: "Complete history of all actions" },
                { name: "Document versioning", tooltip: "Track changes across document versions" },
                { name: "Expiration alerts", tooltip: "Get notified before documents expire" },
                { name: "Data export", tooltip: "Export your data anytime in standard formats" },
                { name: "Priority support", tooltip: "Dedicated support team for your business" },
              ].map((feature) => (
                <Tooltip key={feature.name}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-zinc-300 text-sm cursor-help group">
                      <Check className="h-4 w-4 text-teal-400 flex-shrink-0" />
                      <span className="group-hover:text-zinc-100 transition-colors">
                        {feature.name}
                      </span>
                      <HelpCircle className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{feature.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="primary" className="mb-4">
                FAQ
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-zinc-400">
                Everything you need to know about our pricing.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card
                  key={index}
                  className={cn(
                    "cursor-pointer transition-colors",
                    expandedFaq === index ? "border-teal-500/30" : "hover:border-zinc-700"
                  )}
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-zinc-100">{faq.question}</h3>
                      <div
                        className={cn(
                          "text-zinc-500 transition-transform",
                          expandedFaq === index && "rotate-180"
                        )}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    {expandedFaq === index && (
                      <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 bg-zinc-900">
          <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Not sure which plan is right?
            </h2>
            <p className="mt-4 text-zinc-400">
              Schedule a call with our team to discuss your requirements and get
              a personalized recommendation.
            </p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button variant="glow" size="lg" asChild>
                <Link href="/demo">
                  Talk to Sales
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-zinc-500">
              14-day free trial. No credit card required.
            </p>
          </div>
        </section>
      </>
    </TooltipProvider>
  )
}
