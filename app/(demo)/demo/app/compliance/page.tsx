"use client"

import { Shield, CheckCircle2, Clock, AlertCircle, CalendarClock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { demoComplianceStats } from "@/lib/demo/data"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

function ProgressBar({ value }: { value: number }) {
  const barColor = value === 100 ? "bg-emerald-500" : value >= 60 ? "bg-tiffany-500" : value >= 30 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${value}%` }} />
    </div>
  )
}

const demoControls = [
  { code: "SOC2-CC1.1", name: "Access Control Policy", framework: "SOC2", status: "verified" as const, assignee: "Sarah Johnson", dueDate: null },
  { code: "SOC2-CC6.1", name: "Logical Access Security", framework: "SOC2", status: "verified" as const, assignee: "Michael Chen", dueDate: null },
  { code: "SOC2-CC7.2", name: "System Monitoring", framework: "SOC2", status: "implemented" as const, assignee: "Emily Patel", dueDate: "2026-04-15" },
  { code: "SOC2-CC8.1", name: "Change Management", framework: "SOC2", status: "in_progress" as const, assignee: "Sarah Johnson", dueDate: "2026-03-30" },
  { code: "KYC-001", name: "Client Identity Verification", framework: "CUSTOM", status: "verified" as const, assignee: "Michael Chen", dueDate: null },
  { code: "AML-001", name: "Source of Funds Documentation", framework: "CUSTOM", status: "verified" as const, assignee: "Emily Patel", dueDate: null },
  { code: "GDPR-001", name: "Data Processing Consent", framework: "GDPR", status: "verified" as const, assignee: "Sarah Johnson", dueDate: null },
  { code: "GDPR-002", name: "Right to Erasure Process", framework: "GDPR", status: "not_started" as const, assignee: null, dueDate: "2026-03-15" },
]

const statusConfig = {
  not_started: { label: "Not Started", icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10", badge: "destructive" as const },
  in_progress: { label: "In Progress", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", badge: "warning" as const },
  implemented: { label: "Implemented", icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-400/10", badge: "outline" as const },
  verified: { label: "Verified", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-400/10", badge: "success" as const },
}

export default function DemoCompliancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Compliance</h1>
          <p className="text-zinc-400 mt-1">Compliance controls, evidence &amp; audit logs</p>
        </div>
        <DemoMutationTooltip>
          <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium opacity-75">
            + Add Control
          </button>
        </DemoMutationTooltip>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-400">Compliance Score</p>
            <p className="text-3xl font-bold text-zinc-100 mt-1">{demoComplianceStats.score}%</p>
            <ProgressBar value={demoComplianceStats.score} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-400">Verified</p>
            <p className="text-3xl font-bold text-zinc-100 mt-1">{demoComplianceStats.verified}/{demoComplianceStats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-400">Overdue</p>
            <p className="text-3xl font-bold text-red-400 mt-1">{demoComplianceStats.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-400">Total Controls</p>
            <p className="text-3xl font-bold text-zinc-100 mt-1">{demoComplianceStats.active}</p>
          </CardContent>
        </Card>
      </div>

      {/* Framework Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Framework Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(demoComplianceStats.byFramework).map(([name, data]) => {
            const pct = Math.round((data.verified / data.total) * 100)
            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-zinc-200">{name}</span>
                  <span className="text-xs text-zinc-400">{data.verified}/{data.total} verified ({pct}%)</span>
                </div>
                <ProgressBar value={pct} />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Controls List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {demoControls.map((control) => {
            const status = statusConfig[control.status]
            const StatusIcon = status.icon
            const isOverdue = control.dueDate && new Date(control.dueDate) < new Date() && (control.status as string) !== "verified"

            return (
              <div
                key={control.code}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  isOverdue ? "border-red-500/50 bg-red-500/5" : "border-zinc-800"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", status.bg)}>
                    <StatusIcon className={cn("h-4 w-4", status.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                        {control.code}
                      </span>
                      <p className="text-sm font-medium text-zinc-100">{control.name}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{control.framework}</span>
                      {control.assignee ? (
                        <span>{control.assignee}</span>
                      ) : (
                        isOverdue && <span className="text-red-400 font-medium">Unassigned</span>
                      )}
                      {control.dueDate && (
                        <span className={cn(isOverdue ? "text-red-400 font-medium" : "")}>
                          <CalendarClock className="h-3 w-3 inline mr-1" />
                          {isOverdue ? "Overdue" : "Due"}: {control.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant={status.badge}>{status.label}</Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
