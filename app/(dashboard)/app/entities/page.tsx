"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Building2,
  Users,
  Briefcase,
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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

// Entity types and configurations
const entityTypeConfig = {
  llc: {
    label: "LLC",
    fullLabel: "Limited Liability Company",
    icon: Building2,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
  },
  trust: {
    label: "Trust",
    fullLabel: "Trust",
    icon: Shield,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  corporation: {
    label: "Corp",
    fullLabel: "Corporation",
    icon: Briefcase,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  partnership: {
    label: "LP",
    fullLabel: "Limited Partnership",
    icon: Users,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  holding: {
    label: "Holding",
    fullLabel: "Holding Company",
    icon: Building2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
}

type EntityType = keyof typeof entityTypeConfig

const statusConfig = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/10" },
  inactive: { label: "Inactive", color: "text-zinc-400", bg: "bg-zinc-400/10" },
  dissolved: { label: "Dissolved", color: "text-red-400", bg: "bg-red-400/10" },
}

type EntityStatus = keyof typeof statusConfig

interface Entity {
  id: string
  name: string
  type: EntityType
  status: EntityStatus
  jurisdiction: string
  formationDate: string
  ein?: string
  registeredAgent?: string
  totalAssets: number
  ownershipPercent: number
  annualFilingDate?: string
  members?: string[]
  purpose?: string
  linkedAssets?: string[]
}

// Mock entities data
const mockEntities: Entity[] = [
  {
    id: "1",
    name: "Lacoda Holdings LLC",
    type: "holding",
    status: "active",
    jurisdiction: "Delaware",
    formationDate: "2019-03-15",
    ein: "84-1234567",
    registeredAgent: "CT Corporation",
    totalAssets: 4250000,
    ownershipPercent: 100,
    annualFilingDate: "2024-03-01",
    members: ["Alexander Chen"],
    purpose: "Parent holding company for investment entities",
    linkedAssets: ["Manhattan Penthouse", "Tech Growth Fund"],
  },
  {
    id: "2",
    name: "Chen Family Trust",
    type: "trust",
    status: "active",
    jurisdiction: "California",
    formationDate: "2018-06-22",
    totalAssets: 2850000,
    ownershipPercent: 100,
    members: ["Alexander Chen (Grantor)", "Sarah Chen (Beneficiary)", "Michael Chen (Beneficiary)"],
    purpose: "Irrevocable trust for estate planning and asset protection",
    linkedAssets: ["Miami Beach Condo", "Bond Portfolio"],
  },
  {
    id: "3",
    name: "Apex Ventures LP",
    type: "partnership",
    status: "active",
    jurisdiction: "Delaware",
    formationDate: "2020-09-10",
    ein: "85-9876543",
    registeredAgent: "Registered Agents Inc",
    totalAssets: 1650000,
    ownershipPercent: 35,
    annualFilingDate: "2024-09-01",
    members: ["Lacoda Holdings LLC (GP)", "Various LPs"],
    purpose: "Private equity investment vehicle",
    linkedAssets: ["Series B - FinTech Startup", "Series A - Healthcare Tech"],
  },
  {
    id: "4",
    name: "Coastal Properties LLC",
    type: "llc",
    status: "active",
    jurisdiction: "Florida",
    formationDate: "2021-02-28",
    ein: "86-1111222",
    registeredAgent: "Florida Registered Agent Services",
    totalAssets: 1480000,
    ownershipPercent: 100,
    annualFilingDate: "2024-05-01",
    members: ["Lacoda Holdings LLC"],
    purpose: "Real estate holding company for Florida properties",
    linkedAssets: ["Miami Beach Condo"],
  },
  {
    id: "5",
    name: "Tech Innovations Inc",
    type: "corporation",
    status: "active",
    jurisdiction: "Delaware",
    formationDate: "2022-01-15",
    ein: "87-3333444",
    registeredAgent: "CT Corporation",
    totalAssets: 890000,
    ownershipPercent: 100,
    annualFilingDate: "2024-01-15",
    members: ["Alexander Chen (Director)", "Board of Directors"],
    purpose: "Technology investments and IP holding",
    linkedAssets: ["Crypto Assets", "Tech Patents"],
  },
  {
    id: "6",
    name: "Legacy Trust II",
    type: "trust",
    status: "pending",
    jurisdiction: "Nevada",
    formationDate: "2023-11-01",
    totalAssets: 500000,
    ownershipPercent: 100,
    members: ["Alexander Chen (Grantor)"],
    purpose: "Dynasty trust for multi-generational wealth transfer",
  },
]

// Chart data
const entitiesByTypeData = [
  { name: "LLCs", value: 2, color: "#14b8a6" },
  { name: "Trusts", value: 2, color: "#8b5cf6" },
  { name: "Corporations", value: 1, color: "#3b82f6" },
  { name: "Partnerships", value: 1, color: "#f59e0b" },
]

const assetsByEntityData = [
  { month: "Jan", portfolio: 9200000, benchmark: 8500000 },
  { month: "Feb", portfolio: 9450000, benchmark: 8700000 },
  { month: "Mar", portfolio: 9380000, benchmark: 8650000 },
  { month: "Apr", portfolio: 9720000, benchmark: 8900000 },
  { month: "May", portfolio: 10100000, benchmark: 9200000 },
  { month: "Jun", portfolio: 10450000, benchmark: 9400000 },
  { month: "Jul", portfolio: 10820000, benchmark: 9650000 },
  { month: "Aug", portfolio: 10650000, benchmark: 9500000 },
  { month: "Sep", portfolio: 11120000, benchmark: 9850000 },
  { month: "Oct", portfolio: 11420000, benchmark: 10100000 },
  { month: "Nov", portfolio: 11780000, benchmark: 10400000 },
  { month: "Dec", portfolio: 11620000, benchmark: 10250000 },
]

function EntityCard({ entity, onClick }: { entity: Entity; onClick: () => void }) {
  const typeConfig = entityTypeConfig[entity.type]
  const status = statusConfig[entity.status]
  const TypeIcon = typeConfig.icon

  return (
    <Card
      className="group cursor-pointer hover:border-zinc-700 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
              <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
            </div>
            <div>
              <p className="font-medium text-zinc-100">{entity.name}</p>
              <p className="text-xs text-zinc-500">{typeConfig.fullLabel}</p>
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
              <DropdownMenuItem>Edit Entity</DropdownMenuItem>
              <DropdownMenuItem>View Documents</DropdownMenuItem>
              <DropdownMenuItem>Filing History</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500">Total Assets</p>
            <p className="text-lg font-semibold text-tiffany-500">
              {formatCurrency(entity.totalAssets)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Ownership</p>
            <p className="text-lg font-semibold text-zinc-100">
              {entity.ownershipPercent}%
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <MapPin className="h-3 w-3" />
            <span>{entity.jurisdiction}</span>
          </div>
          <Badge className={cn(status.bg, status.color, "border-0")}>
            {status.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function EntityDetailDrawer({
  entity,
  open,
  onClose,
}: {
  entity: Entity | null
  open: boolean
  onClose: () => void
}) {
  if (!entity) return null

  const typeConfig = entityTypeConfig[entity.type]
  const status = statusConfig[entity.status]
  const TypeIcon = typeConfig.icon

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg", typeConfig.bg)}>
              <TypeIcon className={cn("h-6 w-6", typeConfig.color)} />
            </div>
            <div>
              <DialogTitle>{entity.name}</DialogTitle>
              <DialogDescription>{typeConfig.fullLabel}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status & Jurisdiction */}
          <div className="flex items-center gap-3">
            <Badge className={cn(status.bg, status.color, "border-0")}>
              {status.label}
            </Badge>
            <span className="text-sm text-zinc-400">
              <MapPin className="h-3 w-3 inline mr-1" />
              {entity.jurisdiction}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Total Assets</p>
              <p className="text-2xl font-bold text-tiffany-500 mt-1">
                {formatCurrency(entity.totalAssets)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Ownership</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">
                {entity.ownershipPercent}%
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Formation Date</span>
              <span className="text-zinc-100">
                {format(new Date(entity.formationDate), "MMMM d, yyyy")}
              </span>
            </div>
            {entity.ein && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">EIN</span>
                <span className="text-zinc-100 font-mono">{entity.ein}</span>
              </div>
            )}
            {entity.registeredAgent && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Registered Agent</span>
                <span className="text-zinc-100">{entity.registeredAgent}</span>
              </div>
            )}
            {entity.annualFilingDate && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Next Annual Filing</span>
                <span className="text-zinc-100">
                  {format(new Date(entity.annualFilingDate), "MMMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          {/* Purpose */}
          {entity.purpose && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">Purpose</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 p-3 rounded-lg">
                {entity.purpose}
              </p>
            </div>
          )}

          {/* Members */}
          {entity.members && entity.members.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">
                Members / Officers ({entity.members.length})
              </p>
              <div className="space-y-2">
                {entity.members.map((member, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-zinc-300"
                  >
                    <Users className="h-3 w-3 text-zinc-500" />
                    {member}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Assets */}
          {entity.linkedAssets && entity.linkedAssets.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">
                Linked Assets ({entity.linkedAssets.length})
              </p>
              <div className="space-y-2">
                {entity.linkedAssets.map((asset, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 text-sm"
                  >
                    <span className="text-zinc-300">{asset}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1">Edit Entity</Button>
            <Button variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function EntitiesPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [selectedEntity, setSelectedEntity] = React.useState<Entity | null>(null)
  const [addEntityOpen, setAddEntityOpen] = React.useState(false)
  const reducedMotion = useReducedMotion()

  const filteredEntities = mockEntities.filter((entity) => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || entity.type === typeFilter
    const matchesStatus = statusFilter === "all" || entity.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const totalAssets = mockEntities.reduce((sum, e) => sum + e.totalAssets, 0)
  const activeEntities = mockEntities.filter(e => e.status === "active").length

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
          <h1 className="text-2xl font-bold text-zinc-100">Entities</h1>
          <p className="text-zinc-400 mt-1">
            Manage LLCs, trusts, corporations, and holding companies
          </p>
        </div>
        <Dialog open={addEntityOpen} onOpenChange={setAddEntityOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Entity</DialogTitle>
              <DialogDescription>
                Register a new legal entity to your portfolio.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Entity Name</Label>
                <Input placeholder="e.g., Smith Family Trust" />
              </div>
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select defaultValue="llc">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(entityTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.fullLabel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jurisdiction</Label>
                  <Select defaultValue="delaware">
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delaware">Delaware</SelectItem>
                      <SelectItem value="nevada">Nevada</SelectItem>
                      <SelectItem value="wyoming">Wyoming</SelectItem>
                      <SelectItem value="california">California</SelectItem>
                      <SelectItem value="florida">Florida</SelectItem>
                      <SelectItem value="texas">Texas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formation Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>EIN (Optional)</Label>
                <Input placeholder="XX-XXXXXXX" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddEntityOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setAddEntityOpen(false)}>
                Add Entity
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Entities</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{mockEntities.length}</p>
            <p className="text-xs text-emerald-400 mt-1">+1 this year</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Active Entities</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeEntities}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {Math.round((activeEntities / mockEntities.length) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Total Assets Held</p>
            <p className="text-2xl font-bold text-tiffany-500 mt-1">
              {formatCurrency(totalAssets)}
            </p>
            <p className="text-xs text-emerald-400 mt-1">+8.2% YoY</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400">Upcoming Filings</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">2</p>
            <p className="text-xs text-zinc-500 mt-1">Next 90 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <AllocationChart
          data={entitiesByTypeData}
          title="Entities by Type"
          description="Distribution of legal structures"
        />
        <PerformanceChart
          data={assetsByEntityData}
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
                placeholder="Search entities..."
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
                {Object.entries(entityTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntities.map((entity) => (
          <EntityCard
            key={entity.id}
            entity={entity}
            onClick={() => setSelectedEntity(entity)}
          />
        ))}
      </div>

      {/* Entity Detail Drawer */}
      <EntityDetailDrawer
        entity={selectedEntity}
        open={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />
    </animated.div>
  )
}
