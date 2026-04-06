"use client"

import { format } from "date-fns"
import { TrendingUp, Calendar, Users, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  demoKpis,
  demoAllocation,
  demoClients,
  demoComplianceStats,
} from "@/lib/demo/data"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function ProgressBar({ value }: { value: number }) {
  const barColor = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${value}%` }} />
    </div>
  )
}

export default function DemoAppPage() {
  const totalAUM = demoKpis[0].value
  const clientCount = demoKpis[1].value

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-zinc-100">
            Welcome back, Sarah
          </h1>
          <Badge variant="outline" className="text-tiffany-500 border-tiffany-500/30">
            {clientCount} Clients
          </Badge>
        </div>
        <p className="text-zinc-400 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* AUM Hero */}
      <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-sm font-medium text-zinc-400 mb-1">Total Assets Under Management</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-zinc-100">{formatCurrency(totalAUM)}</span>
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-lg font-semibold">+6.5%</span>
                </div>
              </div>
              <p className="text-sm text-zinc-500 mt-2">
                <span className="text-emerald-400">+{formatCurrency(1500000)}</span> this month
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">YTD Return</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">+14.6%</span>
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-xs text-zinc-500 mt-1">vs S&P 500: +11.2%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {demoKpis.map((kpi) => {
          const change =
            kpi.previousValue > 0
              ? ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100
              : 0
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <p className="text-sm text-zinc-400">{kpi.label}</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {kpi.format === "currency"
                    ? formatCurrency(kpi.value)
                    : kpi.value.toLocaleString()}
                </p>
                <p className={cn(
                  "text-xs mt-2",
                  change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400" : "text-zinc-500"
                )}>
                  {change > 0 ? "+" : ""}{change.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Allocation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {demoAllocation.map((item) => {
                const pct = (item.value / totalAUM) * 100
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-zinc-300 w-40">{item.name}</span>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                    <span className="text-sm text-zinc-400 w-20 text-right">{formatCurrency(item.value)}</span>
                    <span className="text-xs text-zinc-500 w-12 text-right">{pct.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Widget */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-tiffany-500" />
              Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-zinc-400">Overall</span>
                <span className="text-sm font-bold text-zinc-100">{demoComplianceStats.score}%</span>
              </div>
              <ProgressBar value={demoComplianceStats.score} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-lg font-bold text-zinc-100">{demoComplianceStats.verified}</p>
                <p className="text-[10px] text-zinc-500">Verified</p>
              </div>
              <div className="p-2 rounded bg-amber-500/5 border border-amber-500/10">
                <p className="text-lg font-bold text-zinc-100">{demoComplianceStats.active - demoComplianceStats.verified}</p>
                <p className="text-[10px] text-zinc-500">Remaining</p>
              </div>
              <div className="p-2 rounded bg-red-500/5 border border-red-500/10">
                <p className="text-lg font-bold text-red-400">{demoComplianceStats.overdue}</p>
                <p className="text-[10px] text-zinc-500">Overdue</p>
              </div>
            </div>
            {Object.entries(demoComplianceStats.byFramework).map(([name, data]) => {
              const pct = Math.round((data.verified / data.total) * 100)
              return (
                <div key={name}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-zinc-400">{name}</span>
                    <span className="text-xs text-zinc-500">{data.verified}/{data.total}</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            Recent Clients
          </CardTitle>
          <DemoMutationTooltip>
            <span className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors">
              + Add Client
            </span>
          </DemoMutationTooltip>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demoClients.slice(0, 5).map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                    {client.displayName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{client.displayName}</p>
                    <p className="text-xs text-zinc-500">
                      {client.entityCount} entities · {client.assetCount} assets
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-100">{formatCurrency(client.totalAUM)}</p>
                  <Badge variant="outline" className="text-[10px]">{client.clientType}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
