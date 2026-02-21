"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Search,
  Upload,
  Folder,
  FileText,
  FileCheck,
  FileClock,
  FileWarning,
  Download,
  Eye,
  MoreHorizontal,
  Plus,
  X,
  Star,
  Trash2,
  FolderOpen,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { documentStatusConfig } from "@/lib/mock/data"
import type { DocumentStatus } from "@/lib/mock/types"
import { ContentCard, StatCard, PageHeader, Tabs } from "@/components/dashboard/content-card"
import type { LucideIcon } from "lucide-react"
import { useDocuments } from "@/lib/hooks/crud/use-documents"

const statusIcons: Record<DocumentStatus, LucideIcon> = {
  verified: FileCheck,
  pending: FileClock,
  expired: FileWarning,
  missing: FileText,
}

function UploadDocumentDialog({ onUpload }: { onUpload: (data: { name: string; folder: string; tags: string[] }) => void }) {
  const [open, setOpen] = React.useState(false)
  const [docName, setDocName] = React.useState("")
  const [folder, setFolder] = React.useState("Real Estate")
  const [tags, setTags] = React.useState("")

  function handleSubmit() {
    if (!docName.trim()) return
    onUpload({
      name: docName.trim(),
      folder,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    })
    setDocName("")
    setTags("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a new document to your secure vault
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-zinc-600 transition-colors">
            <Upload className="h-8 w-8 mx-auto text-zinc-500 mb-4" />
            <p className="text-sm text-zinc-400">
              Drag and drop files here, or <span className="text-tiffany-500">browse</span>
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              PDF, DOC, XLS, JPG up to 50MB
            </p>
          </div>
          <div className="space-y-2">
            <Label>Document Name</Label>
            <Input
              placeholder="e.g., Q4 Tax Report"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Tax">Tax</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Investments">Investments</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <Input
              placeholder="Add tags separated by commas"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type TabId = "all" | "verified" | "pending" | "expired"

export default function VaultPage() {
  const { documents, addDocument, deleteDocument, stats } = useDocuments()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [folderFilter, setFolderFilter] = React.useState<string>("all")

  const folders = React.useMemo(
    () => Array.from(new Set(documents.map((d) => d.folder.split("/")[0]))),
    [documents]
  )

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesTab = activeTab === "all" || doc.status === activeTab
    const matchesFolder =
      folderFilter === "all" || doc.folder.startsWith(folderFilter)
    return matchesSearch && matchesTab && matchesFolder
  })

  const tabs = [
    { id: "all", label: "All Documents", count: stats.total },
    { id: "verified", label: "Verified", count: stats.verified },
    { id: "pending", label: "Pending", count: stats.pending },
    { id: "expired", label: "Expired", count: stats.expired },
  ]

  function handleUpload(data: { name: string; folder: string; tags: string[] }) {
    addDocument({
      name: data.name,
      type: "pdf",
      status: "pending",
      uploadedBy: "Alexander Ward",
      uploadedAt: new Date().toISOString(),
      size: "1.2 MB",
      tags: data.tags,
      folder: data.folder,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Vault"
        description={`${stats.total} documents stored securely`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <UploadDocumentDialog onUpload={handleUpload} />
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Documents"
          value={stats.total}
          icon={<FileText className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Verified"
          value={stats.verified}
          icon={<FileCheck className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Pending Review"
          value={stats.pending}
          icon={<FileClock className="h-4 w-4 text-amber-400" />}
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          icon={<FileWarning className="h-4 w-4 text-rose-400" />}
        />
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search documents or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800/60"
          />
        </div>
        <Select value={folderFilter} onValueChange={setFolderFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-zinc-900/50 border-zinc-800/60">
            <Folder className="h-4 w-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Folders</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ContentCard noPadding>
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-sm text-zinc-400">No documents found</p>
            <p className="text-xs text-zinc-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {filteredDocuments.map((doc) => {
              const statusConf = documentStatusConfig[doc.status]
              const StatusIcon = statusIcons[doc.status]
              const isExpired = doc.expiresAt && new Date(doc.expiresAt) < new Date()

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-3 px-4 hover:bg-zinc-800/30 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn("p-2 rounded-lg", statusConf.bg)}>
                      <StatusIcon className={cn("h-4 w-4", statusConf.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {doc.folder}
                        </span>
                        <span>·</span>
                        <span>{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                        <span>·</span>
                        <span>{doc.size}</span>
                      </div>
                      {doc.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 3 && (
                            <span className="text-xs text-zinc-500">+{doc.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isExpired && (
                      <Badge variant="outline" className="text-rose-400 border-rose-400/30">
                        Expired
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn("text-xs hidden sm:inline-flex", statusConf.color)}>
                      {statusConf.label}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                          <DropdownMenuItem>
                            <Star className="h-4 w-4 mr-2" />
                            Add to starred
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Move to folder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem
                            className="text-rose-400"
                            onClick={() => deleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ContentCard>
    </div>
  )
}
