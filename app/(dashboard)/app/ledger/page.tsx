"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, formatDistanceToNow } from "date-fns"
import {
  Search,
  Filter,
  Download,
  Shield,
  FileText,
  User,
  Briefcase,
  AlertTriangle,
  ChevronDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useLedger } from "@/lib/hooks/crud/use-ledger"
import type { LedgerEntry as LedgerEntryType } from "@/lib/mock/types"

const actionLabels = {
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
} as const

const actionColors = {
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
} as const

const entityIcons = {
  asset: Briefcase,
  document: FileText,
  user: User,
  client: User,
  report: FileText,
}

function LedgerEntry({
  entry,
  index,
}: {
  entry: LedgerEntryType
  index: number
}) {
  const reducedMotion = useReducedMotion()
  const Icon = entityIcons[entry.entityType] || FileText

  const spring = useSpring({
    from: { opacity: 0, transform: "translateX(-20px)" },
    to: { opacity: 1, transform: "translateX(0px)" },
    config: config.gentle,
    delay: reducedMotion ? 0 : index * 50,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring}>
      <div className="flex gap-4 py-4 border-b border-zinc-800 last:border-0">
        {/* Timeline indicator */}
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "p-2 rounded-lg",
              actionColors[entry.action].split(" ")[0]
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                actionColors[entry.action].split(" ")[1]
              )}
            />
          </div>
          <div className="w-px flex-1 bg-zinc-800 mt-2" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    actionColors[entry.action].split(" ")[1]
                  )}
                >
                  {actionLabels[entry.action]}
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
    </animated.div>
  )
}

export default function LedgerPage() {
  const { entries } = useLedger()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [actionFilter, setActionFilter] = React.useState<string>("all")
  const [userFilter, setUserFilter] = React.useState<string>("all")
  const reducedMotion = useReducedMotion()

  const uniqueUsers = Array.from(new Set(entries.map((e) => e.user)))

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.user.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAction = actionFilter === "all" || entry.action === actionFilter
    const matchesUser = userFilter === "all" || entry.user === userFilter
    return matchesSearch && matchesAction && matchesUser
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
          <h1 className="text-2xl font-bold text-zinc-100">Audit Ledger</h1>
          <p className="text-zinc-400 mt-1">
            Immutable record of all system actions
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-tiffany-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-100">
              Tamper-Proof Audit Trail
            </p>
            <p className="text-xs text-zinc-400">
              All entries are cryptographically signed and immutable. This log
              meets SOC 2 Type II requirements.
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Timeline */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{filteredEntries.length} entries</span>
            <Badge variant="outline" className="font-normal">
              Last updated{" "}
              {formatDistanceToNow(new Date(filteredEntries[0]?.timestamp), {
                addSuffix: true,
              })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mt-4">
            {filteredEntries.map((entry, index) => (
              <LedgerEntry key={entry.id} entry={entry} index={index} />
            ))}
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
