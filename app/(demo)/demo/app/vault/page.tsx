"use client"

import { FileText, Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"

const demoDocuments = [
  { id: "d1", name: "Q4 2025 Financial Statement.pdf", folder: "Financials", status: "verified", size: "2.4 MB", updatedAt: "2026-01-15" },
  { id: "d2", name: "Smith Trust Agreement.pdf", folder: "Legal", status: "verified", size: "1.8 MB", updatedAt: "2025-11-20" },
  { id: "d3", name: "KYC - Johnson Passport.pdf", folder: "KYC", status: "verified", size: "420 KB", updatedAt: "2025-09-05" },
  { id: "d4", name: "2025 Tax Return - Chen Holdings.pdf", folder: "Tax", status: "pending", size: "3.1 MB", updatedAt: "2026-03-01" },
  { id: "d5", name: "Insurance Policy - Manhattan Penthouse.pdf", folder: "Insurance", status: "verified", size: "1.2 MB", updatedAt: "2025-12-10" },
  { id: "d6", name: "Appraisal Report - Downtown Office.pdf", folder: "Valuations", status: "expired", size: "5.6 MB", updatedAt: "2025-06-15" },
]

export default function DemoVaultPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Document Vault</h1>
          <p className="text-zinc-400 mt-1">{demoDocuments.length} documents</p>
        </div>
        <DemoMutationTooltip>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium opacity-75">
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </DemoMutationTooltip>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-800">
            {demoDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800">
                    <FileText className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{doc.name}</p>
                    <p className="text-xs text-zinc-500">{doc.folder} · {doc.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">{doc.updatedAt}</span>
                  <Badge
                    variant={
                      doc.status === "verified" ? "success" :
                      doc.status === "expired" ? "destructive" :
                      "outline"
                    }
                    className="text-xs"
                  >
                    {doc.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
