"use client"

import * as React from "react"
import { Quote } from "lucide-react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const testimonials = [
  {
    quote: "We went from 12 different spreadsheets and 5 portals to one dashboard. The time savings alone paid for Lacoda in the first month.",
    author: "Verified User",
    title: "CFO",
    company: "Multi-Family Office",
    avatar: "CF",
  },
  {
    quote: "The audit trail feature has been invaluable for compliance. Every action is logged, every document is versioned. Our auditors love it.",
    author: "Verified User",
    title: "Managing Director",
    company: "Private Equity Firm",
    avatar: "MD",
  },
  {
    quote: "Finally, a platform that understands alternative assets. Real estate, private equity, venture - it all just works together.",
    author: "Verified User",
    title: "Principal",
    company: "Alternative Asset Manager",
    avatar: "PR",
  },
  {
    quote: "The stakeholder portal changed how we communicate with our family members. Everyone has the right level of visibility now.",
    author: "Verified User",
    title: "Director of Operations",
    company: "Family Office",
    avatar: "DO",
  },
  {
    quote: "We evaluated 8 platforms before choosing Lacoda. Nothing else came close in terms of handling complex ownership structures.",
    author: "Verified User",
    title: "COO",
    company: "Wealth Management Firm",
    avatar: "CO",
  },
  {
    quote: "Implementation was seamless. Their team migrated 15 years of data in under a week. I was skeptical but they delivered.",
    author: "Verified User",
    title: "Operations Lead",
    company: "Investment Partnership",
    avatar: "OL",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Badge Component (local copy to avoid dependencies)
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        "bg-tiffany-500/10 text-tiffany-500 ring-1 ring-inset ring-tiffany-500/20",
        className
      )}
    >
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Testimonial Card
// ─────────────────────────────────────────────────────────────────────────────

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <div className="flex-shrink-0 w-[350px] border-r border-zinc-800 last:border-r-0">
      <div className="h-full bg-zinc-900/80 p-6">
        <Quote className="h-8 w-8 text-tiffany-500/30 mb-4" />
        <p className="text-zinc-300 leading-relaxed mb-6 text-sm">
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-sm font-semibold text-tiffany-500">
              {testimonial.avatar}
            </span>
          </div>
          <div>
            <p className="font-medium text-zinc-100 text-sm">{testimonial.author}</p>
            <p className="text-xs text-zinc-500">
              {testimonial.title}, {testimonial.company}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TestimonialsSection() {
  const [row1Paused, setRow1Paused] = React.useState(false)
  const [row2Paused, setRow2Paused] = React.useState(false)

  // Split testimonials into two rows
  const row1 = testimonials.slice(0, 3)
  const row2 = testimonials.slice(3, 6)

  return (
    <section className="py-24 lg:py-32 bg-zinc-950 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-16">
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="mb-6">Testimonials</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            Trusted by leading institutions
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            See why asset managers are making the switch to Lacoda.
          </p>
        </div>
      </div>

      {/* Marquee container */}
      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

        {/* Row 1 - moves left */}
        <div
          className="mb-px border-y border-zinc-800"
          onMouseEnter={() => setRow1Paused(true)}
          onMouseLeave={() => setRow1Paused(false)}
        >
          <div
            className="flex animate-marquee-left"
            style={{ animationPlayState: row1Paused ? "paused" : "running" }}
          >
            {[...row1, ...row1, ...row1, ...row1].map((testimonial, index) => (
              <TestimonialCard key={`row1-${index}`} testimonial={testimonial} />
            ))}
          </div>
        </div>

        {/* Row 2 - moves right */}
        <div
          className="border-b border-zinc-800"
          onMouseEnter={() => setRow2Paused(true)}
          onMouseLeave={() => setRow2Paused(false)}
        >
          <div
            className="flex animate-marquee-right"
            style={{ animationPlayState: row2Paused ? "paused" : "running" }}
          >
            {[...row2, ...row2, ...row2, ...row2].map((testimonial, index) => (
              <TestimonialCard key={`row2-${index}`} testimonial={testimonial} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
