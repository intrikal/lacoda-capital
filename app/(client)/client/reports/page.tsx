"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Download,
  Eye,
  FileText,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// Client's reports
const reports = [
  { id: "1", name: "Q4 2023 Performance Report", type: "performance", period: "Oct - Dec 2023", status: "ready", date: "2024-01-15" },
  { id: "2", name: "Annual Portfolio Summary 2023", type: "portfolio", period: "Full Year 2023", status: "ready", date: "2024-01-20" },
  { id: "3", name: "Tax Preparation Report 2023", type: "tax", period: "Tax Year 2023", status: "ready", date: "2024-01-22" },
  { id: "4", name: "Q1 2024 Performance Report", type: "performance", period: "Jan - Mar 2024", status: "generating", date: "2024-01-25" },
  { id: "5", name: "Risk Analysis Report", type: "risk", period: "As of Dec 2023", status: "ready", date: "2024-01-10" },
  { id: "6", name: "Asset Allocation Review", type: "portfolio", period: "Q4 2023", status: "ready", date: "2024-01-08" },
]

const reportTypeConfig = {
  performance: { label: "Performance", icon: BarChart3, color: "text-tiffany-500", bg: "bg-tiffany-500/10" },
  portfolio: { label: "Portfolio", icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
  tax: { label: "Tax", icon: FileText, color: "text-amber-400", bg: "bg-amber-400/10" },
  risk: { label: "Risk", icon: BarChart3, color: "text-purple-400", bg: "bg-purple-400/10" },
}

const statusConfig = {
  ready: { label: "Ready", icon: CheckCircle2, color: "text-emerald-400" },
  generating: { label: "Generating", icon: Clock, color: "text-amber-400" },
}

export default function ClientReportsPage() {
  const reducedMotion = useReducedMotion()

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">My Reports</h1>
        <p className="text-zinc-400 mt-1">
          View and download your portfolio reports
        </p>
      </div>

      {/* Quick Download Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(reportTypeConfig).map(([key, config]) => (
          <Card key={key} className="cursor-pointer hover:border-zinc-700 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", config.bg)}>
                <config.icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div>
                <p className="font-medium text-zinc-100">{config.label}</p>
                <p className="text-xs text-zinc-500">Latest Report</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reports</CardTitle>
          <CardDescription>Your generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => {
              const typeConfig = reportTypeConfig[report.type as keyof typeof reportTypeConfig]
              const status = statusConfig[report.status as keyof typeof statusConfig]

              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                      <typeConfig.icon className={cn("h-5 w-5", typeConfig.color)} />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">{report.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {report.period}
                        </span>
                        <span>
                          Generated {format(new Date(report.date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <status.icon className={cn("h-4 w-4", status.color)} />
                      <span className={cn("text-sm", status.color)}>{status.label}</span>
                    </div>

                    {report.status === "ready" && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Request Report */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-100">Need a custom report?</p>
              <p className="text-sm text-zinc-400 mt-1">
                Contact your advisor to request a custom analysis or report.
              </p>
            </div>
            <Button>Request Report</Button>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
