"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Building2,
  Users,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const contactReasons = [
  { value: "demo", label: "Schedule a Demo" },
  { value: "sales", label: "Talk to Sales" },
  { value: "support", label: "Technical Support" },
  { value: "partnership", label: "Partnership Inquiry" },
  { value: "press", label: "Press & Media" },
  { value: "other", label: "Other" },
]

const officeLocations = [
  {
    city: "New York",
    address: "350 Fifth Avenue, Suite 4810\nNew York, NY 10118",
    phone: "+1 (212) 555-0199",
    email: "ny@lacoda.com",
    timezone: "EST",
    isHQ: true,
  },
  {
    city: "London",
    address: "30 St Mary Axe\nLondon, EC3A 8BF",
    phone: "+44 20 7946 0958",
    email: "london@lacoda.com",
    timezone: "GMT",
    isHQ: false,
  },
  {
    city: "Singapore",
    address: "1 Raffles Place, Tower 1\nSingapore 048616",
    phone: "+65 6123 4567",
    email: "singapore@lacoda.com",
    timezone: "SGT",
    isHQ: false,
  },
]

const departments = [
  {
    icon: MessageCircle,
    name: "Sales",
    email: "sales@lacoda.com",
    description: "Talk to our team about how Lacoda can help your organization",
    responseTime: "Within 4 hours",
  },
  {
    icon: Users,
    name: "Support",
    email: "support@lacoda.com",
    description: "Get help with technical issues or account questions",
    responseTime: "Within 2 hours",
  },
  {
    icon: Building2,
    name: "Enterprise",
    email: "enterprise@lacoda.com",
    description: "Custom solutions for large institutions and enterprises",
    responseTime: "Within 24 hours",
  },
  {
    icon: Globe,
    name: "Partnerships",
    email: "partners@lacoda.com",
    description: "Explore integration and partnership opportunities",
    responseTime: "Within 48 hours",
  },
]

export default function ContactPage() {
  const reducedMotion = useReducedMotion()
  const [submitted, setSubmitted] = React.useState(false)
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    subject: "",
    reason: "",
    message: "",
  })

  const heroSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock form submission
    setSubmitted(true)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 relative">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <animated.div style={heroSpring} className="max-w-3xl mx-auto text-center">
            <Badge variant="primary" className="mb-6">
              Contact Us
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100">
              Let&apos;s start a{" "}
              <span className="text-gradient">conversation</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              Have questions about Lacoda? We&apos;re here to help. Reach out to
              our team and we&apos;ll get back to you within 24 hours.
            </p>
          </animated.div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-6">
                Send us a message
              </h2>

              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        placeholder="Smith"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company name</Label>
                    <Input
                      id="company"
                      placeholder="Acme Holdings"
                      value={formData.company}
                      onChange={(e) =>
                        handleInputChange("company", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={(e) =>
                        handleInputChange("subject", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Topic</Label>
                    <Select
                      value={formData.reason}
                      onValueChange={(value) => handleInputChange("reason", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactReasons.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <textarea
                      id="message"
                      rows={5}
                      placeholder="Tell us more about your needs..."
                      value={formData.message}
                      onChange={(e) =>
                        handleInputChange("message", e.target.value)
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none hover:border-zinc-600 transition-colors"
                      required
                    />
                  </div>

                  <Button type="submit" variant="glow" size="lg" className="w-full">
                    Send Message
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="text-xs text-zinc-500 text-center">
                    By submitting, you agree to our{" "}
                    <Link href="/privacy" className="text-zinc-400 hover:text-zinc-300">
                      Privacy Policy
                    </Link>
                    . We&apos;ll never share your information with third parties.
                  </p>
                </form>
              ) : (
                <div className="p-8 rounded-xl border border-teal-500/30 bg-teal-500/5 text-center">
                  <div className="p-4 rounded-full bg-teal-500/10 w-fit mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-100">
                    Message sent!
                  </h3>
                  <p className="mt-2 text-zinc-400">
                    Thank you for reaching out. Our team will get back to you
                    within 24 hours.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setSubmitted(false)
                      setFormData({
                        firstName: "",
                        lastName: "",
                        email: "",
                        company: "",
                        subject: "",
                        reason: "",
                        message: "",
                      })
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              {/* Contact by department */}
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 mb-6">
                  Contact by department
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {departments.map((dept) => (
                    <Card key={dept.name} className="hover:border-zinc-700 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-teal-500/10">
                            <dept.icon className="h-4 w-4 text-teal-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-zinc-100">{dept.name}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                              {dept.description}
                            </p>
                            <a
                              href={`mailto:${dept.email}`}
                              className="text-sm text-teal-400 hover:text-teal-300 mt-2 inline-block"
                            >
                              {dept.email}
                            </a>
                            <p className="text-xs text-zinc-600 mt-1">
                              Response: {dept.responseTime}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Quick contact info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-zinc-100 mb-4">
                    General Inquiries
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <Mail className="h-4 w-4 text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Email</p>
                        <a
                          href="mailto:hello@lacoda.com"
                          className="text-zinc-100 hover:text-teal-400 transition-colors"
                        >
                          hello@lacoda.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <Phone className="h-4 w-4 text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Phone</p>
                        <a
                          href="tel:+12125550199"
                          className="text-zinc-100 hover:text-teal-400 transition-colors"
                        >
                          +1 (212) 555-0199
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <Clock className="h-4 w-4 text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Business Hours</p>
                        <p className="text-zinc-100">Mon - Fri: 9:00 AM - 6:00 PM EST</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Global Presence
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Our offices
            </h2>
            <p className="mt-4 text-zinc-400">
              With teams across the globe, we&apos;re here to support you wherever you are.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {officeLocations.map((office) => (
              <Card
                key={office.city}
                className={cn(
                  "hover:border-teal-500/30 transition-colors",
                  office.isHQ && "border-teal-500/20"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-teal-400" />
                    <h3 className="font-semibold text-zinc-100 text-lg">
                      {office.city}
                    </h3>
                    {office.isHQ && (
                      <Badge variant="primary" className="text-xs">HQ</Badge>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm whitespace-pre-line mb-4">
                    {office.address}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-zinc-500" />
                      <a
                        href={`tel:${office.phone.replace(/\s/g, "")}`}
                        className="text-zinc-300 hover:text-teal-400 transition-colors"
                      >
                        {office.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-zinc-500" />
                      <a
                        href={`mailto:${office.email}`}
                        className="text-zinc-300 hover:text-teal-400 transition-colors"
                      >
                        {office.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <span className="text-zinc-400">
                        9:00 AM - 6:00 PM {office.timezone}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Map placeholder */}
          <div className="mt-12">
            <div className="relative h-[400px] rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5" />
              <div className="absolute inset-0 bg-grid opacity-20" />

              {/* Map markers */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full max-w-3xl">
                  {/* New York marker */}
                  <div className="absolute left-[25%] top-[40%] flex flex-col items-center">
                    <div className="p-2 rounded-full bg-teal-500/20 border border-teal-500/30 animate-pulse">
                      <div className="w-3 h-3 rounded-full bg-teal-400" />
                    </div>
                    <span className="mt-1 text-xs text-zinc-400">New York</span>
                  </div>

                  {/* London marker */}
                  <div className="absolute left-[45%] top-[30%] flex flex-col items-center">
                    <div className="p-2 rounded-full bg-teal-500/20 border border-teal-500/30 animate-pulse delay-100">
                      <div className="w-3 h-3 rounded-full bg-teal-400" />
                    </div>
                    <span className="mt-1 text-xs text-zinc-400">London</span>
                  </div>

                  {/* Singapore marker */}
                  <div className="absolute left-[75%] top-[55%] flex flex-col items-center">
                    <div className="p-2 rounded-full bg-teal-500/20 border border-teal-500/30 animate-pulse delay-200">
                      <div className="w-3 h-3 rounded-full bg-teal-400" />
                    </div>
                    <span className="mt-1 text-xs text-zinc-400">Singapore</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
            Looking for answers?
          </h2>
          <p className="mt-4 text-zinc-400">
            Check out our learning resources and frequently asked questions.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Button variant="glow" size="lg" asChild>
              <Link href="/demo">
                Schedule a Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/learn">
                Visit Help Center
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
