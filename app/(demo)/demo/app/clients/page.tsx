"use client"

import * as React from "react"
import {
  Building2, TrendingUp, Shield, Users, DollarSign, BarChart3,
  Home, Layers, ChevronRight, CheckCircle2, Clock, XCircle,
  Minus, Search, Briefcase, LineChart, MapPin,
  BedDouble, Ruler, CalendarDays, Percent, Bitcoin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientType = "institution" | "trust" | "individual"
type ComplianceStatus = "compliant" | "pending" | "non-compliant" | "na"

interface RealEstateProperty {
  id: string
  name: string
  type: "commercial" | "residential" | "condo" | "industrial" | "land"
  address: string
  sqft: number
  beds?: number
  baths?: number
  yearBuilt: number
  purchasePrice: number
  currentValue: number
  purchaseDate: string
  mortgageBalance: number
  estimatedMonthlyRent: number
  priceHistory: { year: string; value: number }[]
}

interface StockHolding {
  ticker: string
  name: string
  shares: number
  price: number
  value: number
  gainPct: number
}

interface CryptoHolding {
  symbol: string
  name: string
  amount: number
  price: number
  value: number
  gainPct: number
}

interface PrivateEquityHolding {
  name: string
  type: string
  stage: string
  value: number
  ownership: number
}

interface ComplianceItem {
  framework: string
  status: ComplianceStatus
  lastReviewed: string
  description: string
}

interface DemoClient {
  id: string
  displayName: string
  initials: string
  clientType: ClientType
  totalAUM: number
  entityCount: number
  assetCount: number
  clientStatus: "active" | "inactive" | "pending"
  riskScore: number
  onboardedDate: string
  primaryAdvisor: string
  assetMix: { label: string; pct: number; color: string }[]
  realEstate?: RealEstateProperty[]
  investments?: {
    stocks: StockHolding[]
    crypto: CryptoHolding[]
    privateEquity: PrivateEquityHolding[]
  }
  compliance: ComplianceItem[]
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const CLIENTS: DemoClient[] = [
  {
    id: "c1",
    displayName: "Johnson Family Office",
    initials: "JF",
    clientType: "institution",
    totalAUM: 8500000,
    entityCount: 3,
    assetCount: 12,
    clientStatus: "active",
    riskScore: 62,
    onboardedDate: "2022-03-15",
    primaryAdvisor: "Sarah Anderson",
    assetMix: [
      { label: "Real Estate", pct: 72, color: "#14b8a6" },
      { label: "Equities", pct: 18, color: "#06b6d4" },
      { label: "Cash", pct: 10, color: "#10b981" },
    ],
    realEstate: [
      {
        id: "re1",
        name: "Downtown Office Complex",
        type: "commercial",
        address: "450 Market St, San Francisco, CA 94105",
        sqft: 12400,
        yearBuilt: 2008,
        purchasePrice: 3800000,
        currentValue: 4500000,
        purchaseDate: "2019-06-12",
        mortgageBalance: 2100000,
        estimatedMonthlyRent: 38000,
        priceHistory: [
          { year: "2019", value: 3800000 },
          { year: "2020", value: 3650000 },
          { year: "2021", value: 4050000 },
          { year: "2022", value: 4280000 },
          { year: "2023", value: 4420000 },
          { year: "2024", value: 4500000 },
        ],
      },
      {
        id: "re2",
        name: "Manhattan Penthouse",
        type: "residential",
        address: "432 Park Ave, Unit 82A, New York, NY 10022",
        sqft: 4800,
        beds: 5,
        baths: 6,
        yearBuilt: 2015,
        purchasePrice: 3200000,
        currentValue: 3700000,
        purchaseDate: "2020-11-08",
        mortgageBalance: 1800000,
        estimatedMonthlyRent: 28000,
        priceHistory: [
          { year: "2020", value: 3200000 },
          { year: "2021", value: 3350000 },
          { year: "2022", value: 3480000 },
          { year: "2023", value: 3620000 },
          { year: "2024", value: 3700000 },
        ],
      },
    ],
    compliance: [
      { framework: "SOC2 Type II", status: "compliant", lastReviewed: "2024-01-15", description: "Security, availability & confidentiality" },
      { framework: "GDPR", status: "compliant", lastReviewed: "2024-02-01", description: "EU data protection regulation" },
      { framework: "CCPA", status: "pending", lastReviewed: "2024-03-10", description: "California consumer privacy act" },
      { framework: "AML/KYC", status: "compliant", lastReviewed: "2024-01-20", description: "Anti-money laundering & know your customer" },
      { framework: "FINRA", status: "na", lastReviewed: "—", description: "Not applicable — non-broker-dealer" },
      { framework: "ISO 27001", status: "pending", lastReviewed: "2024-03-01", description: "Information security management" },
    ],
  },
  {
    id: "c2",
    displayName: "Smith Revocable Trust",
    initials: "SR",
    clientType: "trust",
    totalAUM: 4200000,
    entityCount: 2,
    assetCount: 8,
    clientStatus: "active",
    riskScore: 45,
    onboardedDate: "2021-08-22",
    primaryAdvisor: "Sarah Anderson",
    assetMix: [
      { label: "Real Estate", pct: 40, color: "#14b8a6" },
      { label: "Equities", pct: 35, color: "#06b6d4" },
      { label: "Fixed Income", pct: 20, color: "#8b5cf6" },
      { label: "Cash", pct: 5, color: "#10b981" },
    ],
    realEstate: [
      {
        id: "re3",
        name: "Marin County Estate",
        type: "residential",
        address: "88 Belvedere Ave, Tiburon, CA 94920",
        sqft: 6200,
        beds: 6,
        baths: 7,
        yearBuilt: 1998,
        purchasePrice: 1500000,
        currentValue: 1850000,
        purchaseDate: "2018-04-30",
        mortgageBalance: 620000,
        estimatedMonthlyRent: 14500,
        priceHistory: [
          { year: "2018", value: 1500000 },
          { year: "2019", value: 1560000 },
          { year: "2020", value: 1490000 },
          { year: "2021", value: 1680000 },
          { year: "2022", value: 1790000 },
          { year: "2023", value: 1820000 },
          { year: "2024", value: 1850000 },
        ],
      },
    ],
    investments: {
      stocks: [
        { ticker: "AAPL", name: "Apple Inc.", shares: 420, price: 189.30, value: 79506, gainPct: 34.2 },
        { ticker: "MSFT", name: "Microsoft Corp.", shares: 310, price: 415.20, value: 128712, gainPct: 28.7 },
        { ticker: "SPY", name: "SPDR S&P 500 ETF", shares: 850, price: 507.10, value: 430535, gainPct: 22.1 },
        { ticker: "VTI", name: "Vanguard Total Market ETF", shares: 1200, price: 238.90, value: 286680, gainPct: 19.8 },
      ],
      crypto: [],
      privateEquity: [],
    },
    compliance: [
      { framework: "SOC2 Type II", status: "compliant", lastReviewed: "2024-01-10", description: "Security, availability & confidentiality" },
      { framework: "GDPR", status: "na", lastReviewed: "—", description: "US-only entity — not applicable" },
      { framework: "CCPA", status: "compliant", lastReviewed: "2024-02-15", description: "California consumer privacy act" },
      { framework: "AML/KYC", status: "compliant", lastReviewed: "2024-01-18", description: "Anti-money laundering & know your customer" },
      { framework: "FINRA", status: "na", lastReviewed: "—", description: "Not applicable — non-broker-dealer" },
      { framework: "PCI-DSS", status: "na", lastReviewed: "—", description: "No payment card data stored" },
    ],
  },
  {
    id: "c3",
    displayName: "Chen Family Holdings",
    initials: "CF",
    clientType: "institution",
    totalAUM: 6800000,
    entityCount: 4,
    assetCount: 15,
    clientStatus: "active",
    riskScore: 78,
    onboardedDate: "2020-11-05",
    primaryAdvisor: "Sarah Anderson",
    assetMix: [
      { label: "Equities", pct: 55, color: "#06b6d4" },
      { label: "Crypto", pct: 20, color: "#f59e0b" },
      { label: "Private Equity", pct: 18, color: "#8b5cf6" },
      { label: "Cash", pct: 7, color: "#10b981" },
    ],
    investments: {
      stocks: [
        { ticker: "NVDA", name: "NVIDIA Corp.", shares: 1800, price: 875.40, value: 1575720, gainPct: 185.4 },
        { ticker: "TSLA", name: "Tesla Inc.", shares: 2400, price: 248.50, value: 596400, gainPct: -8.2 },
        { ticker: "META", name: "Meta Platforms", shares: 980, price: 502.30, value: 492254, gainPct: 62.1 },
        { ticker: "GOOGL", name: "Alphabet Inc.", shares: 1600, price: 174.80, value: 279680, gainPct: 41.3 },
        { ticker: "AMZN", name: "Amazon.com Inc.", shares: 2100, price: 191.25, value: 401625, gainPct: 55.7 },
        { ticker: "QQQ", name: "Invesco QQQ Trust", shares: 2800, price: 444.10, value: 1243480, gainPct: 38.9 },
      ],
      crypto: [
        { symbol: "BTC", name: "Bitcoin", amount: 8.4, price: 67200, value: 564480, gainPct: 124.8 },
        { symbol: "ETH", name: "Ethereum", amount: 96, price: 3580, value: 343680, gainPct: 68.3 },
        { symbol: "SOL", name: "Solana", amount: 1800, price: 182.40, value: 328320, gainPct: 312.5 },
        { symbol: "AVAX", name: "Avalanche", amount: 4200, price: 42.80, value: 179760, gainPct: 28.9 },
      ],
      privateEquity: [
        { name: "Series B — FinTech Startup", type: "Venture Capital", stage: "Series B", value: 1200000, ownership: 4.2 },
        { name: "Growth Equity Fund IV", type: "Private Equity", stage: "Fund", value: 600000, ownership: 2.8 },
      ],
    },
    compliance: [
      { framework: "SOC2 Type II", status: "compliant", lastReviewed: "2024-01-05", description: "Security, availability & confidentiality" },
      { framework: "GDPR", status: "compliant", lastReviewed: "2024-01-22", description: "EU data protection — international holdings" },
      { framework: "CCPA", status: "compliant", lastReviewed: "2024-02-08", description: "California consumer privacy act" },
      { framework: "AML/KYC", status: "compliant", lastReviewed: "2024-01-12", description: "Enhanced due diligence — high net worth" },
      { framework: "ISO 27001", status: "compliant", lastReviewed: "2024-02-20", description: "Information security management" },
      { framework: "FINRA", status: "pending", lastReviewed: "2024-03-05", description: "Securities holding review in progress" },
      { framework: "MiCA", status: "pending", lastReviewed: "2024-03-12", description: "EU crypto asset regulation — digital holdings" },
      { framework: "FinCEN SAR", status: "compliant", lastReviewed: "2024-01-30", description: "Suspicious activity reporting for crypto" },
    ],
  },
  {
    id: "c4",
    displayName: "Patricia Williams",
    initials: "PW",
    clientType: "individual",
    totalAUM: 2100000,
    entityCount: 1,
    assetCount: 5,
    clientStatus: "active",
    riskScore: 55,
    onboardedDate: "2023-01-10",
    primaryAdvisor: "Sarah Anderson",
    assetMix: [
      { label: "Equities", pct: 60, color: "#06b6d4" },
      { label: "Fixed Income", pct: 25, color: "#8b5cf6" },
      { label: "Crypto", pct: 10, color: "#f59e0b" },
      { label: "Cash", pct: 5, color: "#10b981" },
    ],
    investments: {
      stocks: [
        { ticker: "VOO", name: "Vanguard S&P 500 ETF", shares: 1800, price: 462.80, value: 833040, gainPct: 18.4 },
        { ticker: "BND", name: "Vanguard Total Bond ETF", shares: 3200, price: 73.40, value: 234880, gainPct: 2.1 },
        { ticker: "AAPL", name: "Apple Inc.", shares: 600, price: 189.30, value: 113580, gainPct: 22.7 },
      ],
      crypto: [
        { symbol: "BTC", name: "Bitcoin", amount: 2.1, price: 67200, value: 141120, gainPct: 89.4 },
        { symbol: "ETH", name: "Ethereum", amount: 28, price: 3580, value: 100240, gainPct: 45.2 },
      ],
      privateEquity: [],
    },
    compliance: [
      { framework: "SOC2 Type II", status: "compliant", lastReviewed: "2024-02-01", description: "Security, availability & confidentiality" },
      { framework: "GDPR", status: "na", lastReviewed: "—", description: "US resident — not applicable" },
      { framework: "CCPA", status: "compliant", lastReviewed: "2024-02-15", description: "California consumer privacy act" },
      { framework: "AML/KYC", status: "compliant", lastReviewed: "2024-02-01", description: "Standard KYC for individual account" },
      { framework: "FinCEN SAR", status: "compliant", lastReviewed: "2024-02-08", description: "Crypto holdings reporting" },
      { framework: "FINRA", status: "na", lastReviewed: "—", description: "Not applicable — advisory only" },
    ],
  },
  {
    id: "c5",
    displayName: "Patel Enterprises LLC",
    initials: "PE",
    clientType: "institution",
    totalAUM: 2900000,
    entityCount: 2,
    assetCount: 7,
    clientStatus: "active",
    riskScore: 70,
    onboardedDate: "2022-07-18",
    primaryAdvisor: "Sarah Anderson",
    assetMix: [
      { label: "Private Equity", pct: 48, color: "#8b5cf6" },
      { label: "Real Estate", pct: 30, color: "#14b8a6" },
      { label: "Equities", pct: 15, color: "#06b6d4" },
      { label: "Cash", pct: 7, color: "#10b981" },
    ],
    realEstate: [
      {
        id: "re4",
        name: "Austin Mixed-Use Development",
        type: "commercial",
        address: "2801 S Congress Ave, Austin, TX 78704",
        sqft: 8600,
        yearBuilt: 2021,
        purchasePrice: 720000,
        currentValue: 880000,
        purchaseDate: "2021-09-14",
        mortgageBalance: 480000,
        estimatedMonthlyRent: 9800,
        priceHistory: [
          { year: "2021", value: 720000 },
          { year: "2022", value: 780000 },
          { year: "2023", value: 840000 },
          { year: "2024", value: 880000 },
        ],
      },
    ],
    investments: {
      stocks: [
        { ticker: "SPY", name: "SPDR S&P 500 ETF", shares: 640, price: 507.10, value: 324544, gainPct: 15.6 },
        { ticker: "VGT", name: "Vanguard Info Tech ETF", shares: 320, price: 522.80, value: 167296, gainPct: 42.3 },
      ],
      crypto: [],
      privateEquity: [
        { name: "Venture Capital Fund III", type: "Venture Capital", stage: "Fund", value: 900000, ownership: 3.1 },
        { name: "Series A — PropTech Co", type: "Venture Capital", stage: "Series A", value: 480000, ownership: 8.5 },
      ],
    },
    compliance: [
      { framework: "SOC2 Type II", status: "compliant", lastReviewed: "2024-01-28", description: "Security, availability & confidentiality" },
      { framework: "GDPR", status: "na", lastReviewed: "—", description: "US-only operations" },
      { framework: "CCPA", status: "compliant", lastReviewed: "2024-02-10", description: "California consumer privacy act" },
      { framework: "AML/KYC", status: "pending", lastReviewed: "2024-03-08", description: "Enhanced due diligence renewal due" },
      { framework: "ISO 27001", status: "non-compliant", lastReviewed: "2024-03-01", description: "Certification lapsed — renewal in progress" },
      { framework: "PCI-DSS", status: "na", lastReviewed: "—", description: "No payment card processing" },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function formatCurrencyFull(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n)
}

const TYPE_LABELS: Record<ClientType, string> = {
  institution: "Institution",
  trust: "Trust",
  individual: "Individual",
}

const TYPE_COLORS: Record<ClientType, string> = {
  institution: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  trust: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  individual: "bg-tiffany-500/10 text-tiffany-500 border-tiffany-500/20",
}

const COMPLIANCE_CONFIG: Record<ComplianceStatus, { icon: React.ReactNode; color: string; label: string }> = {
  compliant: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Compliant" },
  pending: { icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Pending" },
  "non-compliant": { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-400 bg-red-500/10 border-red-500/20", label: "Non-Compliant" },
  na: { icon: <Minus className="h-3.5 w-3.5" />, color: "text-zinc-500 bg-zinc-800/50 border-zinc-700/30", label: "N/A" },
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = "#14b8a6" }: { data: { year: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value))
  const min = Math.min(...data.map((d) => d.value))
  const range = max - min || 1
  const w = 120
  const h = 36
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (w - 4) + 2
    const y = h - ((d.value - min) / range) * (h - 8) - 4
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * (w - 4) + 2
        const y = h - ((d.value - min) / range) * (h - 8) - 4
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      })}
    </svg>
  )
}

// ─── Asset mix bar ────────────────────────────────────────────────────────────

function AssetMixBar({ mix }: { mix: DemoClient["assetMix"] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden">
        {mix.map((seg) => (
          <div key={seg.label} style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {mix.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] text-zinc-500">{seg.label} {seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Property card ────────────────────────────────────────────────────────────

function PropertyCard({ prop }: { prop: RealEstateProperty }) {
  const ltv = prop.mortgageBalance / prop.currentValue * 100
  const totalGain = prop.currentValue - prop.purchasePrice
  const gainPct = (totalGain / prop.purchasePrice) * 100

  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-800/60 border-b border-zinc-700/40 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {prop.type === "commercial" ? (
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <Home className="h-3.5 w-3.5 text-zinc-400" />
            )}
            <span className="text-xs text-zinc-400 capitalize">{prop.type}</span>
          </div>
          <p className="text-sm font-semibold text-zinc-100">{prop.name}</p>
          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {prop.address}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-zinc-100">{formatCurrencyFull(prop.currentValue)}</p>
          <p className={cn("text-xs font-medium", gainPct >= 0 ? "text-emerald-400" : "text-red-400")}>
            {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}% since purchase
          </p>
        </div>
      </div>

      {/* Details grid */}
      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Ruler className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">{prop.sqft.toLocaleString()} sq ft</span>
          </div>
          {prop.beds && (
            <div className="flex items-center gap-2">
              <BedDouble className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400">{prop.beds} bed / {prop.baths} bath</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Built {prop.yearBuilt}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Purchased {new Date(prop.purchaseDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })} · {formatCurrencyFull(prop.purchasePrice)}</span>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">LTV {ltv.toFixed(0)}% · Mortgage {formatCurrency(prop.mortgageBalance)}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Est. rent {formatCurrencyFull(prop.estimatedMonthlyRent)}/mo</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">$/sq ft {(prop.currentValue / prop.sqft).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Equity {formatCurrency(prop.currentValue - prop.mortgageBalance)}</span>
          </div>
        </div>
      </div>

      {/* Price history */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Price History</p>
        <div className="flex items-end justify-between gap-2">
          <Sparkline data={prop.priceHistory} color="#14b8a6" />
          <div className="text-right">
            {prop.priceHistory.map((p) => (
              <div key={p.year} className="flex items-center justify-end gap-2">
                <span className="text-[10px] text-zinc-600">{p.year}</span>
                <span className="text-[10px] text-zinc-400">{formatCurrency(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Holdings tab ─────────────────────────────────────────────────────────────

function HoldingsTab({ client }: { client: DemoClient }) {
  const inv = client.investments
  const re = client.realEstate

  if (!inv && !re) {
    return <p className="text-sm text-zinc-500 text-center py-12">No detailed holdings data available.</p>
  }

  return (
    <div className="space-y-6">
      {/* Real estate */}
      {re && re.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-tiffany-500" />
            <h3 className="text-sm font-semibold text-zinc-100">Real Estate Holdings</h3>
          </div>
          <div className="space-y-3">
            {re.map((prop) => <PropertyCard key={prop.id} prop={prop} />)}
          </div>
        </div>
      )}

      {/* Stocks */}
      {inv && inv.stocks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LineChart className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Equity Holdings</h3>
          </div>
          <div className="rounded-xl border border-zinc-700/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700/60 bg-zinc-800/40">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">Ticker</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">Name</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">Shares</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">Price</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">Value</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">Gain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {inv.stocks.map((s) => (
                  <tr key={s.ticker} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono font-bold text-tiffany-500 bg-tiffany-500/10 px-1.5 py-0.5 rounded">{s.ticker}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400">{s.name}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-300">{s.shares.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-300">${s.price.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-medium text-zinc-100">{formatCurrencyFull(s.value)}</td>
                    <td className={cn("px-4 py-2.5 text-right text-xs font-medium", s.gainPct >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {s.gainPct >= 0 ? "+" : ""}{s.gainPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Crypto */}
      {inv && inv.crypto.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bitcoin className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Digital Assets</h3>
          </div>
          <div className="rounded-xl border border-zinc-700/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700/60 bg-zinc-800/40">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">Asset</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">Amount</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">Price</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">Value</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">Gain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {inv.crypto.map((c) => (
                  <tr key={c.symbol} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{c.symbol}</span>
                        <span className="text-xs text-zinc-500 ml-2">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-300">{c.amount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-300">{formatCurrencyFull(c.price)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-medium text-zinc-100">{formatCurrencyFull(c.value)}</td>
                    <td className={cn("px-4 py-2.5 text-right text-xs font-medium", c.gainPct >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {c.gainPct >= 0 ? "+" : ""}{c.gainPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Private equity */}
      {inv && inv.privateEquity.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Private Equity & Venture</h3>
          </div>
          <div className="space-y-2">
            {inv.privateEquity.map((pe) => (
              <div key={pe.name} className="flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-700/60 bg-zinc-800/40">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{pe.name}</p>
                  <p className="text-xs text-zinc-500">{pe.type} · {pe.stage} · {pe.ownership}% ownership</p>
                </div>
                <p className="text-sm font-semibold text-zinc-100">{formatCurrencyFull(pe.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Compliance tab ───────────────────────────────────────────────────────────

function ComplianceTab({ client }: { client: DemoClient }) {
  const counts = {
    compliant: client.compliance.filter((c) => c.status === "compliant").length,
    pending: client.compliance.filter((c) => c.status === "pending").length,
    "non-compliant": client.compliance.filter((c) => c.status === "non-compliant").length,
  }
  const applicable = client.compliance.filter((c) => c.status !== "na").length
  const score = applicable > 0 ? Math.round((counts.compliant / applicable) * 100) : 100

  return (
    <div className="space-y-5">
      {/* Score bar */}
      <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-100">Compliance Score</p>
          <span className={cn("text-lg font-bold", score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400")}>
            {score}%
          </span>
        </div>
        <div className="h-2 bg-zinc-700/60 rounded-full overflow-hidden mb-3">
          <div
            className={cn("h-full rounded-full transition-all", score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500")}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex gap-4 text-xs text-zinc-400">
          <span className="text-emerald-400">{counts.compliant} compliant</span>
          <span className="text-amber-400">{counts.pending} pending</span>
          {counts["non-compliant"] > 0 && <span className="text-red-400">{counts["non-compliant"]} non-compliant</span>}
        </div>
      </div>

      {/* Framework list */}
      <div className="space-y-2">
        {client.compliance.map((item) => {
          const cfg = COMPLIANCE_CONFIG[item.status]
          return (
            <div key={item.framework} className="flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-700/60 bg-zinc-800/30">
              <div className="flex items-center gap-3">
                <Shield className={cn("h-4 w-4", item.status === "compliant" ? "text-emerald-400" : item.status === "pending" ? "text-amber-400" : item.status === "non-compliant" ? "text-red-400" : "text-zinc-600")} />
                <div>
                  <p className="text-sm font-medium text-zinc-100">{item.framework}</p>
                  <p className="text-xs text-zinc-500">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {item.lastReviewed !== "—" && (
                  <span className="text-[10px] text-zinc-600">Reviewed {new Date(item.lastReviewed).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                )}
                <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border", cfg.color)}>
                  {cfg.icon}
                  {cfg.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Client detail panel ──────────────────────────────────────────────────────

function ClientDetailPanel({ client }: { client: DemoClient }) {
  const [tab, setTab] = React.useState<"overview" | "holdings" | "compliance">("overview")

  const TABS = [
    { id: "overview" as const, label: "Overview", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "holdings" as const, label: "Holdings", icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "compliance" as const, label: "Compliance", icon: <Shield className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Client header */}
      <div className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-tiffany-500/20 to-cyan-500/20 flex items-center justify-center ring-1 ring-tiffany-500/30 shrink-0">
              <span className="text-sm font-bold text-tiffany-500">{client.initials}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">{client.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", TYPE_COLORS[client.clientType])}>
                  {TYPE_LABELS[client.clientType]}
                </span>
                <span className="text-xs text-zinc-500">Advisor: {client.primaryAdvisor}</span>
              </div>
            </div>
          </div>
          <DemoMutationTooltip>
            <button className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors opacity-60">
              Edit Client
            </button>
          </DemoMutationTooltip>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total AUM", value: formatCurrencyFull(client.totalAUM), icon: <DollarSign className="h-3.5 w-3.5" /> },
            { label: "Assets", value: client.assetCount, icon: <Briefcase className="h-3.5 w-3.5" /> },
            { label: "Entities", value: client.entityCount, icon: <Users className="h-3.5 w-3.5" /> },
            { label: "Risk Score", value: client.riskScore, icon: <TrendingUp className="h-3.5 w-3.5" /> },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-3 py-2">
              <div className="flex items-center gap-1 text-zinc-500 mb-1">{kpi.icon}<span className="text-[10px]">{kpi.label}</span></div>
              <p className="text-sm font-bold text-zinc-100">{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-zinc-800/60">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-tiffany-500/10 text-tiffany-500"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Asset Allocation</p>
              <AssetMixBar mix={client.assetMix} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
                <p className="text-xs text-zinc-500 mb-1">Onboarded</p>
                <p className="text-sm text-zinc-100">{new Date(client.onboardedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
                <p className="text-xs text-zinc-500 mb-1">Risk Profile</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-100">{client.riskScore}/100</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", client.riskScore >= 70 ? "bg-red-500/10 text-red-400" : client.riskScore >= 50 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400")}>
                    {client.riskScore >= 70 ? "Aggressive" : client.riskScore >= 50 ? "Moderate" : "Conservative"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Holdings Summary</p>
              {client.realEstate && (
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                  <div className="flex items-center gap-2 text-xs text-zinc-400"><Building2 className="h-3.5 w-3.5 text-tiffany-500" />Real Estate ({client.realEstate.length} properties)</div>
                  <span className="text-xs font-medium text-zinc-100">{formatCurrencyFull(client.realEstate.reduce((s, p) => s + p.currentValue, 0))}</span>
                </div>
              )}
              {client.investments?.stocks && client.investments.stocks.length > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                  <div className="flex items-center gap-2 text-xs text-zinc-400"><LineChart className="h-3.5 w-3.5 text-blue-400" />Equities ({client.investments.stocks.length} positions)</div>
                  <span className="text-xs font-medium text-zinc-100">{formatCurrencyFull(client.investments.stocks.reduce((s, x) => s + x.value, 0))}</span>
                </div>
              )}
              {client.investments?.crypto && client.investments.crypto.length > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                  <div className="flex items-center gap-2 text-xs text-zinc-400"><Bitcoin className="h-3.5 w-3.5 text-amber-400" />Digital Assets ({client.investments.crypto.length} positions)</div>
                  <span className="text-xs font-medium text-zinc-100">{formatCurrencyFull(client.investments.crypto.reduce((s, x) => s + x.value, 0))}</span>
                </div>
              )}
              {client.investments?.privateEquity && client.investments.privateEquity.length > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400"><Briefcase className="h-3.5 w-3.5 text-purple-400" />Private Equity ({client.investments.privateEquity.length} positions)</div>
                  <span className="text-xs font-medium text-zinc-100">{formatCurrencyFull(client.investments.privateEquity.reduce((s, x) => s + x.value, 0))}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {tab === "holdings" && <HoldingsTab client={client} />}
        {tab === "compliance" && <ComplianceTab client={client} />}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoClientsPage() {
  const [selectedId, setSelectedId] = React.useState<string>("c1")
  const [search, setSearch] = React.useState("")

  const filtered = CLIENTS.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase())
  )
  const selected = CLIENTS.find((c) => c.id === selectedId) ?? CLIENTS[0]

  return (
    <div className="flex h-full gap-0 -m-6 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
      {/* ── Left panel: client list ─────────────────────────────────────── */}
      <div className="w-[320px] shrink-0 flex flex-col border-r border-zinc-800/60 bg-zinc-900/30">
        {/* List header */}
        <div className="px-4 pt-5 pb-3 border-b border-zinc-800/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-zinc-100">Clients</h1>
              <p className="text-xs text-zinc-500">{CLIENTS.length} active</p>
            </div>
            <DemoMutationTooltip>
              <button className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100/5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
                + Add
              </button>
            </DemoMutationTooltip>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedId(client.id)}
              className={cn(
                "w-full text-left px-4 py-3 transition-colors group",
                selectedId === client.id
                  ? "bg-tiffany-500/8 border-r-2 border-tiffany-500"
                  : "hover:bg-zinc-800/30 border-r-2 border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-1 transition-all",
                  selectedId === client.id
                    ? "bg-tiffany-500/20 text-tiffany-500 ring-tiffany-500/30"
                    : "bg-zinc-800 text-zinc-400 ring-zinc-700/50 group-hover:ring-zinc-600/50"
                )}>
                  {client.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-xs font-semibold truncate", selectedId === client.id ? "text-zinc-100" : "text-zinc-200")}>
                      {client.displayName}
                    </p>
                    <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-colors", selectedId === client.id ? "text-tiffany-500" : "text-zinc-600 group-hover:text-zinc-400")} />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-zinc-500">{formatCurrency(client.totalAUM)}</p>
                    <span className={cn("text-[10px] px-1.5 py-px rounded border font-medium", TYPE_COLORS[client.clientType])}>
                      {TYPE_LABELS[client.clientType]}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <div className="flex h-1 rounded-full overflow-hidden">
                      {client.assetMix.map((seg) => (
                        <div key={seg.label} style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} className="opacity-60" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right panel: client detail ──────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <ClientDetailPanel key={selected.id} client={selected} />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            Select a client to view details
          </div>
        )}
      </div>
    </div>
  )
}
