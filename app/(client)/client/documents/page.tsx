/**
 * @file app/(client)/client/documents/page.tsx
 *
 * Client-facing documents vault page.
 *
 * Data source: `useDocuments` hook (lib/hooks/crud/use-documents.ts) which calls
 * documentsService.getDocuments() and exposes CRUD helpers (addDocument,
 * updateDocument, deleteDocument). Aggregate stats (total, verified, pending,
 * expired, missing) are pre-computed inside the hook via `stats.*`.
 *
 * The "Upload" button opens `UploadDocumentDialog`. On submit, `addDocument`
 * is called with a payload built from the selected file and folder. The Delete
 * dropdown item calls `deleteDocument(doc.id)` to remove the entry in-memory.
 *
 * The `Document` type from lib/mock/types uses `uploadedAt` and `folder`
 * instead of the old mock's `date` and `starred` fields. The UI adapts
 * accordingly — starred functionality is preserved via a local Set stored in
 * component state (visual only; not persisted to the service layer yet).
 *
 * tRPC swap path:
 *   Replace `useDocuments` internals with:
 *   `const { data: documents } = trpc.client.documents.list.useQuery()`
 *   `const addDocument         = trpc.client.documents.upload.useMutation()`
 *   `const deleteDocument      = trpc.client.documents.delete.useMutation()`
 *   The consuming component needs zero changes — the hook's return shape is
 *   identical to what tRPC will return.
 */
"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Search,
  Download,
  Eye,
  FileText,
  FileCheck,
  FileClock,
  Folder,
  Upload,
  Plus,
  X,
  CheckCircle2,
  MoreHorizontal,
  FolderOpen,
  Clock,
  Star,
  Trash2,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ContentCard, StatCard } from "@/components/client/content-card"
import { cn } from "@/lib/utils"
import { useDocuments } from "@/lib/hooks/crud/use-documents"
import type { Document } from "@/lib/mock/types"

// ============================================================================
// STATIC DATA
// ============================================================================

const uploadCategories = [
  { id: "tax", label: "Tax Documents", description: "W-2, 1099, tax returns" },
  { id: "identity", label: "Identity Documents", description: "Driver's license, passport" },
  { id: "financial", label: "Financial Statements", description: "Bank statements, pay stubs" },
  { id: "legal", label: "Legal Documents", description: "Trust documents, powers of attorney" },
  { id: "other", label: "Other", description: "Any other documents" },
]

const statusConfig = {
  verified: { label: "Verified", icon: FileCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  pending:  { label: "Pending Review", icon: FileClock, color: "text-amber-400", bg: "bg-amber-500/10" },
  expired:  { label: "Expired", icon: FileClock, color: "text-red-400", bg: "bg-red-500/10" },
  missing:  { label: "Missing", icon: FileText, color: "text-zinc-400", bg: "bg-zinc-500/10" },
}

// ============================================================================
// UPLOAD DIALOG
// ============================================================================

interface UploadDocumentDialogProps {
  /** Called when the user confirms the upload; receives the selected category and file list */
  onUpload: (fileName: string, selectedFolder: string) => void
}

function UploadDocumentDialog({ onUpload }: UploadDocumentDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [dragActive, setDragActive] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [category, setCategory] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    setUploading(true)
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setUploadProgress(i)
    }
    // Call parent handler for each file so the hook adds each document
    const selectedLabel = uploadCategories.find(c => c.id === category)?.label ?? category
    for (const file of files) {
      onUpload(file.name, selectedLabel)
    }
    setUploading(false)
    setOpen(false)
    setFiles([])
    setUploadProgress(0)
    setCategory("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload documents securely to share with your advisor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Document Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {uploadCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span>{cat.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-tiffany-500 bg-tiffany-500/10" : "border-zinc-700 hover:border-zinc-600",
              files.length > 0 && "border-emerald-500/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={handleChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
            />

            {files.length === 0 ? (
              <>
                <Upload className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
                <p className="text-sm text-zinc-400 mb-2">
                  Drag and drop files here, or{" "}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-tiffany-500 hover:text-tiffany-400"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-zinc-500">
                  PDF, DOC, DOCX, JPG, PNG up to 10MB each
                </p>
              </>
            ) : (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded bg-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-200">{file.name}</span>
                      <span className="text-xs text-zinc-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add more files
                </Button>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Uploading...</span>
                <span className="text-zinc-100">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-tiffany-500/5 border border-tiffany-500/20">
            <CheckCircle2 className="h-4 w-4 text-tiffany-500 mt-0.5" />
            <div className="text-xs text-zinc-400">
              <p className="font-medium text-zinc-300">Secure Upload</p>
              <p>Your documents are encrypted during transfer and stored securely.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || !category || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// TAB CONTENT
// ============================================================================

type TabId = "all" | "statements" | "tax" | "legal" | "reports" | "starred"

interface DocumentListProps {
  documents: Document[]
  searchQuery: string
  starredIds: Set<string>
  onToggleStar: (id: string) => void
  onDelete: (id: string) => void
}

function DocumentList({ documents, searchQuery, starredIds, onToggleStar, onDelete }: DocumentListProps) {
  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (filteredDocs.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-sm text-zinc-400">No documents found</p>
        <p className="text-xs text-zinc-500 mt-1">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-zinc-800/60">
      {filteredDocs.map((doc) => {
        const statusEntry = statusConfig[doc.status as keyof typeof statusConfig] ?? statusConfig.pending
        const StatusIcon = statusEntry.icon
        const isStarred = starredIds.has(doc.id)

        return (
          <div
            key={doc.id}
            className="flex items-center justify-between py-3 px-4 hover:bg-zinc-800/30 transition-colors group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className={cn("p-2 rounded-lg", statusEntry.bg)}>
                <StatusIcon className={cn("h-4 w-4", statusEntry.color)} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-100 truncate">{doc.name}</p>
                  {isStarred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {doc.folder}
                  </span>
                  <span>•</span>
                  <span>{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                  <span>•</span>
                  <span>{doc.size}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs hidden sm:inline-flex", statusEntry.color)}>
                {statusEntry.label}
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
                    <DropdownMenuItem onClick={() => onToggleStar(doc.id)}>
                      <Star className="h-4 w-4 mr-2" />
                      {isStarred ? "Remove from starred" : "Add to starred"}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Move to folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem className="text-rose-400" onClick={() => onDelete(doc.id)}>
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
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ClientDocumentsPage() {
  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  // Local starred state (visual only — not persisted to the service layer yet)
  const [starredIds, setStarredIds] = React.useState<Set<string>>(new Set())

  // Hook: replaces the inline documents array + manually computed stat counts
  const { documents, addDocument, deleteDocument, stats } = useDocuments()

  const handleToggleStar = (id: string) => {
    setStarredIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "all",        label: "All",          count: documents.length },
    { id: "statements", label: "Statements",   count: documents.filter(d => d.folder === "Statements").length },
    { id: "tax",        label: "Tax Documents", count: documents.filter(d => d.folder === "Tax Documents").length },
    { id: "legal",      label: "Legal",        count: documents.filter(d => d.folder === "Legal").length },
    { id: "reports",    label: "Reports",      count: documents.filter(d => d.folder === "Reports").length },
    { id: "starred",    label: "Starred",      count: starredIds.size },
  ]

  const getFilteredDocuments = () => {
    switch (activeTab) {
      case "statements": return documents.filter(d => d.folder === "Statements")
      case "tax":        return documents.filter(d => d.folder === "Tax Documents")
      case "legal":      return documents.filter(d => d.folder === "Legal")
      case "reports":    return documents.filter(d => d.folder === "Reports")
      case "starred":    return documents.filter(d => starredIds.has(d.id))
      default:           return documents
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Documents</h1>
          <p className="mt-1 text-sm text-zinc-400">Access statements, tax documents, and reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
          <UploadDocumentDialog
            onUpload={(fileName, selectedFolder) => {
              addDocument({
                name: fileName,
                type: "pdf",
                status: "pending",
                folder: selectedFolder,
                uploadedBy: "John Doe",
                uploadedAt: new Date().toISOString(),
                size: "—",
                tags: [],
              })
            }}
          />
        </div>
      </div>

      {/* Stats — driven by hook */}
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
          icon={<Clock className="h-4 w-4 text-amber-400" />}
        />
        <StatCard
          label="Starred"
          value={starredIds.size}
          icon={<Star className="h-4 w-4 text-amber-400" />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800/60">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "text-tiffany-500"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs",
                    activeTab === tab.id
                      ? "bg-tiffany-500/10 text-tiffany-500"
                      : "bg-zinc-800 text-zinc-400"
                  )}
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-tiffany-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800/60"
          />
        </div>
      </div>

      {/* Document List */}
      <ContentCard noPadding>
        <DocumentList
          documents={getFilteredDocuments()}
          searchQuery={searchQuery}
          starredIds={starredIds}
          onToggleStar={handleToggleStar}
          onDelete={deleteDocument}
        />
      </ContentCard>
    </div>
  )
}
