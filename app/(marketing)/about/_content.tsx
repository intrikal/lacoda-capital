"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import { ArrowRight, Target, Shield, Users, Zap, Linkedin, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const values = [
  {
    icon: Target,
    title: "Clarity",
    description: "We believe complexity is the enemy of execution. Our platform simplifies wealth management so you can focus on what matters.",
  },
  {
    icon: Shield,
    title: "Security",
    description: "Your assets deserve the highest level of protection. We build security into everything we do, not as an afterthought.",
  },
  {
    icon: Users,
    title: "Partnership",
    description: "We succeed when our clients succeed. We're not just a vendor—we're a long-term partner in your financial journey.",
  },
  {
    icon: Zap,
    title: "Innovation",
    description: "The wealth management industry is overdue for modernization. We're building the tools that should have existed years ago.",
  },
]

const team = [
  {
    name: "Kevin Lacoda",
    role: "Chief Executive Officer",
    bio: "Featured in the December 2024 Forbes magazine for his expertise in cryptocurrency and digital assets. Visionary leader driving Lacoda Capital's mission to modernize wealth management.",
    image: null,
    linkedin: "#",
    twitter: "#",
  },
  {
    name: "Prasad Rao",
    role: "Lead Developer",
    bio: "Full-stack engineer with deep expertise in building scalable financial platforms. Leads the core product development and engineering architecture at Lacoda.",
    image: null,
    linkedin: "#",
    twitter: "#",
  },
]

const milestones = [
  {
    year: "2019",
    title: "The Beginning",
    description: "Founded by a team of wealth management professionals frustrated with fragmented tools and endless spreadsheets.",
  },
  {
    year: "2020",
    title: "First Platform Launch",
    description: "Released our MVP to 10 pilot enterprise clients. Achieved 100% retention in year one.",
  },
  {
    year: "2021",
    title: "Growing the Team",
    description: "Expanded our engineering and product teams to accelerate platform development and feature delivery.",
  },
  {
    year: "2022",
    title: "Enterprise Ready",
    description: "Achieved SOC 2 Type II certification. Began onboarding enterprise-level clients.",
  },
  {
    year: "2023",
    title: "Platform Expansion",
    description: "Launched new integrations and expanded support for alternative asset classes across the platform.",
  },
  {
    year: "2024",
    title: "Continued Growth",
    description: "Deepened our product offering with advanced reporting, compliance tools, and stakeholder portals.",
  },
]

export function AboutPage() {
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
              About Us
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100">
              Building the future of{" "}
              <span className="text-gradient">wealth management</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              Lacoda Capital Holdings is on a mission to bring clarity and control
              to asset management. We believe that managing wealth shouldn&apos;t require
              a patchwork of spreadsheets, portals, and paper trails.
            </p>
          </animated.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Our Mission
            </h2>
            <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
              To provide enterprises, asset managers, and holding companies with
              a single source of truth for their entire portfolio. We&apos;re replacing
              fragmented tools with one unified platform that brings visibility,
              security, and control to wealth management.
            </p>
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Our Journey
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              From frustration to innovation
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
              Lacoda was born from firsthand experience with the chaos of managing
              multi-asset portfolios across disconnected systems.
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-800 hidden lg:block" />

            <div className="space-y-8 lg:space-y-12">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.year}
                  className={`flex flex-col lg:flex-row items-center gap-4 lg:gap-8 ${
                    index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
                >
                  <div className={`lg:w-1/2 ${index % 2 === 0 ? "lg:text-right" : "lg:text-left"}`}>
                    <Card className="inline-block hover:border-teal-500/30 transition-colors">
                      <CardContent className="p-6">
                        <span className="text-sm font-medium text-teal-400">
                          {milestone.year}
                        </span>
                        <h3 className="mt-1 text-lg font-semibold text-zinc-100">
                          {milestone.title}
                        </h3>
                        <p className="mt-2 text-sm text-zinc-400">
                          {milestone.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Timeline dot */}
                  <div className="hidden lg:flex items-center justify-center w-4 h-4 rounded-full bg-teal-500 ring-4 ring-zinc-950 z-10" />

                  <div className="lg:w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Our Values
            </h2>
            <p className="mt-4 text-zinc-400">
              The principles that guide everything we build.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="hover:border-teal-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-teal-500/10">
                      <value.icon className="h-6 w-6 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100 text-lg">
                        {value.title}
                      </h3>
                      <p className="mt-2 text-zinc-400 leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="primary" className="mb-4">
              Leadership
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Meet the team
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
              Our leadership team brings decades of combined experience from the
              world&apos;s leading financial and technology institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
              <Card key={member.name} className="group hover:border-teal-500/30 transition-colors">
                <CardContent className="p-6">
                  {/* Avatar placeholder */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-semibold text-teal-400">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>

                  <div className="text-center">
                    <h3 className="font-semibold text-zinc-100 text-lg">
                      {member.name}
                    </h3>
                    <p className="text-sm text-teal-400 mt-1">{member.role}</p>
                    <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                      {member.bio}
                    </p>

                    {/* Social links */}
                    <div className="flex items-center justify-center gap-3 mt-4">
                      {member.linkedin && (
                        <a
                          href={member.linkedin}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                          aria-label={`${member.name}'s LinkedIn profile`}
                        >
                          <Linkedin className="h-4 w-4 text-zinc-400" />
                        </a>
                      )}
                      {member.twitter && (
                        <a
                          href={member.twitter}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                          aria-label={`${member.name}'s Twitter profile`}
                        >
                          <Twitter className="h-4 w-4 text-zinc-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-zinc-400 mb-4">
              Want to join our team? We&apos;re always looking for exceptional talent.
            </p>
            <Button variant="outline" asChild>
              <Link href="/contact">
                View Open Positions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl lg:text-5xl font-bold text-gradient">500+</p>
              <p className="mt-2 text-sm text-zinc-400">Active Firms</p>
            </div>
            <div className="text-center">
              <p className="text-4xl lg:text-5xl font-bold text-gradient">$50B+</p>
              <p className="mt-2 text-sm text-zinc-400">Assets Managed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl lg:text-5xl font-bold text-gradient">24/7</p>
              <p className="mt-2 text-sm text-zinc-400">Support Available</p>
            </div>
            <div className="text-center">
              <p className="text-4xl lg:text-5xl font-bold text-gradient">3</p>
              <p className="mt-2 text-sm text-zinc-400">Global Offices</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
            Ready to simplify your wealth management?
          </h2>
          <p className="mt-4 text-zinc-400">
            See how Lacoda can bring clarity to your portfolio.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Button variant="glow" size="lg" asChild>
              <Link href="/demo">
                Request Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
