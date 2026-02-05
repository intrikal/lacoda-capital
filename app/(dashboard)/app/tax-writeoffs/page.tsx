"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronRight,
  Building2,
  User,
  DollarSign,
  FileText,
  Car,
  Home,
  Briefcase,
  GraduationCap,
  Heart,
  Plane,
  Utensils,
  Wifi,
  Phone,
  Monitor,
  Receipt,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import type { LucideIcon } from "lucide-react"
import {
  TaxSavingsChart,
  AllocationChart,
  InvestmentReturnsChart,
  pieColors,
} from "@/components/dashboard/charts"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TaxDeductible {
  id: string
  name: string
  category: string
  description: string
  maxDeduction?: number
  percentage?: number
  requirements: string[]
  documentation: string[]
  status: "eligible" | "pending_review" | "claimed" | "ineligible"
  estimatedSavings?: number
  notes?: string
}

interface DeductibleCategory {
  id: string
  name: string
  icon: LucideIcon
  description: string
  type: "personal" | "business" | "both"
  color: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const categories: DeductibleCategory[] = [
  {
    id: "home-office",
    name: "Home Office",
    icon: Home,
    description: "Deductions for dedicated home workspace",
    type: "both",
    color: "#14b8a6",
  },
  {
    id: "vehicle",
    name: "Vehicle & Mileage",
    icon: Car,
    description: "Business use of personal vehicle",
    type: "both",
    color: "#0891b2",
  },
  {
    id: "travel",
    name: "Business Travel",
    icon: Plane,
    description: "Lodging, airfare, and related expenses",
    type: "business",
    color: "#8b5cf6",
  },
  {
    id: "equipment",
    name: "Equipment & Software",
    icon: Monitor,
    description: "Computers, software, and office equipment",
    type: "business",
    color: "#f59e0b",
  },
  {
    id: "professional",
    name: "Professional Services",
    icon: Briefcase,
    description: "Legal, accounting, and consulting fees",
    type: "business",
    color: "#ec4899",
  },
  {
    id: "education",
    name: "Education & Training",
    icon: GraduationCap,
    description: "Courses, certifications, and professional development",
    type: "both",
    color: "#10b981",
  },
  {
    id: "healthcare",
    name: "Healthcare & Insurance",
    icon: Heart,
    description: "Medical expenses and health insurance premiums",
    type: "personal",
    color: "#ef4444",
  },
  {
    id: "meals",
    name: "Meals & Entertainment",
    icon: Utensils,
    description: "Business meals and client entertainment",
    type: "business",
    color: "#f97316",
  },
  {
    id: "utilities",
    name: "Utilities & Services",
    icon: Wifi,
    description: "Internet, phone, and utility expenses",
    type: "both",
    color: "#06b6d4",
  },
  {
    id: "charitable",
    name: "Charitable Contributions",
    icon: Heart,
    description: "Donations to qualified organizations",
    type: "personal",
    color: "#a855f7",
  },
]

const personalDeductibles: TaxDeductible[] = [
  {
    id: "pers-001",
    name: "Mortgage Interest",
    category: "Home",
    description: "Interest paid on primary residence mortgage up to $750,000 loan amount",
    maxDeduction: 750000,
    requirements: [
      "Must be primary or secondary residence",
      "Loan must be secured by the home",
      "Interest must be paid during tax year",
    ],
    documentation: ["Form 1098 from lender", "Loan statements", "Closing documents"],
    status: "claimed",
    estimatedSavings: 12450,
  },
  {
    id: "pers-002",
    name: "State & Local Taxes (SALT)",
    category: "Taxes",
    description: "State income, sales, and property taxes combined",
    maxDeduction: 10000,
    requirements: [
      "Must itemize deductions",
      "Combined limit of $10,000 for all SALT",
      "Cannot deduct foreign taxes",
    ],
    documentation: ["Property tax statements", "State tax returns", "Sales tax records"],
    status: "claimed",
    estimatedSavings: 10000,
  },
  {
    id: "pers-003",
    name: "Medical Expenses",
    category: "Healthcare",
    description: "Unreimbursed medical expenses exceeding 7.5% of AGI",
    percentage: 7.5,
    requirements: [
      "Must exceed 7.5% of Adjusted Gross Income",
      "Must be for diagnosis, cure, or treatment",
      "Cannot include cosmetic procedures",
    ],
    documentation: ["Medical bills", "Insurance EOBs", "Prescription receipts", "Mileage logs for medical travel"],
    status: "eligible",
    estimatedSavings: 3200,
  },
  {
    id: "pers-004",
    name: "Charitable Cash Donations",
    category: "Charitable",
    description: "Cash contributions to qualified 501(c)(3) organizations",
    percentage: 60,
    requirements: [
      "Organization must be IRS-qualified",
      "Written acknowledgment for donations over $250",
      "Cannot exceed 60% of AGI for cash donations",
    ],
    documentation: ["Donation receipts", "Bank statements", "Acknowledgment letters"],
    status: "claimed",
    estimatedSavings: 8500,
  },
  {
    id: "pers-005",
    name: "Student Loan Interest",
    category: "Education",
    description: "Interest paid on qualified student loans",
    maxDeduction: 2500,
    requirements: [
      "Must be legally obligated to pay",
      "Filing status cannot be married filing separately",
      "Income limits apply (phase-out begins at $70K single)",
    ],
    documentation: ["Form 1098-E from lender", "Loan statements"],
    status: "claimed",
    estimatedSavings: 2500,
  },
  {
    id: "pers-006",
    name: "IRA Contributions",
    category: "Retirement",
    description: "Traditional IRA contributions may be fully or partially deductible",
    maxDeduction: 6500,
    requirements: [
      "Must have earned income",
      "Age limits apply (under 73 for 2024)",
      "Deductibility depends on income and workplace plan coverage",
    ],
    documentation: ["Form 5498 from custodian", "Contribution receipts"],
    status: "eligible",
    estimatedSavings: 6500,
    notes: "Consider backdoor Roth if income exceeds limits",
  },
  {
    id: "pers-007",
    name: "Health Savings Account (HSA)",
    category: "Healthcare",
    description: "Contributions to HSA for those with high-deductible health plans",
    maxDeduction: 3850,
    requirements: [
      "Must have HDHP coverage",
      "Cannot be enrolled in Medicare",
      "Cannot be claimed as dependent",
    ],
    documentation: ["Form 5498-SA", "HDHP enrollment confirmation"],
    status: "claimed",
    estimatedSavings: 3850,
  },
  {
    id: "pers-008",
    name: "Home Office (Employee)",
    category: "Home Office",
    description: "Unreimbursed employee home office expenses (limited after TCJA)",
    requirements: [
      "Must be for employer's convenience",
      "Space must be used regularly and exclusively for work",
      "Generally not deductible for W-2 employees after 2017",
    ],
    documentation: ["Employer letter", "Home measurements", "Utility bills"],
    status: "ineligible",
    notes: "Not deductible for W-2 employees under current tax law",
  },
]

const businessDeductibles: TaxDeductible[] = [
  {
    id: "bus-001",
    name: "Home Office Deduction",
    category: "Home Office",
    description: "Dedicated space used regularly and exclusively for business",
    requirements: [
      "Space must be used exclusively for business",
      "Must be principal place of business OR meet clients there",
      "Can use simplified method ($5/sq ft up to 300 sq ft)",
    ],
    documentation: ["Home measurements", "Floor plan", "Utility bills", "Mortgage/rent statements"],
    status: "claimed",
    estimatedSavings: 1500,
  },
  {
    id: "bus-002",
    name: "Vehicle Expenses (Standard Mileage)",
    category: "Vehicle",
    description: "Business miles at IRS standard rate (67 cents/mile for 2024)",
    requirements: [
      "Must keep contemporaneous mileage log",
      "Cannot switch methods mid-year",
      "Must own or lease the vehicle",
    ],
    documentation: ["Mileage log with dates, destinations, business purpose", "Odometer readings"],
    status: "claimed",
    estimatedSavings: 8040,
    notes: "12,000 business miles tracked this year",
  },
  {
    id: "bus-003",
    name: "Business Travel",
    category: "Travel",
    description: "Airfare, lodging, meals, and transportation while traveling for business",
    percentage: 50,
    requirements: [
      "Travel must be primarily for business",
      "Must be away from tax home overnight",
      "Meals limited to 50% deduction",
    ],
    documentation: ["Receipts", "Itineraries", "Meeting notes", "Business purpose documentation"],
    status: "claimed",
    estimatedSavings: 15200,
  },
  {
    id: "bus-004",
    name: "Professional Services",
    category: "Professional",
    description: "Legal, accounting, consulting, and other professional fees",
    requirements: [
      "Must be ordinary and necessary for business",
      "Must be directly related to business operations",
    ],
    documentation: ["Invoices", "Engagement letters", "Payment records"],
    status: "claimed",
    estimatedSavings: 24000,
  },
  {
    id: "bus-005",
    name: "Software & Subscriptions",
    category: "Equipment",
    description: "Business software, SaaS subscriptions, and digital tools",
    requirements: [
      "Must be used for business purposes",
      "Personal use portion not deductible",
    ],
    documentation: ["Invoices", "Subscription confirmations", "Usage logs"],
    status: "claimed",
    estimatedSavings: 8400,
  },
  {
    id: "bus-006",
    name: "Equipment (Section 179)",
    category: "Equipment",
    description: "Immediate expensing of business equipment purchases",
    maxDeduction: 1160000,
    requirements: [
      "Must be tangible personal property",
      "Must be used more than 50% for business",
      "Must be placed in service during tax year",
    ],
    documentation: ["Purchase receipts", "Asset list", "Business use percentage calculation"],
    status: "eligible",
    estimatedSavings: 45000,
    notes: "New equipment purchases planned for Q4",
  },
  {
    id: "bus-007",
    name: "Health Insurance Premiums (Self-Employed)",
    category: "Healthcare",
    description: "100% deduction for self-employed health insurance premiums",
    requirements: [
      "Must be self-employed with net profit",
      "Cannot be eligible for employer-sponsored plan",
      "Deduction limited to net self-employment income",
    ],
    documentation: ["Premium statements", "1095 forms", "Schedule C"],
    status: "claimed",
    estimatedSavings: 18000,
  },
  {
    id: "bus-008",
    name: "Retirement Plan Contributions (SEP-IRA)",
    category: "Retirement",
    description: "SEP-IRA contributions up to 25% of net self-employment income",
    maxDeduction: 66000,
    requirements: [
      "Must have net self-employment income",
      "Contribution deadline is tax filing deadline",
      "Must cover all eligible employees",
    ],
    documentation: ["Plan documents", "Contribution receipts", "Form 5498"],
    status: "claimed",
    estimatedSavings: 66000,
  },
  {
    id: "bus-009",
    name: "Business Meals",
    category: "Meals",
    description: "Meals with clients, prospects, or employees for business purposes",
    percentage: 50,
    requirements: [
      "Must have business discussion",
      "Must document attendees and business purpose",
      "Cannot be lavish or extravagant",
    ],
    documentation: ["Receipts", "Meeting notes", "Attendee list", "Business purpose"],
    status: "claimed",
    estimatedSavings: 4200,
  },
  {
    id: "bus-010",
    name: "Internet & Phone",
    category: "Utilities",
    description: "Business percentage of internet and phone expenses",
    requirements: [
      "Must calculate business use percentage",
      "Personal use portion not deductible",
    ],
    documentation: ["Bills", "Usage logs", "Business use calculation"],
    status: "claimed",
    estimatedSavings: 1800,
  },
  {
    id: "bus-011",
    name: "Continuing Education",
    category: "Education",
    description: "Courses, certifications, and training to maintain or improve skills",
    requirements: [
      "Must maintain or improve skills in current business",
      "Cannot qualify you for a new profession",
      "Must be related to current business activities",
    ],
    documentation: ["Course receipts", "Certificates", "Registration confirmations"],
    status: "claimed",
    estimatedSavings: 5500,
  },
  {
    id: "bus-012",
    name: "Business Insurance",
    category: "Professional",
    description: "Professional liability, E&O, and other business insurance premiums",
    requirements: [
      "Must be for business purposes",
      "Must be ordinary and necessary",
    ],
    documentation: ["Policy declarations", "Premium statements"],
    status: "claimed",
    estimatedSavings: 6000,
  },
  {
    id: "bus-013",
    name: "Marketing & Advertising",
    category: "Professional",
    description: "Advertising, marketing, and promotional expenses",
    requirements: [
      "Must be related to business",
      "Cannot be for political purposes",
    ],
    documentation: ["Invoices", "Ad receipts", "Campaign reports"],
    status: "claimed",
    estimatedSavings: 12000,
  },
  {
    id: "bus-014",
    name: "Bank & Processing Fees",
    category: "Professional",
    description: "Business bank fees, merchant processing fees, and payment platform fees",
    requirements: [
      "Must be for business accounts",
      "Must be ordinary and necessary",
    ],
    documentation: ["Bank statements", "Processing statements"],
    status: "claimed",
    estimatedSavings: 3600,
  },
  {
    id: "bus-015",
    name: "Qualified Business Income (QBI)",
    category: "Income",
    description: "20% deduction on qualified business income for pass-through entities",
    percentage: 20,
    requirements: [
      "Must be pass-through entity (sole prop, partnership, S-corp)",
      "Income limitations apply above $182,100 (single) / $364,200 (married)",
      "Specified service businesses have additional limits",
    ],
    documentation: ["Schedule C/K-1", "Business income documentation"],
    status: "eligible",
    estimatedSavings: 42000,
    notes: "Subject to income limitations and SSTB rules",
  },
]

const statusConfig = {
  eligible: { label: "Eligible", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  pending_review: { label: "Pending Review", color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertCircle },
  claimed: { label: "Claimed", color: "text-tiffany-500", bg: "bg-tiffany-500/10", icon: CheckCircle2 },
  ineligible: { label: "Ineligible", color: "text-zinc-400", bg: "bg-zinc-400/10", icon: AlertCircle },
}

// Chart data for tax analytics
const taxSavingsData = [
  { category: "Retirement (SEP/IRA)", claimed: 72500, potential: 76500 },
  { category: "Business Expenses", claimed: 54000, potential: 62000 },
  { category: "QBI Deduction", claimed: 0, potential: 42000 },
  { category: "Section 179", claimed: 0, potential: 45000 },
  { category: "Home/Vehicle", claimed: 9540, potential: 12000 },
  { category: "Personal (SALT/Med)", claimed: 22500, potential: 25700 },
]

const deductionAllocationData = [
  { name: "Retirement Contributions", value: 72500, color: "#14b8a6" },
  { name: "Professional Services", value: 24000, color: "#06b6d4" },
  { name: "Health Insurance", value: 18000, color: "#8b5cf6" },
  { name: "Business Travel", value: 15200, color: "#f59e0b" },
  { name: "Mortgage Interest", value: 12450, color: "#10b981" },
  { name: "Other Deductions", value: 36850, color: "#ec4899" },
]

const yearlyTaxSavingsData = [
  { period: "2020", return: 85000 },
  { period: "2021", return: 112000 },
  { period: "2022", return: 128000 },
  { period: "2023", return: 156000 },
  { period: "2024 (Est)", return: 179000 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function DeductibleCard({ item }: { item: TaxDeductible }) {
  const status = statusConfig[item.status]
  const StatusIcon = status.icon

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-zinc-100">{item.name}</h4>
            <p className="text-xs text-zinc-500">{item.category}</p>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full", status.bg)}>
            <StatusIcon className={cn("h-3 w-3", status.color)} />
            <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-3">{item.description}</p>

        {(item.maxDeduction || item.percentage) && (
          <div className="flex items-center gap-4 mb-3 text-sm">
            {item.maxDeduction && (
              <div>
                <span className="text-zinc-500">Max: </span>
                <span className="text-zinc-100 font-medium">{formatCurrency(item.maxDeduction)}</span>
              </div>
            )}
            {item.percentage && (
              <div>
                <span className="text-zinc-500">Rate: </span>
                <span className="text-zinc-100 font-medium">{item.percentage}%</span>
              </div>
            )}
          </div>
        )}

        {item.estimatedSavings && (
          <div className="p-3 rounded-lg bg-tiffany-500/5 border border-tiffany-500/20 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Estimated Tax Savings</span>
              <span className="text-lg font-semibold text-tiffany-500">
                {formatCurrency(item.estimatedSavings)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1">Requirements</p>
            <ul className="space-y-1">
              {item.requirements.slice(0, 2).map((req, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 text-zinc-600 mt-0.5 flex-shrink-0" />
                  {req}
                </li>
              ))}
              {item.requirements.length > 2 && (
                <li className="text-xs text-tiffany-500">+{item.requirements.length - 2} more</li>
              )}
            </ul>
          </div>
        </div>

        {item.notes && (
          <div className="mt-3 p-2 rounded bg-zinc-800/50 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-zinc-400">{item.notes}</p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Details
          </Button>
          {item.status === "eligible" && (
            <Button size="sm" className="flex-1">
              Claim
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  trend?: "up" | "down"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">{title}</span>
          <Icon className="h-4 w-4 text-tiffany-500" />
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-zinc-100">{value}</span>
          {trend && (
            <TrendingUp
              className={cn(
                "h-4 w-4 mb-1",
                trend === "up" ? "text-emerald-400" : "text-red-400 rotate-180"
              )}
            />
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TaxWriteoffsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("all")
  const reducedMotion = useReducedMotion()

  const allDeductibles = [...personalDeductibles, ...businessDeductibles]

  const filteredPersonal = personalDeductibles.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredBusiness = businessDeductibles.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPersonalSavings = personalDeductibles
    .filter((d) => d.status === "claimed" || d.status === "eligible")
    .reduce((sum, d) => sum + (d.estimatedSavings || 0), 0)

  const totalBusinessSavings = businessDeductibles
    .filter((d) => d.status === "claimed" || d.status === "eligible")
    .reduce((sum, d) => sum + (d.estimatedSavings || 0), 0)

  const claimedCount = allDeductibles.filter((d) => d.status === "claimed").length
  const eligibleCount = allDeductibles.filter((d) => d.status === "eligible").length

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Tax Write-offs</h1>
          <p className="text-zinc-400 mt-1">
            Track deductibles and maximize your tax savings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Deduction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Potential Savings"
          value={formatCurrency(totalPersonalSavings + totalBusinessSavings)}
          subtitle="Personal + Business combined"
          icon={DollarSign}
          trend="up"
        />
        <SummaryCard
          title="Personal Deductions"
          value={formatCurrency(totalPersonalSavings)}
          subtitle={`${filteredPersonal.length} items tracked`}
          icon={User}
        />
        <SummaryCard
          title="Business Deductions"
          value={formatCurrency(totalBusinessSavings)}
          subtitle={`${filteredBusiness.length} items tracked`}
          icon={Building2}
        />
        <SummaryCard
          title="Deductions Status"
          value={`${claimedCount} / ${allDeductibles.length}`}
          subtitle={`${eligibleCount} eligible to claim`}
          icon={Receipt}
        />
      </div>

      {/* Tax Savings Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <TaxSavingsChart data={taxSavingsData} className="lg:col-span-2" />
        <AllocationChart
          data={deductionAllocationData}
          title="Deductions by Category"
          description="Distribution of claimed deductions"
        />
      </div>

      {/* Tax Year Notice */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Calculator className="h-5 w-5 text-tiffany-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-100">
              Tax Year 2024 Deductions
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              These deductions are based on current IRS guidelines for tax year 2024.
              Consult with a qualified tax professional before claiming any deductions.
              Limits and eligibility may vary based on your specific situation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search deductions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Deductions</TabsTrigger>
          <TabsTrigger value="personal">
            <User className="h-4 w-4 mr-2" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="business">
            <Building2 className="h-4 w-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* All Deductions */}
        <TabsContent value="all" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-tiffany-500" />
                Personal Deductions
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPersonal.map((item) => (
                  <DeductibleCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-tiffany-500" />
                Business Deductions
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBusiness.map((item) => (
                  <DeductibleCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPersonal.map((item) => (
              <DeductibleCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBusiness.map((item) => (
              <DeductibleCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const CategoryIcon = category.icon
              const itemCount =
                allDeductibles.filter((d) => d.category === category.name).length ||
                allDeductibles.filter((d) =>
                  d.category.toLowerCase().includes(category.id.split("-")[0])
                ).length

              return (
                <Card
                  key={category.id}
                  className="hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <CategoryIcon
                          className="h-5 w-5"
                          style={{ color: category.color }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-zinc-100">{category.name}</h4>
                          <Badge
                            variant={
                              category.type === "personal"
                                ? "outline"
                                : category.type === "business"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {category.type === "both" ? "Both" : category.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">{category.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Reference Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2024 Deduction Limits Quick Reference</CardTitle>
          <CardDescription>Common deduction limits for tax year 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deduction Type</TableHead>
                <TableHead>Single</TableHead>
                <TableHead>Married Filing Jointly</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Standard Deduction</TableCell>
                <TableCell>$14,600</TableCell>
                <TableCell>$29,200</TableCell>
                <TableCell className="text-zinc-400">+$1,550 if 65+ (single)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">SALT Deduction</TableCell>
                <TableCell>$10,000</TableCell>
                <TableCell>$10,000</TableCell>
                <TableCell className="text-zinc-400">Combined state/local taxes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">IRA Contribution</TableCell>
                <TableCell>$7,000</TableCell>
                <TableCell>$7,000 each</TableCell>
                <TableCell className="text-zinc-400">+$1,000 catch-up if 50+</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">401(k) Contribution</TableCell>
                <TableCell>$23,000</TableCell>
                <TableCell>$23,000 each</TableCell>
                <TableCell className="text-zinc-400">+$7,500 catch-up if 50+</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">HSA Contribution</TableCell>
                <TableCell>$4,150</TableCell>
                <TableCell>$8,300 (family)</TableCell>
                <TableCell className="text-zinc-400">+$1,000 catch-up if 55+</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">SEP-IRA (Self-Employed)</TableCell>
                <TableCell colSpan={2}>$69,000 or 25% of compensation</TableCell>
                <TableCell className="text-zinc-400">Whichever is less</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Section 179 Expensing</TableCell>
                <TableCell colSpan={2}>$1,220,000</TableCell>
                <TableCell className="text-zinc-400">Phase-out at $3,050,000</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Home Office (Simplified)</TableCell>
                <TableCell colSpan={2}>$1,500 max ($5 × 300 sq ft)</TableCell>
                <TableCell className="text-zinc-400">Or actual expenses method</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Business Mileage Rate</TableCell>
                <TableCell colSpan={2}>67 cents per mile</TableCell>
                <TableCell className="text-zinc-400">2024 standard rate</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </animated.div>
  )
}
