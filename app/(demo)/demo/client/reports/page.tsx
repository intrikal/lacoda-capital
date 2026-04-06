"use client"

import { FileBarChart2, Download, Calendar, TrendingUp, FileText, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

const REPORTS = [
  {
    id: "r1",
    title: "Q4 2024 Portfolio Performance",
    type: "Performance",
    generated: "Jan 15, 2025",
    period: "Oct – Dec 2024",
    status: "ready",
    size: "2.4 MB",
    icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
  },
  {
    id: "r2",
    title: "2024 Annual Tax Summary",
    type: "Tax",
    generated: "Jan 10, 2025",
    period: "Full Year 2024",
    status: "ready",
    size: "1.8 MB",
    icon: <FileText className="h-4 w-4 text-purple-400" />,
  },
  {
    id: "r3",
    title: "Q3 2024 Portfolio Performance",
    type: "Performance",
    generated: "Oct 12, 2024",
    period: "Jul – Sep 2024",
    status: "ready",
    size: "2.1 MB",
    icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
  },
  {
    id: "r4",
    title: "Asset Allocation Review",
    type: "Allocation",
    generated: "Dec 5, 2024",
    period: "As of Dec 2024",
    status: "ready",
    size: "980 KB",
    icon: <BarChart3 className="h-4 w-4 text-tiffany-500" />,
  },
  {
    id: "r5",
    title: "Q1 2025 Outlook",
    type: "Forecast",
    generated: "—",
    period: "Jan – Mar 2025",
    status: "pending",
    size: "—",
    icon: <FileBarChart2 className="h-4 w-4 text-amber-400" />,
  },
]

const TYPE_COLORS: Record<string, string> = {
  Performance: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Tax: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Allocation: "bg-tiffany-500/10 text-tiffany-500 border-tiffany-500/20",
  Forecast: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

export default function DemoClientReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Reports</h1>
        <p className="text-zinc-400 mt-1 text-sm">Advisor-generated reports for your portfolio</p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base">All Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-800/60">
            {REPORTS.map((report) => (
              <div key={report.id} className="flex items-center justify-between px-4 py-4 hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-zinc-800">{report.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{report.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar className="h-3 w-3 text-zinc-600" />
                      <span className="text-xs text-zinc-500">{report.period}</span>
                      {report.generated !== "—" && (
                        <span className="text-xs text-zinc-600">· Generated {report.generated}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex ${TYPE_COLORS[report.type] ?? ""}`}>
                    {report.type}
                  </Badge>
                  {report.status === "pending" ? (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">In preparation</span>
                  ) : (
                    <DemoMutationTooltip>
                      <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-2.5 py-1.5 rounded-lg transition-colors">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    </DemoMutationTooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
