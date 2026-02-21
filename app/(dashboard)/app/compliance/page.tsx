"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  FileText,
  RefreshCw,
  ChevronRight,
  Search,
  Download,
  User,
  Briefcase,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useCompliance } from "@/lib/hooks/crud/use-compliance"
import { useLedger } from "@/lib/hooks/crud/use-ledger"
import {
  AllocationChart,
  PerformanceChart,
} from "@/components/dashboard/charts"

// Chart data for compliance analytics
const controlStatusData = [
  { name: "Compliant", value: 18, color: "#10b981" },
  { name: "In Progress", value: 4, color: "#f59e0b" },
  { name: "Non-Compliant", value: 2, color: "#ef4444" },
  { name: "Not Started", value: 1, color: "#71717a" },
]

const complianceTrendData = [
  { month: "Jul", portfolio: 68, benchmark: 75 },
  { month: "Aug", portfolio: 72, benchmark: 76 },
  { month: "Sep", portfolio: 75, benchmark: 78 },
  { month: "Oct", portfolio: 78, benchmark: 80 },
  { month: "Nov", portfolio: 82, benchmark: 82 },
  { month: "Dec", portfolio: 88, benchmark: 85 },
]

const statusConfig = {
  compliant: {
    label: "Compliant",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  non_compliant: {
    label: "Non-Compliant",
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  not_started: {
    label: "Not Started",
    icon: Clock,
    color: "text-zinc-400",
    bg: "bg-zinc-400/10",
  },
} as const

// Audit Log Configuration
const actionLabels: Record<string, string> = {
  asset_created: "Asset Created",
  asset_updated: "Asset Updated",
  asset_sold: "Asset Sold",
  document_uploaded: "Document Uploaded",
  document_verified: "Document Verified",
  document_expired: "Document Expired",
  valuation_updated: "Valuation Updated",
  user_login: "User Login",
  user_invited: "User Invited",
  report_generated: "Report Generated",
  permission_changed: "Permission Changed",
  client_added: "Client Added",
  compliance_check: "Compliance Check",
}

const actionColors: Record<string, string> = {
  asset_created: "bg-emerald-500/10 text-emerald-400",
  asset_updated: "bg-tiffany-500/10 text-tiffany-500",
  asset_sold: "bg-amber-500/10 text-amber-400",
  document_uploaded: "bg-blue-500/10 text-blue-400",
  document_verified: "bg-emerald-500/10 text-emerald-400",
  document_expired: "bg-red-500/10 text-red-400",
  valuation_updated: "bg-tiffany-500/10 text-tiffany-500",
  user_login: "bg-zinc-500/10 text-zinc-400",
  user_invited: "bg-blue-500/10 text-blue-400",
  report_generated: "bg-cyan-500/10 text-cyan-400",
  permission_changed: "bg-amber-500/10 text-amber-400",
  client_added: "bg-emerald-500/10 text-emerald-400",
  compliance_check: "bg-tiffany-500/10 text-tiffany-500",
}

const entityIcons: Record<string, typeof FileText> = {
  asset: Briefcase,
  document: FileText,
  user: User,
  client: User,
  report: FileText,
}

// Simple Progress component since we don't have it
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full bg-zinc-800 rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-tiffany-500 rounded-full transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export default function CompliancePage() {
  const { controls, updateControlStatus, stats } = useCompliance()
  const { entries } = useLedger()
  const [activeTab, setActiveTab] = React.useState("controls")
  const [auditSearchQuery, setAuditSearchQuery] = React.useState("")
  const [actionFilter, setActionFilter] = React.useState<string>("all")
  const reducedMotion = useReducedMotion()

  const compliantCount = stats.compliant
  const totalCount = stats.total
  const compliancePercentage = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0

  // Group controls by category
  const controlsByCategory = controls.reduce((acc, control) => {
    if (!acc[control.category]) {
      acc[control.category] = []
    }
    acc[control.category].push(control)
    return acc
  }, {} as Record<string, typeof controls>)

  // Filter audit log entries
  const filteredLedgerEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      entry.entity.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      entry.user.toLowerCase().includes(auditSearchQuery.toLowerCase())
    const matchesAction = actionFilter === "all" || entry.action === actionFilter
    return matchesSearch && matchesAction
  })

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
          <h1 className="text-2xl font-bold text-zinc-100">Compliance</h1>
          <p className="text-zinc-400 mt-1">
            SOC 2 Type II controls, evidence tracking & audit logs
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            controls.forEach((c) => {
              if (c.status !== "compliant") {
                updateControlStatus(c.id, "in_progress")
              }
            })
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Run Compliance Check
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Controls Tab */}
        <TabsContent value="controls" className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Overall Compliance</p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">
                  {compliancePercentage}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-tiffany-500/10">
                <Shield className="h-6 w-6 text-tiffany-500" />
              </div>
            </div>
            <ProgressBar value={compliancePercentage} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Controls Passing</p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">
                  {compliantCount}/{totalCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-sm text-zinc-500 mt-4">
              {totalCount - compliantCount} controls need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Last Audit</p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">Q4 2023</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-zinc-500 mt-4">
              Next audit scheduled Q2 2024
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Analytics */}
      <div className="grid lg:grid-cols-3 gap-6">
        <AllocationChart
          data={controlStatusData}
          title="Control Status Distribution"
          description="Breakdown of control compliance states"
        />
        <PerformanceChart
          data={complianceTrendData}
          className="lg:col-span-2"
        />
      </div>

      {/* Controls by Category */}
      <div className="space-y-6">
        {Object.entries(controlsByCategory).map(([category, controls]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{category}</span>
                <Badge variant="outline">
                  {controls.filter((c) => c.status === "compliant").length}/
                  {controls.length} passing
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {controls.map((control) => {
                const status = statusConfig[control.status]
                const StatusIcon = status.icon

                return (
                  <div
                    key={control.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn("p-2 rounded-lg", status.bg)}>
                        <StatusIcon className={cn("h-4 w-4", status.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-100">
                          {control.name}
                        </p>
                        <p className="text-sm text-zinc-500 mt-1">
                          {control.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span>Owner: {control.owner}</span>
                          <span>
                            Last checked:{" "}
                            {format(new Date(control.lastChecked), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select
                        value={control.status}
                        onValueChange={(v) => updateControlStatus(control.id, v as typeof control.status)}
                      >
                        <SelectTrigger className="w-[150px] h-8 text-xs">
                          <Badge
                            variant={
                              control.status === "compliant"
                                ? "success"
                                : control.status === "in_progress"
                                ? "warning"
                                : control.status === "non_compliant"
                                ? "destructive"
                                : "default"
                            }
                          >
                            {status.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compliant">Compliant</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                          <SelectItem value="not_started">Not Started</SelectItem>
                        </SelectContent>
                      </Select>
                      {control.evidenceLinks.length > 0 && (
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Evidence
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-6 space-y-6">
          {/* Security Notice */}
          <Card className="border-tiffany-500/20 bg-tiffany-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-tiffany-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-100">Tamper-Proof Audit Trail</p>
                <p className="text-xs text-zinc-400">
                  All entries are cryptographically signed and immutable. This log meets SOC 2 Type II requirements.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder="Search actions, entities, users..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {Object.entries(actionLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log Timeline */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{filteredLedgerEntries.length} entries</span>
                <Badge variant="outline" className="font-normal">
                  Last updated recently
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mt-4 space-y-0">
                {filteredLedgerEntries.slice(0, 20).map((entry, index) => {
                  const Icon = entityIcons[entry.entityType] || FileText
                  const actionColor = actionColors[entry.action] || "bg-zinc-500/10 text-zinc-400"
                  const [bgColor, textColor] = actionColor.split(" ")

                  return (
                    <div key={entry.id} className="flex gap-4 py-4 border-b border-zinc-800 last:border-0">
                      <div className="flex flex-col items-center">
                        <div className={cn("p-2 rounded-lg", bgColor)}>
                          <Icon className={cn("h-4 w-4", textColor)} />
                        </div>
                        {index < filteredLedgerEntries.length - 1 && (
                          <div className="w-px flex-1 bg-zinc-800 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={cn("text-xs", textColor)}>
                                {actionLabels[entry.action] || entry.action}
                              </Badge>
                              {entry.isSensitive && (
                                <Badge variant="warning" className="text-xs gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Sensitive
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-zinc-100">{entry.details}</p>
                            <p className="mt-1 text-sm text-tiffany-500">{entry.entity}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.user}
                          </span>
                          <span>
                            {format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          <span className="font-mono">{entry.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </animated.div>
  )
}
