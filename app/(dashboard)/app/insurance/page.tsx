"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, differenceInDays, addDays } from "date-fns"
import {
  Shield,
  Plus,
  Search,
  Home,
  Car,
  Heart,
  Umbrella,
  Briefcase,
  Users,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreHorizontal,
  Download,
  Phone,
  Mail,
  Building2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  AllocationChart,
  PerformanceChart,
} from "@/components/dashboard/charts"

// Policy type configurations
const policyTypeConfig = {
  home: {
    label: "Homeowners",
    icon: Home,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    chartColor: "#3b82f6",
  },
  auto: {
    label: "Auto",
    icon: Car,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
    chartColor: "#14b8a6",
  },
  life: {
    label: "Life",
    icon: Heart,
    color: "text-red-400",
    bg: "bg-red-400/10",
    chartColor: "#ef4444",
  },
  umbrella: {
    label: "Umbrella",
    icon: Umbrella,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    chartColor: "#8b5cf6",
  },
  liability: {
    label: "Liability",
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    chartColor: "#f59e0b",
  },
  health: {
    label: "Health",
    icon: Users,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    chartColor: "#10b981",
  },
  business: {
    label: "Business",
    icon: Briefcase,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    chartColor: "#06b6d4",
  },
  property: {
    label: "Property",
    icon: Building2,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    chartColor: "#6366f1",
  },
}

type PolicyType = keyof typeof policyTypeConfig

const statusConfig = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  expiring: { label: "Expiring Soon", color: "text-amber-400", bg: "bg-amber-400/10" },
  expired: { label: "Expired", color: "text-red-400", bg: "bg-red-400/10" },
  pending: { label: "Pending", color: "text-blue-400", bg: "bg-blue-400/10" },
}

type PolicyStatus = keyof typeof statusConfig

interface InsurancePolicy {
  id: string
  name: string
  type: PolicyType
  status: PolicyStatus
  provider: string
  policyNumber: string
  coverageAmount: number
  deductible: number
  premium: number
  premiumFrequency: "monthly" | "quarterly" | "annual"
  effectiveDate: string
  expirationDate: string
  coveredAssets?: string[]
  beneficiaries?: string[]
  agent?: {
    name: string
    phone: string
    email: string
  }
  notes?: string
}

// Mock policies data
const mockPolicies: InsurancePolicy[] = [
  {
    id: "1",
    name: "Manhattan Penthouse - Homeowners",
    type: "home",
    status: "active",
    provider: "Chubb",
    policyNumber: "HO-2024-001234",
    coverageAmount: 2500000,
    deductible: 10000,
    premium: 8500,
    premiumFrequency: "annual",
    effectiveDate: "2024-01-15",
    expirationDate: "2025-01-15",
    coveredAssets: ["432 Park Ave, Unit 78A"],
    agent: {
      name: "Sarah Mitchell",
      phone: "(212) 555-0123",
      email: "smitchell@chubb.com",
    },
    notes: "Includes art & jewelry rider up to $500K",
  },
  {
    id: "2",
    name: "Miami Beach Condo - Homeowners",
    type: "home",
    status: "active",
    provider: "AIG",
    policyNumber: "HO-2024-005678",
    coverageAmount: 1200000,
    deductible: 5000,
    premium: 4200,
    premiumFrequency: "annual",
    effectiveDate: "2024-03-01",
    expirationDate: "2025-03-01",
    coveredAssets: ["1234 Ocean Dr, Unit 1502"],
    agent: {
      name: "Michael Torres",
      phone: "(305) 555-0456",
      email: "mtorres@aig.com",
    },
  },
  {
    id: "3",
    name: "Personal Umbrella Policy",
    type: "umbrella",
    status: "active",
    provider: "Chubb",
    policyNumber: "UMB-2024-009876",
    coverageAmount: 10000000,
    deductible: 0,
    premium: 3500,
    premiumFrequency: "annual",
    effectiveDate: "2024-01-01",
    expirationDate: "2025-01-01",
    notes: "$10M umbrella covering all personal liability",
  },
  {
    id: "4",
    name: "Term Life Insurance",
    type: "life",
    status: "active",
    provider: "Northwestern Mutual",
    policyNumber: "LIFE-2020-112233",
    coverageAmount: 5000000,
    deductible: 0,
    premium: 425,
    premiumFrequency: "monthly",
    effectiveDate: "2020-06-01",
    expirationDate: "2040-06-01",
    beneficiaries: ["Sarah Chen (Spouse) - 50%", "Chen Family Trust - 50%"],
    agent: {
      name: "Robert Kim",
      phone: "(212) 555-0789",
      email: "rkim@northwesternmutual.com",
    },
  },
  {
    id: "5",
    name: "Primary Vehicle - Tesla Model S",
    type: "auto",
    status: "expiring",
    provider: "Progressive",
    policyNumber: "AUTO-2024-334455",
    coverageAmount: 500000,
    deductible: 1000,
    premium: 2400,
    premiumFrequency: "annual",
    effectiveDate: "2024-02-15",
    expirationDate: addDays(new Date(), 25).toISOString().split("T")[0],
    coveredAssets: ["2023 Tesla Model S Plaid"],
    agent: {
      name: "Jennifer Adams",
      phone: "(800) 555-0111",
      email: "jadams@progressive.com",
    },
  },
  {
    id: "6",
    name: "Family Health Insurance",
    type: "health",
    status: "active",
    provider: "UnitedHealthcare",
    policyNumber: "HEALTH-2024-667788",
    coverageAmount: 0, // Typically unlimited for health
    deductible: 3000,
    premium: 2800,
    premiumFrequency: "monthly",
    effectiveDate: "2024-01-01",
    expirationDate: "2024-12-31",
    beneficiaries: ["Alexander Chen", "Sarah Chen", "Michael Chen", "Emma Chen"],
    notes: "PPO Plan - Family coverage",
  },
  {
    id: "7",
    name: "Business Liability - Tech Innovations",
    type: "business",
    status: "active",
    provider: "Hartford",
    policyNumber: "BIZ-2024-445566",
    coverageAmount: 2000000,
    deductible: 5000,
    premium: 4800,
    premiumFrequency: "annual",
    effectiveDate: "2024-01-15",
    expirationDate: "2025-01-15",
    coveredAssets: ["Tech Innovations Inc"],
    notes: "General liability + E&O coverage",
  },
  {
    id: "8",
    name: "Investment Property Portfolio",
    type: "property",
    status: "active",
    provider: "Lloyd's of London",
    policyNumber: "PROP-2024-778899",
    coverageAmount: 3500000,
    deductible: 25000,
    premium: 12000,
    premiumFrequency: "annual",
    effectiveDate: "2024-04-01",
    expirationDate: "2025-04-01",
    coveredAssets: ["Coastal Properties LLC Assets"],
  },
]

// Chart data
const coverageByTypeData = [
  { name: "Life", value: 5000000, color: "#ef4444" },
  { name: "Property", value: 3500000, color: "#6366f1" },
  { name: "Home", value: 3700000, color: "#3b82f6" },
  { name: "Umbrella", value: 10000000, color: "#8b5cf6" },
  { name: "Business", value: 2000000, color: "#06b6d4" },
]

const premiumTrendData = [
  { month: "Jan", portfolio: 42000, benchmark: 45000 },
  { month: "Feb", portfolio: 42000, benchmark: 45500 },
  { month: "Mar", portfolio: 43500, benchmark: 46000 },
  { month: "Apr", portfolio: 43500, benchmark: 46500 },
  { month: "May", portfolio: 44000, benchmark: 47000 },
  { month: "Jun", portfolio: 44000, benchmark: 47500 },
  { month: "Jul", portfolio: 44500, benchmark: 48000 },
  { month: "Aug", portfolio: 44500, benchmark: 48500 },
  { month: "Sep", portfolio: 45000, benchmark: 49000 },
  { month: "Oct", portfolio: 45000, benchmark: 49500 },
  { month: "Nov", portfolio: 45500, benchmark: 50000 },
  { month: "Dec", portfolio: 45500, benchmark: 50500 },
]

function PolicyCard({ policy, onClick }: { policy: InsurancePolicy; onClick: () => void }) {
  const typeConfig = policyTypeConfig[policy.type]
  const status = statusConfig[policy.status]
  const TypeIcon = typeConfig.icon
  const daysUntilExpiration = differenceInDays(new Date(policy.expirationDate), new Date())

  const annualPremium = policy.premiumFrequency === "monthly"
    ? policy.premium * 12
    : policy.premiumFrequency === "quarterly"
    ? policy.premium * 4
    : policy.premium

  return (
    <Card
      className="group cursor-pointer hover:border-zinc-700 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
              <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
            </div>
            <div>
              <p className="font-medium text-zinc-100 truncate max-w-[200px]">{policy.name}</p>
              <p className="text-xs text-zinc-500">{policy.provider}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Download Policy</DropdownMenuItem>
              <DropdownMenuItem>Contact Agent</DropdownMenuItem>
              <DropdownMenuItem>File Claim</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-zinc-500">Coverage</p>
            <p className="text-lg font-semibold text-zinc-100">
              {policy.coverageAmount > 0 ? formatCurrency(policy.coverageAmount) : "See Plan"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Annual Premium</p>
            <p className="text-lg font-semibold text-tiffany-500">
              {formatCurrency(annualPremium)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            {daysUntilExpiration > 0 ? (
              <span>Expires {format(new Date(policy.expirationDate), "MMM d, yyyy")}</span>
            ) : (
              <span className="text-red-400">Expired</span>
            )}
          </div>
          <Badge className={cn(status.bg, status.color, "border-0")}>
            {status.label}
          </Badge>
        </div>

        {policy.status === "expiring" && daysUntilExpiration <= 30 && (
          <div className="mt-3 p-2 rounded-lg bg-amber-400/10 border border-amber-400/30">
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Expires in {daysUntilExpiration} days - Renewal required
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PolicyDetailDrawer({
  policy,
  open,
  onClose,
}: {
  policy: InsurancePolicy | null
  open: boolean
  onClose: () => void
}) {
  if (!policy) return null

  const typeConfig = policyTypeConfig[policy.type]
  const status = statusConfig[policy.status]
  const TypeIcon = typeConfig.icon

  const annualPremium = policy.premiumFrequency === "monthly"
    ? policy.premium * 12
    : policy.premiumFrequency === "quarterly"
    ? policy.premium * 4
    : policy.premium

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg", typeConfig.bg)}>
              <TypeIcon className={cn("h-6 w-6", typeConfig.color)} />
            </div>
            <div>
              <DialogTitle className="text-lg">{policy.name}</DialogTitle>
              <DialogDescription>{policy.provider} • {typeConfig.label}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Policy Number */}
          <div className="flex items-center gap-3">
            <Badge className={cn(status.bg, status.color, "border-0")}>
              {status.label}
            </Badge>
            <span className="text-sm text-zinc-400 font-mono">
              {policy.policyNumber}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-xs text-zinc-500">Coverage</p>
              <p className="text-lg font-bold text-zinc-100 mt-1">
                {policy.coverageAmount > 0 ? formatCurrency(policy.coverageAmount) : "See Plan"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-xs text-zinc-500">Deductible</p>
              <p className="text-lg font-bold text-zinc-100 mt-1">
                {formatCurrency(policy.deductible)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-xs text-zinc-500">Premium/Year</p>
              <p className="text-lg font-bold text-tiffany-500 mt-1">
                {formatCurrency(annualPremium)}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Effective Date</span>
              <span className="text-zinc-100">
                {format(new Date(policy.effectiveDate), "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Expiration Date</span>
              <span className="text-zinc-100">
                {format(new Date(policy.expirationDate), "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Payment</span>
              <span className="text-zinc-100 capitalize">
                {formatCurrency(policy.premium)} {policy.premiumFrequency}
              </span>
            </div>
          </div>

          {/* Covered Assets */}
          {policy.coveredAssets && policy.coveredAssets.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">Covered Assets</p>
              <div className="space-y-2">
                {policy.coveredAssets.map((asset, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 text-sm text-zinc-300"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    {asset}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Beneficiaries */}
          {policy.beneficiaries && policy.beneficiaries.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">Beneficiaries</p>
              <div className="space-y-2">
                {policy.beneficiaries.map((beneficiary, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-zinc-300"
                  >
                    <Users className="h-3 w-3 text-zinc-500" />
                    {beneficiary}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent */}
          {policy.agent && (
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400 mb-2">Insurance Agent</p>
              <p className="font-medium text-zinc-100">{policy.agent.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <a
                  href={`tel:${policy.agent.phone}`}
                  className="flex items-center gap-1 text-zinc-400 hover:text-tiffany-500 transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  {policy.agent.phone}
                </a>
                <a
                  href={`mailto:${policy.agent.email}`}
                  className="flex items-center gap-1 text-zinc-400 hover:text-tiffany-500 transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  Email
                </a>
              </div>
            </div>
          )}

          {/* Notes */}
          {policy.notes && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">Notes</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 p-3 rounded-lg">
                {policy.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Policy
            </Button>
            <Button variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              File Claim
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function InsurancePage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [selectedPolicy, setSelectedPolicy] = React.useState<InsurancePolicy | null>(null)
  const [addPolicyOpen, setAddPolicyOpen] = React.useState(false)
  const reducedMotion = useReducedMotion()

  const filteredPolicies = mockPolicies.filter((policy) => {
    const matchesSearch = policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.provider.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || policy.type === typeFilter
    return matchesSearch && matchesType
  })

  const totalCoverage = mockPolicies.reduce((sum, p) => sum + p.coverageAmount, 0)
  const totalAnnualPremium = mockPolicies.reduce((sum, p) => {
    const annual = p.premiumFrequency === "monthly"
      ? p.premium * 12
      : p.premiumFrequency === "quarterly"
      ? p.premium * 4
      : p.premium
    return sum + annual
  }, 0)
  const expiringPolicies = mockPolicies.filter(p => p.status === "expiring").length
  const activePolicies = mockPolicies.filter(p => p.status === "active").length

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
          <h1 className="text-2xl font-bold text-zinc-100">Insurance</h1>
          <p className="text-zinc-400 mt-1">
            Manage policies, coverage, and premium schedules
          </p>
        </div>
        <Dialog open={addPolicyOpen} onOpenChange={setAddPolicyOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Insurance Policy</DialogTitle>
              <DialogDescription>
                Track a new insurance policy in your portfolio.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Policy Name</Label>
                <Input placeholder="e.g., Primary Residence Homeowners" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Policy Type</Label>
                  <Select defaultValue="home">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(policyTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Input placeholder="e.g., Chubb" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coverage Amount</Label>
                  <Input type="number" placeholder="$0" />
                </div>
                <div className="space-y-2">
                  <Label>Premium</Label>
                  <Input type="number" placeholder="$0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Effective Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input type="date" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddPolicyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setAddPolicyOpen(false)}>
                Add Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Policies</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{mockPolicies.length}</p>
            <p className="text-xs text-zinc-500 mt-1">{activePolicies} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Coverage</p>
            <p className="text-2xl font-bold text-tiffany-500 mt-1">
              {formatCurrency(totalCoverage)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Across all policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Annual Premiums</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">
              {formatCurrency(totalAnnualPremium)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              ~{formatCurrency(totalAnnualPremium / 12)}/month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Expiring Soon</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              expiringPolicies > 0 ? "text-amber-400" : "text-emerald-400"
            )}>
              {expiringPolicies}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <AllocationChart
          data={coverageByTypeData}
          title="Coverage by Type"
          description="Total coverage across policy categories"
        />
        <PerformanceChart
          data={premiumTrendData}
          className="lg:col-span-2"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(policyTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPolicies.map((policy) => (
          <PolicyCard
            key={policy.id}
            policy={policy}
            onClick={() => setSelectedPolicy(policy)}
          />
        ))}
      </div>

      {/* Policy Detail Drawer */}
      <PolicyDetailDrawer
        policy={selectedPolicy}
        open={!!selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
      />
    </animated.div>
  )
}
