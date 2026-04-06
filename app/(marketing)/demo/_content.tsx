"use client"

import * as React from "react"
import Link from "next/link"
import { useSpring, animated, config } from "@react-spring/web"
import {
  ArrowRight,
  CheckCircle2,
  Calendar,
  Users,
  Shield,
  Play,
  BarChart3,
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
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

const benefits = [
  {
    icon: BarChart3,
    title: "Live Portfolio Demo",
    description: "See real-time portfolio tracking and analytics in action with sample data.",
  },
  {
    icon: FileText,
    title: "Document Vault Walkthrough",
    description: "Experience our secure document management with version control and expiration tracking.",
  },
  {
    icon: Lock,
    title: "Security Deep-Dive",
    description: "Learn about our enterprise-grade security infrastructure and compliance certifications.",
  },
  {
    icon: Users,
    title: "Custom Integration Review",
    description: "Discuss how Lacoda integrates with your existing systems and workflows.",
  },
]

const demoBenefits = [
  "Personalized walkthrough of the platform",
  "See how Lacoda fits your specific use case",
  "Get answers to your security questions",
  "Discuss migration and onboarding",
  "No commitment required",
]

const testimonials = [
  {
    quote:
      "Lacoda replaced 5 different tools for us. Now everything is in one place and our audit prep takes hours instead of weeks.",
    author: "Sarah M.",
    role: "CFO, Investment Firm",
  },
  {
    quote:
      "The document vault alone is worth the investment. We finally have a system that tracks expirations and versions automatically.",
    author: "Michael T.",
    role: "Managing Director, Asset Manager",
  },
]

const timeSlots = [
  { time: "10:00 AM", available: true },
  { time: "11:00 AM", available: true },
  { time: "12:00 PM", available: true },
  { time: "1:00 PM", available: true },
  { time: "2:00 PM", available: true },
  { time: "3:00 PM", available: true },
  { time: "4:00 PM", available: true },
  { time: "5:00 PM", available: true },
  { time: "6:00 PM", available: true },
  { time: "7:00 PM", available: true },
  { time: "8:00 PM", available: true },
  { time: "9:00 PM", available: true },
  { time: "10:00 PM", available: true },
  { time: "11:00 PM", available: true },
  { time: "12:00 AM", available: true },
]

export function DemoPage() {
  const reducedMotion = useReducedMotion()
  const [submitted, setSubmitted] = React.useState(false)
  const [bookingMode, setBookingMode] = React.useState<"form" | "calendar">("form")
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const heroSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  // Generate full month grid for calendar
  const calendarDays = React.useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const cells: (null | { date: string; day: number; disabled: boolean })[] = []

    // Leading empty cells
    for (let i = 0; i < startOffset; i++) {
      cells.push(null)
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d)
      const dayOfWeek = cellDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isPast = cellDate < today
      cells.push({
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        disabled: isWeekend || isPast,
      })
    }

    return cells
  }, [currentMonth])

  const canGoPrevMonth = React.useMemo(() => {
    const now = new Date()
    return (
      currentMonth.getFullYear() > now.getFullYear() ||
      (currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() > now.getMonth())
    )
  }, [currentMonth])

  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 relative">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Form */}
            <animated.div style={heroSpring}>
              <Badge variant="primary" className="mb-6">
                Get Started
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
                See Lacoda in action
              </h1>
              <p className="mt-4 text-lg text-zinc-400">
                Schedule a personalized demo with our team. We&apos;ll show you
                how Lacoda can transform your portfolio management.
              </p>

              {/* Toggle between form and calendar */}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setBookingMode("form")}
                  className={cn(
                    "px-4 py-2 text-sm rounded-lg transition-colors",
                    bookingMode === "form"
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  Request Demo
                </button>
                <button
                  onClick={() => setBookingMode("calendar")}
                  className={cn(
                    "px-4 py-2 text-sm rounded-lg transition-colors",
                    bookingMode === "calendar"
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  Book Time Slot
                </button>
              </div>

              {!submitted ? (
                <>
                  {bookingMode === "form" ? (
                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First name</Label>
                          <Input
                            id="firstName"
                            placeholder="John"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last name</Label>
                          <Input
                            id="lastName"
                            placeholder="Smith"
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
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company">Company name</Label>
                        <Input
                          id="company"
                          placeholder="Acme Holdings"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aum">Approximate AUM</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under25">Under $25M</SelectItem>
                            <SelectItem value="25-50">$25M - $50M</SelectItem>
                            <SelectItem value="50-100">$50M - $100M</SelectItem>
                            <SelectItem value="100-500">$100M - $500M</SelectItem>
                            <SelectItem value="over500">Over $500M</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Your role</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ceo">CEO / Principal</SelectItem>
                            <SelectItem value="cfo">CFO / Finance</SelectItem>
                            <SelectItem value="coo">COO / Operations</SelectItem>
                            <SelectItem value="analyst">Analyst</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button type="submit" variant="glow" size="lg" className="w-full">
                        Request Demo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      <p className="text-xs text-zinc-500 text-center">
                        By submitting, you agree to our{" "}
                        <Link href="/privacy" className="text-zinc-400 hover:text-zinc-300">
                          Privacy Policy
                        </Link>{" "}
                        and{" "}
                        <Link href="/terms" className="text-zinc-400 hover:text-zinc-300">
                          Terms of Service
                        </Link>
                        .
                      </p>
                    </form>
                  ) : (
                    /* Calendly-style booking */
                    <div className="mt-8 space-y-6">
                      <div className="space-y-4">
                        <Label>Select a date</Label>
                        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
                          {/* Month/year header with navigation */}
                          <div className="flex items-center justify-between mb-4">
                            <button
                              onClick={() =>
                                canGoPrevMonth &&
                                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                              }
                              disabled={!canGoPrevMonth}
                              className={cn(
                                "p-1.5 rounded-md transition-colors",
                                canGoPrevMonth
                                  ? "text-zinc-300 hover:bg-zinc-800"
                                  : "text-zinc-700 cursor-not-allowed"
                              )}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium text-zinc-100">
                              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                            </span>
                            <button
                              onClick={() =>
                                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                              }
                              className="p-1.5 rounded-md text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Day-of-week headers */}
                          <div className="grid grid-cols-7 gap-1 mb-1">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                              <div key={d} className="text-center text-xs text-zinc-500 py-1">
                                {d}
                              </div>
                            ))}
                          </div>

                          {/* Day cells */}
                          <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((cell, i) =>
                              cell === null ? (
                                <div key={`empty-${i}`} />
                              ) : (
                                <button
                                  key={cell.date}
                                  onClick={() => !cell.disabled && setSelectedDate(cell.date)}
                                  disabled={cell.disabled}
                                  className={cn(
                                    "h-9 w-full rounded-md text-sm transition-colors",
                                    cell.disabled && "text-zinc-700 cursor-not-allowed",
                                    !cell.disabled && selectedDate === cell.date
                                      ? "bg-teal-500/20 text-teal-400 font-medium"
                                      : !cell.disabled && "text-zinc-300 hover:bg-zinc-800"
                                  )}
                                >
                                  {cell.day}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {selectedDate && (
                        <div className="space-y-4">
                          <Label>Select a time (PST)</Label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {timeSlots.map((slot) => (
                              <button
                                key={slot.time}
                                onClick={() => slot.available && setSelectedTime(slot.time)}
                                disabled={!slot.available}
                                className={cn(
                                  "p-3 rounded-lg border text-sm transition-colors",
                                  !slot.available && "opacity-50 cursor-not-allowed bg-zinc-900/50 border-zinc-800 text-zinc-600",
                                  slot.available && selectedTime === slot.time
                                    ? "bg-teal-500/20 border-teal-500/50 text-teal-400"
                                    : slot.available && "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                                )}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedDate && selectedTime && (
                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="calFirstName">First name</Label>
                              <Input id="calFirstName" placeholder="John" required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="calLastName">Last name</Label>
                              <Input id="calLastName" placeholder="Smith" required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="calEmail">Work email</Label>
                            <Input id="calEmail" type="email" placeholder="john@company.com" required />
                          </div>
                          <Button onClick={handleSubmit} variant="glow" size="lg" className="w-full">
                            Confirm Booking
                            <Calendar className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-8 p-8 rounded-xl border border-teal-500/30 bg-teal-500/5 text-center">
                  <div className="p-4 rounded-full bg-teal-500/10 w-fit mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-100">
                    {bookingMode === "calendar" ? "Demo Booked!" : "Thank you!"}
                  </h3>
                  <p className="mt-2 text-zinc-400">
                    {bookingMode === "calendar"
                      ? `Your demo is scheduled for ${selectedTime} EST. Check your email for calendar invite and meeting details.`
                      : "We've received your request. Our team will reach out within 24 hours to schedule your personalized demo."}
                  </p>
                  <Button variant="outline" className="mt-6" asChild>
                    <Link href="/app">
                      Explore the Demo App
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </animated.div>

            {/* Right: Benefits */}
            <div className="lg:pt-16">
              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-teal-500/10">
                      <Calendar className="h-5 w-5 text-teal-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">30-minute call</p>
                      <p className="text-sm text-zinc-400">
                        Personalized to your needs
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {demoBenefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-center gap-3 text-sm text-zinc-300"
                      >
                        <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-5 w-5 text-teal-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-zinc-100">500+</p>
                    <p className="text-xs text-zinc-400">Active firms</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Shield className="h-5 w-5 text-teal-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-zinc-100">$50B+</p>
                    <p className="text-xs text-zinc-400">AUM managed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Testimonials */}
              <div className="space-y-4">
                {testimonials.map((testimonial, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <p className="text-sm text-zinc-300 italic">
                        &ldquo;{testimonial.quote}&rdquo;
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
                          {testimonial.author.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {testimonial.author}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {testimonial.role}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll See */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Demo Preview
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              What you&apos;ll see in your demo
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
              Get a comprehensive walkthrough of every feature designed to
              simplify your wealth management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="hover:border-teal-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-teal-500/10">
                      <benefit.icon className="h-6 w-6 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100 text-lg">
                        {benefit.title}
                      </h3>
                      <p className="mt-2 text-zinc-400">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Video Preview */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
              Preview the platform
            </h2>
            <p className="mt-4 text-zinc-400">
              Watch a quick overview before your personalized demo.
            </p>
          </div>

          {/* Video placeholder */}
          <div className="relative aspect-video rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-6 rounded-full bg-teal-500/20 border border-teal-500/30 group-hover:bg-teal-500/30 transition-colors">
                <Play className="h-12 w-12 text-teal-400 ml-1" />
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-zinc-400 text-sm">Platform Overview</p>
              <p className="text-zinc-100 font-medium">2:45 min</p>
            </div>
          </div>
        </div>
      </section>

      {/* Try Demo CTA */}
      <section className="py-16 lg:py-24 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
            Want to explore on your own?
          </h2>
          <p className="mt-4 text-zinc-400">
            Try our interactive demo dashboard with sample data.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Button variant="glow" size="lg" asChild>
              <Link href="/app">
                Launch Demo Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
