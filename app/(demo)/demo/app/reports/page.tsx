"use client"

import { BarChart3, Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

const demoReports = [
  { id: "r1", name: "Annual Portfolio Review 2025", type: "portfolio_summary", status: "published", createdAt: "2026-01-20", versions: 3 },
  { id: "r2", name: "Q4 Asset Allocation Report", type: "asset_allocation", status: "published", createdAt: "2026-01-05", versions: 2 },
  { id: "r3", name: "Tax Summary 2025", type: "tax_summary", status: "draft", createdAt: "2026-02-15", versions: 1 },
  { id: "r4", name: "SOC 2 Compliance Report", type: "compliance", status: "published", createdAt: "2025-12-01", versions: 4 },
  { id: "r5", name: "Client Statement - Johnson Family", type: "client_statement", status: "published", createdAt: "2026-01-31", versions: 1 },
]

const typeLabels: Record<string, string> = {
  portfolio_summary: "Portfolio Summary",
  asset_allocation: "Asset Allocation",
  tax_summary: "Tax Summary",
  compliance: "Compliance",
  client_statement: "Client Statement",
}

export default function DemoReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Reports</h1>
          <p className="text-zinc-400 mt-1">{demoReports.length} reports generated</p>
        </div>
        <DemoMutationTooltip>
          <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium opacity-75">
            + Generate Report
          </button>
        </DemoMutationTooltip>
      </div>

      <div className="grid gap-4">
        {demoReports.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-zinc-800">
                  <BarChart3 className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{report.name}</p>
                  <p className="text-xs text-zinc-500">
                    {typeLabels[report.type] ?? report.type} · {report.versions} version{report.versions !== 1 ? "s" : ""} · {report.createdAt}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={report.status === "published" ? "success" : "outline"} className="text-xs">
                  {report.status}
                </Badge>
                <DemoMutationTooltip>
                  <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                </DemoMutationTooltip>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
