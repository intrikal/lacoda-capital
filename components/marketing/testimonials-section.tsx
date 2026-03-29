"use client"

import * as React from "react"
import { Building2, TrendingUp, Briefcase, Users, Landmark, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const firmTypes = [
  {
    icon: Building2,
    title: "Family Offices",
    description: "Unified view of multi-generational wealth across real estate, equities, private holdings, and cash.",
  },
  {
    icon: Briefcase,
    title: "Private Equity Firms",
    description: "Track portfolio companies, capital calls, distributions, and LP reporting in one place.",
  },
  {
    icon: Users,
    title: "Wealth Managers",
    description: "Manage client portfolios across asset classes with real-time valuations and controlled stakeholder access.",
  },
  {
    icon: BarChart3,
    title: "Alternative Asset Managers",
    description: "Handle complex ownership structures across real estate, VC, hedge funds, and commodity positions.",
  },
  {
    icon: Landmark,
    title: "Investment Partnerships",
    description: "Shared visibility for partners with role-based access, immutable audit trails, and document vaults.",
  },
  {
    icon: TrendingUp,
    title: "Multi-Asset Holding Companies",
    description: "Consolidate fragmented holdings across subsidiaries, entities, and asset types into a single ledger.",
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
// Firm Type Card
// ─────────────────────────────────────────────────────────────────────────────

function FirmCard({ firm }: { firm: typeof firmTypes[0] }) {
  return (
    <div className="group flex items-start gap-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-tiffany-500/30 hover:bg-zinc-900 transition-all">
      <div className="p-3 rounded-lg bg-tiffany-500/10 group-hover:bg-tiffany-500/20 transition-colors flex-shrink-0">
        <firm.icon className="h-5 w-5 text-tiffany-500" />
      </div>
      <div>
        <h3 className="font-semibold text-zinc-100 text-sm">{firm.title}</h3>
        <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{firm.description}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TestimonialsSection() {
  return (
    <section className="py-24 lg:py-32 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-6">Built For</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            Designed for complex portfolios
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            Lacoda is built for firms that manage assets across multiple classes, entities, and stakeholders.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {firmTypes.map((firm) => (
            <FirmCard key={firm.title} firm={firm} />
          ))}
        </div>
      </div>
    </section>
  )
}
