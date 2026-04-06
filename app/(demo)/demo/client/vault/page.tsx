"use client"

import { FolderLock, FileText, Download, Search, FileImage, File } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"
import * as React from "react"

const DOCUMENTS = [
  { id: "d1", name: "Q4 2024 Statement", category: "Statements", date: "Jan 15, 2025", type: "PDF", size: "1.2 MB", icon: <FileText className="h-4 w-4 text-blue-400" /> },
  { id: "d2", name: "2024 Annual Tax Report", category: "Tax", date: "Jan 10, 2025", type: "PDF", size: "980 KB", icon: <FileText className="h-4 w-4 text-purple-400" /> },
  { id: "d3", name: "Account Agreement — 2023", category: "Legal", date: "Mar 5, 2023", type: "PDF", size: "540 KB", icon: <FileText className="h-4 w-4 text-amber-400" /> },
  { id: "d4", name: "KYC Verification", category: "Compliance", date: "Jan 20, 2023", type: "PDF", size: "220 KB", icon: <FileText className="h-4 w-4 text-emerald-400" /> },
  { id: "d5", name: "Q3 2024 Statement", category: "Statements", date: "Oct 12, 2024", type: "PDF", size: "1.1 MB", icon: <FileText className="h-4 w-4 text-blue-400" /> },
  { id: "d6", name: "Property Deed — Primary Residence", category: "Legal", date: "Jun 8, 2021", type: "PDF", size: "3.4 MB", icon: <FileImage className="h-4 w-4 text-orange-400" /> },
  { id: "d7", name: "2023 Annual Tax Report", category: "Tax", date: "Jan 14, 2024", type: "PDF", size: "860 KB", icon: <FileText className="h-4 w-4 text-purple-400" /> },
  { id: "d8", name: "Investment Policy Statement", category: "Legal", date: "Feb 1, 2023", type: "PDF", size: "410 KB", icon: <File className="h-4 w-4 text-zinc-400" /> },
]

const CATEGORIES = ["All", "Statements", "Tax", "Legal", "Compliance"]

const CATEGORY_COLORS: Record<string, string> = {
  Statements: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Tax: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Legal: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Compliance: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

export default function DemoClientVaultPage() {
  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState("All")

  const filtered = DOCUMENTS.filter((d) =>
    (category === "All" || d.category === category) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Document Vault</h1>
        <p className="text-zinc-400 mt-1 text-sm">Statements, tax documents, and legal agreements</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === cat ? "bg-tiffany-500/10 text-tiffany-500 border border-tiffany-500/20" : "text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 hover:border-zinc-600"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderLock className="h-4 w-4 text-tiffany-500" />
              {filtered.length} document{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
            <DemoMutationTooltip>
              <button className="text-xs px-3 py-1.5 border border-zinc-700 text-zinc-400 rounded-lg hover:border-zinc-500 transition-colors">
                + Upload
              </button>
            </DemoMutationTooltip>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-800/60">
            {filtered.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800">{doc.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{doc.name}</p>
                    <p className="text-xs text-zinc-500">{doc.size} · {doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex ${CATEGORY_COLORS[doc.category] ?? ""}`}>
                    {doc.category}
                  </Badge>
                  <DemoMutationTooltip>
                    <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </DemoMutationTooltip>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-zinc-600">No documents match your search.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
