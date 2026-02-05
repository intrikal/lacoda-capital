"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import {
  ArrowRight,
  BookOpen,
  Video,
  FileText,
  MessageCircle,
  Clock,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const guides = [
  {
    title: "Getting Started with Lacoda",
    description: "Complete setup guide for new users",
    category: "Onboarding",
    readTime: "10 min",
  },
  {
    title: "Document Vault Best Practices",
    description: "Organize and manage your critical documents",
    category: "Documents",
    readTime: "8 min",
  },
  {
    title: "Understanding the Audit Ledger",
    description: "Track every action for compliance",
    category: "Compliance",
    readTime: "6 min",
  },
  {
    title: "Setting Up Role-Based Access",
    description: "Configure permissions for your team",
    category: "Security",
    readTime: "12 min",
  },
  {
    title: "Creating Custom Reports",
    description: "Build reports tailored to your needs",
    category: "Reporting",
    readTime: "15 min",
  },
  {
    title: "Asset Tracking Fundamentals",
    description: "Master multi-asset portfolio tracking",
    category: "Assets",
    readTime: "10 min",
  },
]

const videos = [
  {
    title: "Platform Overview",
    duration: "5:32",
    thumbnail: "overview",
  },
  {
    title: "Importing Your First Asset",
    duration: "3:45",
    thumbnail: "import",
  },
  {
    title: "Document Management Deep Dive",
    duration: "8:20",
    thumbnail: "documents",
  },
  {
    title: "Generating Compliance Reports",
    duration: "6:15",
    thumbnail: "reports",
  },
]

const faqs = [
  {
    question: "How do I migrate data from my current system?",
    answer:
      "We provide dedicated migration support with templates for common data formats. Our team will work with you to ensure a smooth transition.",
  },
  {
    question: "Can I invite external advisors or auditors?",
    answer:
      "Yes! You can create read-only or scoped access roles for external stakeholders. All their activity is logged in the audit ledger.",
  },
  {
    question: "Is there an API for custom integrations?",
    answer:
      "Yes, we offer a RESTful API for Enterprise plan customers. Full documentation and sandbox environment included.",
  },
  {
    question: "How are valuations tracked?",
    answer:
      "You can manually update valuations, upload appraisal documents, or connect to market data feeds for public securities.",
  },
]

export default function LearnPage() {
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
              Learn
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100">
              Resources to help you{" "}
              <span className="text-gradient">succeed</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              Guides, tutorials, and best practices to get the most out of
              Lacoda.
            </p>
          </animated.div>
        </div>
      </section>

      {/* Guides */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-2xl font-bold text-zinc-100">Guides</h2>
              <p className="mt-2 text-zinc-400">Step-by-step documentation</p>
            </div>
            <Button variant="ghost">
              View all guides
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <Card
                key={guide.title}
                className="group cursor-pointer hover:border-teal-500/30 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {guide.category}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {guide.readTime}
                    </span>
                  </div>
                  <h3 className="font-semibold text-zinc-100 group-hover:text-teal-400 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">{guide.description}</p>
                  <div className="mt-4 flex items-center text-teal-400 text-sm font-medium">
                    Read guide
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Video Tutorials */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-2xl font-bold text-zinc-100">Video Tutorials</h2>
              <p className="mt-2 text-zinc-400">Watch and learn</p>
            </div>
            <Button variant="ghost">
              View all videos
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videos.map((video) => (
              <Card
                key={video.title}
                className="group cursor-pointer hover:border-teal-500/30 transition-colors overflow-hidden"
              >
                <div className="aspect-video bg-zinc-800 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-3 rounded-full bg-teal-500/20 group-hover:bg-teal-500/30 transition-colors">
                      <Video className="h-6 w-6 text-teal-400" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs text-zinc-300">
                    {video.duration}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-zinc-100 text-sm group-hover:text-teal-400 transition-colors">
                    {video.title}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-zinc-100">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-zinc-400">
              Common questions from our customers
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-zinc-100">{faq.question}</h3>
                  <p className="mt-2 text-zinc-400 text-sm">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support CTA */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:border-teal-500/30 transition-colors">
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-full bg-teal-500/10 w-fit mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Contact Support
                </h3>
                <p className="mt-2 text-zinc-400 text-sm">
                  Get help from our support team
                </p>
                <Button variant="outline" className="mt-6">
                  Open Support Ticket
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-teal-500/30 transition-colors">
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-full bg-teal-500/10 w-fit mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  API Documentation
                </h3>
                <p className="mt-2 text-zinc-400 text-sm">
                  Build custom integrations
                </p>
                <Button variant="outline" className="mt-6">
                  View API Docs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
