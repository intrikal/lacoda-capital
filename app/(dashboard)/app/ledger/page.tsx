"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, formatDistanceToNow } from "date-fns"
import type { LucideIcon } from "lucide-react"
import {
  Search,
  Download,
  Shield,
  FileText,
  User,
  Briefcase,
  Loader,
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
import { getLedgerEntries, exportLedgerCSV } from "@/lib/services/ledger.service"
import type { LedgerRow } from "@/lib/services/ledger.service"

const actionLabels: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  archived: "Archived",
  document_uploaded: "Document Uploaded",
  document_verified: "Document Verified",
  document_expired: "Document Expired",
  document_downloaded: "Document Downloaded",
  asset_valued: "Asset Valued",
  asset_transferred: "Asset Transferred",
  asset_sold: "Asset Sold",
  login: "Login",
  logout: "Logout",
  permission_changed: "Permission Changed",
  report_generated: "Report Generated",
  report_shared: "Report Shared",
  compliance_reviewed: "Compliance Reviewed",
  compliance_approved: "Compliance Approved",
}

const actionColors: Record<string, string> = {
  created: "bg-emerald-500/10 text-emerald-400",
  updated: "bg-tiffany-500/10 text-tiffany-500",
  deleted: "bg-red-500/10 text-red-400",
  archived: "bg-amber-500/10 text-amber-400",
  document_uploaded: "bg-blue-500/10 text-blue-400",
  document_verified: "bg-emerald-500/10 text-emerald-400",
  document_expired: "bg-red-500/10 text-red-400",
  document_downloaded: "bg-blue-500/10 text-blue-400",
  asset_valued: "bg-tiffany-500/10 text-tiffany-500",
  asset_transferred: "bg-cyan-500/10 text-cyan-400",
  asset_sold: "bg-amber-500/10 text-amber-400",
  login: "bg-zinc-500/10 text-zinc-400",
  logout: "bg-zinc-500/10 text-zinc-400",
  permission_changed: "bg-amber-500/10 text-amber-400",
  report_generated: "bg-cyan-500/10 text-cyan-400",
  report_shared: "bg-cyan-500/10 text-cyan-400",
  compliance_reviewed: "bg-blue-500/10 text-blue-400",
  compliance_approved: "bg-emerald-500/10 text-emerald-400",
}

const targetTypeIcons: Record<string, LucideIcon> = {
  asset: Briefcase,
  document: FileText,
  user: User,
  client: User,
  report: FileText,
  org: Briefcase,
  entity: Briefcase,
  task: FileText,
}

function LedgerEntry({
  entry,
  index,
}: {
  entry: LedgerRow
  index: number
}) {
  const reducedMotion = useReducedMotion()
  const Icon = targetTypeIcons[entry.targetType] || FileText
  const colorClass = actionColors[entry.action] || "bg-zinc-500/10 text-zinc-400"
  const [bgColor, textColor] = colorClass.split(" ")

  const spring = useSpring({
    from: { opacity: 0, transform: "translateX(-20px)" },
    to: { opacity: 1, transform: "translateX(0px)" },
    config: config.gentle,
    delay: reducedMotion ? 0 : index * 50,
    immediate: reducedMotion,
  })

  const details = (entry.payload?.details as string) || `${entry.action} on ${entry.targetType}`

  return (
    <animated.div style={spring}>
      <div className="flex gap-4 py-4 border-b border-zinc-800 last:border-0">
        {/* Timeline indicator */}
        <div className="flex flex-col items-center">
          <div className={cn("p-2 rounded-lg", bgColor)}>
            <Icon className={cn("h-4 w-4", textColor)} />
          </div>
          <div className="w-px flex-1 bg-zinc-800 mt-2" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-xs", textColor)}>
                  {actionLabels[entry.action] || entry.action}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-zinc-100">{details}</p>
              <p className="mt-1 text-sm text-tiffany-500">{entry.targetId}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {entry.actorName}
            </span>
            <span>
              {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
            {entry.ipAddress && (
              <span className="font-mono">{entry.ipAddress}</span>
            )}
          </div>
        </div>
      </div>
    </animated.div>
  )
}

export default function LedgerPage() {
  const [entries, setEntries] = React.useState<LedgerRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isExporting, setIsExporting] = React.useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [actionFilter, setActionFilter] = React.useState<string>("")
  const [targetTypeFilter, setTargetTypeFilter] = React.useState<string>("")
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [hasMore, setHasMore] = React.useState(false)

  const reducedMotion = useReducedMotion()

  // Load initial entries
  React.useEffect(() => {
    const loadEntries = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await getLedgerEntries({
          orgId: "", // Will be obtained from session in the service
          action: actionFilter || undefined,
          targetType: targetTypeFilter || undefined,
          search: searchQuery || undefined,
          limit: 50,
        })
        setEntries(result.items)
        setNextCursor(result.nextCursor)
        setHasMore(!!result.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load entries")
      } finally {
        setIsLoading(false)
      }
    }

    loadEntries()
  }, [actionFilter, targetTypeFilter, searchQuery])

  const handleLoadMore = async () => {
    if (!nextCursor) return

    try {
      const result = await getLedgerEntries({
        orgId: "", // Will be obtained from session in the service
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        search: searchQuery || undefined,
        cursor: nextCursor,
        limit: 50,
      })
      setEntries((prev) => [...prev, ...result.items])
      setNextCursor(result.nextCursor)
      setHasMore(!!result.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more entries")
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const csv = await exportLedgerCSV({
        orgId: "",
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        search: searchQuery || undefined,
      })

      // Create blob and download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `audit-ledger-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export")
    } finally {
      setIsExporting(false)
    }
  }

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
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting || entries.length === 0}
        >
          {isExporting ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </>
          )}
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
              All entries are immutable and append-only. This log meets SOC 2
              Type II requirements.
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
                placeholder="Search IDs, names..."
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
                <SelectItem value="">All Actions</SelectItem>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="org">Organization</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="entity">Entity</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="report">Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Ledger Timeline */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{entries.length} entries</span>
            {entries[0] && (
              <Badge variant="outline" className="font-normal">
                Last updated{" "}
                {formatDistanceToNow(new Date(entries[0].createdAt), {
                  addSuffix: true,
                })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && entries.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-5 w-5 text-zinc-500 animate-spin mr-2" />
              <span className="text-zinc-500">Loading audit trail...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500">No audit events found</p>
            </div>
          ) : (
            <>
              <div className="mt-4">
                {entries.map((entry, index) => (
                  <LedgerEntry key={entry.id} entry={entry} index={index} />
                ))}
              </div>
              {hasMore && (
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="w-full mt-4"
                >
                  Load More
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </animated.div>
  )
}
