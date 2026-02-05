"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Plus,
  Search,
  Building2,
  User,
  Users,
  Briefcase,
  Mail,
  Phone,
  MoreHorizontal,
  FileText,
  TrendingUp,
  Filter,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { mockClients, mockAssets, mockDocuments } from "@/lib/mock/data"
import type { Client } from "@/lib/mock/types"
import { ContentCard, StatCard, PageHeader, Tabs } from "@/components/dashboard/content-card"

const typeIcons = {
  individual: User,
  institution: Building2,
  trust: Users,
  fund: Briefcase,
} as const

const statusConfig = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  inactive: { label: "Inactive", color: "text-zinc-400", bg: "bg-zinc-500/10" },
  prospect: { label: "Prospect", color: "text-blue-400", bg: "bg-blue-500/10" },
}

function ClientDetailDrawer({
  client,
  open,
  onClose,
}: {
  client: Client | null
  open: boolean
  onClose: () => void
}) {
  if (!client) return null

  const TypeIcon = typeIcons[client.type]
  const status = statusConfig[client.status]
  const assignedAssets = mockAssets.filter((a) =>
    client.assignedAssets.includes(a.id)
  )
  const assignedDocs = mockDocuments.filter((d) =>
    client.assignedDocuments.includes(d.id)
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar fallback={client.name} size="lg" />
            <div>
              <DialogTitle>{client.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <TypeIcon className="h-4 w-4" />
                <span className="capitalize">{client.type}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-3">
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-3 text-sm text-zinc-300 hover:text-tiffany-500 transition-colors"
            >
              <Mail className="h-4 w-4 text-zinc-500" />
              {client.email}
            </a>
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-3 text-sm text-zinc-300 hover:text-tiffany-500 transition-colors"
            >
              <Phone className="h-4 w-4 text-zinc-500" />
              {client.phone}
            </a>
          </div>

          <div className="p-4 rounded-lg bg-zinc-800/50">
            <p className="text-sm text-zinc-400">Assets Under Management</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">
              {formatCurrency(client.aum)}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Status</span>
              <Badge className={cn(status.color, status.bg)}>{status.label}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Client Since</span>
              <span className="text-zinc-100">
                {format(new Date(client.joinedDate), "MMMM yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Last Activity</span>
              <span className="text-zinc-100">
                {format(new Date(client.lastActivity), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {assignedAssets.length > 0 && (
            <div>
              <p className="text-sm text-zinc-400 mb-2">
                Assigned Assets ({assignedAssets.length})
              </p>
              <div className="space-y-2">
                {assignedAssets.slice(0, 3).map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50"
                  >
                    <span className="text-sm text-zinc-300">{asset.name}</span>
                    <span className="text-sm text-tiffany-500">
                      {formatCurrency(asset.value)}
                    </span>
                  </div>
                ))}
                {assignedAssets.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full">
                    View all {assignedAssets.length} assets
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1">Edit Client</Button>
            <Button variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Documents ({assignedDocs.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type TabId = "all" | "active" | "prospect" | "inactive"

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null)

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || client.type === typeFilter
    const matchesTab = activeTab === "all" || client.status === activeTab
    return matchesSearch && matchesType && matchesTab
  })

  const totalAUM = filteredClients.reduce((sum, c) => sum + c.aum, 0)

  const tabs = [
    { id: "all", label: "All Clients", count: mockClients.length },
    { id: "active", label: "Active", count: mockClients.filter(c => c.status === "active").length },
    { id: "prospect", label: "Prospects", count: mockClients.filter(c => c.status === "prospect").length },
    { id: "inactive", label: "Inactive", count: mockClients.filter(c => c.status === "inactive").length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description={`${filteredClients.length} clients · ${formatCurrency(totalAUM)} AUM`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clients"
          value={mockClients.length}
          icon={<Users className="h-4 w-4 text-tiffany-500" />}
          trend={{ value: "+4 this quarter", positive: true }}
        />
        <StatCard
          label="Active Clients"
          value={mockClients.filter(c => c.status === "active").length}
          subtext={`${Math.round((mockClients.filter(c => c.status === "active").length / mockClients.length) * 100)}% of total`}
          icon={<User className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Avg AUM per Client"
          value={formatCurrency(totalAUM / mockClients.length)}
          icon={<TrendingUp className="h-4 w-4 text-tiffany-500" />}
          trend={{ value: "+12% YoY", positive: true }}
        />
        <StatCard
          label="Prospects"
          value={mockClients.filter(c => c.status === "prospect").length}
          subtext="Pending conversion"
          icon={<Briefcase className="h-4 w-4 text-blue-400" />}
        />
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800/60"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-zinc-900/50 border-zinc-800/60">
            <Filter className="h-4 w-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="institution">Institution</SelectItem>
            <SelectItem value="trust">Trust</SelectItem>
            <SelectItem value="fund">Fund</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ContentCard noPadding>
        <div className="divide-y divide-zinc-800/60">
          {filteredClients.map((client) => {
            const TypeIcon = typeIcons[client.type]
            const status = statusConfig[client.status]

            return (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar fallback={client.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-100">{client.name}</p>
                      <Badge className={cn("text-xs", status.color, status.bg)}>{status.label}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                      <TypeIcon className="h-3 w-3" />
                      <span className="capitalize">{client.type}</span>
                      <span>·</span>
                      <span>{client.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-tiffany-500">
                      {formatCurrency(client.aum)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {client.assignedAssets.length} assets
                    </p>
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
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Send Message</DropdownMenuItem>
                      <DropdownMenuItem>View Documents</DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem className="text-rose-400">Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      </ContentCard>

      <ClientDetailDrawer
        client={selectedClient}
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  )
}
