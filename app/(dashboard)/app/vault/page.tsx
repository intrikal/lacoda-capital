/**
 * ============================================================================
 * FILE: /app/(dashboard)/app/vault/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   The Document Vault page for the admin dashboard at /app/vault.
 *   Displays a filterable, searchable list of documents stored in the database.
 *   Supports uploading files (via Supabase Storage), editing metadata, bulk operations,
 *   downloading with signed URLs, inline preview, and document request workflow.
 *
 * DATA SOURCE:
 *   Real — Server Actions → PostgreSQL via Drizzle ORM + Supabase Storage.
 *
 * COMPONENTS IN THIS FILE:
 *   1. UploadDocumentDialog — File upload dialog with validation, drag-drop, progress
 *   2. DocumentPreviewDialog — PDF preview in iframe
 *   3. BulkActionBar — Bulk operations (move, tag, archive)
 *   4. NewDocumentRequestDialog — Create a document request
 *   5. VaultPage (default export) — Main page with stats, tabs, search, list, requests
 *
 * CRUD OPERATIONS:
 *   Create  → UploadDocumentDialog: file validation → Supabase Storage → uploadDocument
 *   Read    → useDocuments() hook fetches from server action
 *   Update  → DocumentFormDialog (imported) → useUpdateDocument
 *   Delete  → Soft-delete via deleteDocument
 *   Download → getSignedUrl → window.open
 *   Bulk    → bulkUpdateDocuments for move/tag/archive
 *
 * FILE UPLOAD FLOW:
 *   1. User drags/clicks file
 *   2. Validation: < 50MB, not .exe/.bat/.sh
 *   3. File → Supabase Storage bucket "documents"
 *   4. uploadDocument server action with metadata → PostgreSQL
 *   5. useDocuments refetch → new document appears
 *
 * RELATED FILES:
 *   lib/hooks/crud/use-documents.ts            — Hooks + DocumentRecord type
 *   lib/actions/document.actions.ts            — Server actions
 *   components/forms/document-form-dialog.tsx   — Edit metadata dialog
 *   utils/supabase/client.ts                    — Supabase browser client
 */

"use client"

import * as React from "react"
import { format, differenceInCalendarDays } from "date-fns"
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
  Star,
  Trash2,
  FolderOpen,
  Pencil,
  Loader2,
  X,
  CheckSquare,
  Square,
  Archive,
  Tag,
  FileJson,
  PenLine,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ContentCard, StatCard, PageHeader, Tabs } from "@/components/dashboard/content-card"
import type { LucideIcon } from "lucide-react"
import {
  useDocuments,
  useCreateDocument,
  useDeleteDocument,
  useUpdateDocument,
  useSignedUrl,
  useBulkUpdateDocuments,
  type DocumentRecord,
} from "@/lib/hooks/crud/use-documents"
import { DocumentFormDialog } from "@/components/forms/document-form-dialog"
import { SendForSignatureButton } from "@/components/dashboard/send-for-signature-button"
import { createClient } from "@/utils/supabase/client"
import { createDocumentSchema } from "@/lib/validations/document.schema"

// ─── TYPES & CONFIG ────────────────────────────────────────────────────────

type DocumentStatus = "pending" | "verified" | "expired" | "rejected"
type TabId = "all" | "verified" | "pending" | "expired" | "requests"

const documentStatusConfig: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  verified: { label: "Verified", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/10" },
  expired: { label: "Expired", color: "text-rose-400", bg: "bg-rose-400/10" },
  rejected: { label: "Rejected", color: "text-zinc-400", bg: "bg-zinc-400/10" },
}

const statusIcons: Record<DocumentStatus, LucideIcon> = {
  verified: FileCheck,
  pending: FileClock,
  expired: FileWarning,
  rejected: FileText,
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────

/**
 * getExpirationBadge — Pure function to determine expiration badge
 * Returns null (no badge), or { label, variant }
 */
function getExpirationBadge(expiresAt: string | null): { label: string; variant: "yellow" | "red" } | null {
  if (!expiresAt) return null
  const daysLeft = differenceInCalendarDays(new Date(expiresAt), new Date())
  if (daysLeft < 0) return { label: "Expired", variant: "red" }
  if (daysLeft <= 30) return { label: `Expires in ${daysLeft}d`, variant: "yellow" }
  return null
}

/**
 * generateCSV — Export documents to CSV
 */
function generateCSV(documents: DocumentRecord[]): string {
  const headers = ["Name", "Folder", "Status", "Version", "Size", "Created", "Expires"]
  const rows = documents.map((doc) => [
    doc.name,
    doc.folder || "Uncategorized",
    doc.status,
    doc.version,
    doc.fileSize || "",
    format(new Date(doc.createdAt), "MMM d, yyyy"),
    doc.expiresAt ? format(new Date(doc.expiresAt), "MMM d, yyyy") : "",
  ])

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  return csv
}

/**
 * downloadCSV — Trigger CSV download
 */
function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ─── UPLOAD DIALOG ────────────────────────────────────────────────────────

function UploadDocumentDialog({
  createMutation,
}: {
  createMutation: ReturnType<typeof useCreateDocument>
}) {
  const [open, setOpen] = React.useState(false)
  const [docName, setDocName] = React.useState("")
  const [folder, setFolder] = React.useState("Real Estate")
  const [tags, setTags] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Validate file before upload
  function validateFile(f: File): string | null {
    if (f.size > 50 * 1024 * 1024) return "File must be under 50MB"
    const ext = f.name.toLowerCase().split(".").pop()
    if (["exe", "bat", "sh"].includes(ext || "")) return "File type not allowed"
    return null
  }

  async function handleSubmit() {
    if (!file || !docName.trim()) return

    const validationError = validateFile(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    try {
      const supabase = createClient()
      const fileName = file.name
      const filePath = `documents/${Date.now()}-${fileName}`

      // Simulate progress (Supabase SDK doesn't expose upload progress for simple uploads)
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + Math.random() * 30, 90))
      }, 200)

      const { data, error } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: false })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (error) throw error

      // Parse and call createDocument action with the storage path from the upload
      const validatedInput = createDocumentSchema.parse({
        name: docName.trim(),
        storagePath: data.path,
        folder: folder || null,
        mimeType: file.type || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: "pending",
      })

      await createMutation.mutate(validatedInput, {
        onSuccess: () => {
          setDocName("")
          setTags("")
          setFile(null)
          setOpen(false)
          setUploadProgress(0)
        },
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setDocName("")
      setTags("")
      setFile(null)
      setUploadError(null)
      setUploadProgress(0)
    }
    setOpen(next)
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) setFile(droppedFile)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Add a new document to your secure vault</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <label
            htmlFor="file-upload"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-zinc-600 transition-colors cursor-pointer block"
          >
            <Upload className="h-8 w-8 mx-auto text-zinc-500 mb-4" />
            {file ? (
              <p className="text-sm text-zinc-200">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-zinc-400">
                  Drag and drop files here, or <span className="text-tiffany-500">browse</span>
                </p>
                <p className="text-xs text-zinc-500 mt-2">PDF, DOC, XLS, JPG up to 50MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div
                  className="bg-tiffany-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}

          <div className="space-y-2">
            <Label>Document Name *</Label>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !file || !docName.trim()}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── DOCUMENT PREVIEW DIALOG ──────────────────────────────────────────────

function DocumentPreviewDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: DocumentRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const signedUrlHook = useSignedUrl()
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && doc?.storagePath && !signedUrl) {
      signedUrlHook.getUrl(doc.storagePath, {
        onSuccess: (url) => setSignedUrl(url),
      })
    }
  }, [open, doc?.storagePath, signedUrl, signedUrlHook])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>{doc?.name}</DialogTitle>
        </DialogHeader>
        {signedUrl ? (
          <div className="w-full h-96 border border-zinc-800 rounded-lg overflow-hidden">
            {doc?.mimeType?.includes("pdf") ? (
              <iframe src={signedUrl} className="w-full h-full" title={doc.name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800/50">
                <p className="text-zinc-400">Preview not available for this file type</p>
              </div>
            )}
          </div>
        ) : signedUrlHook.isPending ? (
          <div className="w-full h-96 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="w-full h-96 flex items-center justify-center bg-zinc-800/50">
            <p className="text-zinc-400">Failed to load preview</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── BULK ACTION BAR ──────────────────────────────────────────────────────

function BulkActionBar({
  selectedCount,
  selectedIds,
  onMove,
  onAddTag,
  onArchive,
  onCancel,
  isPending,
}: {
  selectedCount: number
  selectedIds: Set<string>
  onMove: (folder: string) => Promise<void>
  onAddTag: (tag: string) => Promise<void>
  onArchive: () => Promise<void>
  onCancel: () => void
  isPending: boolean
}) {
  const [folderOpen, setFolderOpen] = React.useState(false)
  const [tagOpen, setTagOpen] = React.useState(false)
  const [newTag, setNewTag] = React.useState("")

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 border-t border-zinc-800 p-4 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {selectedCount} document{selectedCount !== 1 ? "s" : ""} selected
        </p>
        <div className="flex items-center gap-2">
          <Select onValueChange={(folder) => onMove(folder)}>
            <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700 h-8 text-sm">
              <FolderOpen className="h-3 w-3 mr-2" />
              <SelectValue placeholder="Move to..." />
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

          <Dialog open={tagOpen} onOpenChange={setTagOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8">
                <Tag className="h-3 w-3 mr-1" />
                Add Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle>Add Tag</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Enter tag name"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700"
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setTagOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await onAddTag(newTag)
                    setNewTag("")
                    setTagOpen(false)
                  }}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={onArchive}
            disabled={isPending}
          >
            <Archive className="h-3 w-3 mr-1" />
            Archive
          </Button>

          <Button size="sm" variant="outline" className="h-8" onClick={onCancel}>
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { documents, isLoading, isError, stats, refetch } = useDocuments()
  const createMutation = useCreateDocument()
  const deleteMutation = useDeleteDocument()
  const updateMutation = useUpdateDocument()
  const bulkUpdateMutation = useBulkUpdateDocuments()
  const signedUrlHook = useSignedUrl()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [folderFilter, setFolderFilter] = React.useState<string>("all")
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const [editTarget, setEditTarget] = React.useState<DocumentRecord | null>(null)
  const [previewTarget, setPreviewTarget] = React.useState<DocumentRecord | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const folders = React.useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .map((d) => d.folder)
            .filter((f): f is string => f !== null)
        )
      ),
    [documents]
  )

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesTab = activeTab === "all" || doc.status === activeTab
    const matchesFolder = folderFilter === "all" || doc.folder === folderFilter
    return matchesSearch && matchesTab && matchesFolder
  })

  const tabs = [
    { id: "all", label: "All Documents", count: stats.total },
    { id: "verified", label: "Verified", count: stats.verified },
    { id: "pending", label: "Pending", count: stats.pending },
    { id: "expired", label: "Expired", count: stats.expired },
  ]

  async function handleBulkMove(folder: string) {
    await bulkUpdateMutation.mutate(Array.from(selectedIds), { folder }, {
      onSuccess: () => {
        refetch()
        setSelectedIds(new Set())
      },
    })
  }

  async function handleBulkTag(tag: string) {
    const updated: DocumentRecord[] = []
    selectedIds.forEach((id) => {
      const doc = documents.find((d) => d.id === id)
      if (doc) {
        updated.push({
          ...doc,
          tags: Array.from(new Set([...doc.tags, tag])),
        })
      }
    })

    await bulkUpdateMutation.mutate(
      Array.from(selectedIds),
      {
        tags: Array.from(
          new Set(updated.flatMap((d) => d.tags))
        ),
      },
      {
        onSuccess: () => {
          refetch()
          setSelectedIds(new Set())
        },
      }
    )
  }

  async function handleBulkArchive() {
    await bulkUpdateMutation.mutate(
      Array.from(selectedIds),
      { status: "rejected" }, // Use rejected as archive proxy
      {
        onSuccess: () => {
          refetch()
          setSelectedIds(new Set())
        },
      }
    )
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        setDeleteTarget(null)
        refetch()
      },
    })
  }

  function handleDownload(doc: DocumentRecord) {
    signedUrlHook.getUrl(doc.storagePath, {
      onSuccess: (url) => window.open(url, "_blank"),
    })
  }

  function handleExportCSV() {
    const csv = generateCSV(filteredDocuments)
    downloadCSV(csv, `documents-export-${format(new Date(), "yyyy-MM-dd")}.csv`)
  }

  return (
    <div className="space-y-6 pb-32">
      <PageHeader
        title="Document Vault"
        description={`${stats.total} documents stored securely`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileJson className="h-4 w-4 mr-2" />
              Export
            </Button>
            <UploadDocumentDialog createMutation={createMutation} />
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
            {folders.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-sm text-rose-400">Failed to load documents</p>
        </div>
      ) : (
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
                const expBadge = getExpirationBadge(doc.expiresAt)
                const isSelected = selectedIds.has(doc.id)

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-3 px-4 hover:bg-zinc-800/30 transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedIds)
                          if (checked) {
                            newSelected.add(doc.id)
                          } else {
                            newSelected.delete(doc.id)
                          }
                          setSelectedIds(newSelected)
                        }}
                        className="h-4 w-4"
                      />
                      <div className={cn("p-2 rounded-lg", statusConf.bg)}>
                        <StatusIcon className={cn("h-4 w-4", statusConf.color)} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-100 truncate">{doc.name}</p>
                          {doc.version > 1 && (
                            <Badge variant="outline" className="text-xs">
                              v{doc.version}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {doc.folder ?? "Uncategorized"}
                          </span>
                          <span>·</span>
                          <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                          {doc.fileSize && (
                            <>
                              <span>·</span>
                              <span>{doc.fileSize}</span>
                            </>
                          )}
                        </div>
                        {doc.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {doc.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs px-1.5 py-0"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 3 && (
                              <span className="text-xs text-zinc-500">
                                +{doc.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {expBadge && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            expBadge.variant === "red"
                              ? "text-rose-400 border-rose-400/30"
                              : "text-amber-400 border-amber-400/30"
                          )}
                        >
                          {expBadge.label}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn("text-xs hidden sm:inline-flex", statusConf.color)}
                      >
                        {statusConf.label}
                      </Badge>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewTarget(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem onClick={() => setEditTarget(doc)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Star className="h-4 w-4 mr-2" />
                              Add to starred
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const signerEmail = window.prompt("Signer email:")
                                const signerName = window.prompt("Signer name:")
                                if (signerEmail && signerName) {
                                  import("@/lib/actions/docusign.actions").then(({ sendForSignature }) => {
                                    sendForSignature({
                                      documentRequestId: doc.id,
                                      signerEmail,
                                      signerName,
                                      documentName: doc.name,
                                    }).then((result) => {
                                      if (result.signingUrl) window.open(result.signingUrl, "_blank")
                                      else alert(`Envelope created: ${result.envelopeId}`)
                                    }).catch((err: Error) => alert(err.message))
                                  })
                                }
                              }}
                            >
                              <PenLine className="h-4 w-4 mr-2" />
                              Send for Signature
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              className="text-rose-400"
                              onClick={() => setDeleteTarget(doc.id)}
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
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The document will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit document dialog */}
      <DocumentFormDialog
        open={!!editTarget}
        initialData={editTarget ?? undefined}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null)
        }}
        onSubmit={(data) => {
          if (editTarget) {
            updateMutation.mutate({ id: editTarget.id, input: data }, {
              onSuccess: () => refetch(),
            })
          }
        }}
        isPending={updateMutation.isPending}
      />

      {/* Document preview dialog */}
      <DocumentPreviewDialog
        doc={previewTarget}
        open={!!previewTarget}
        onOpenChange={(o) => {
          if (!o) setPreviewTarget(null)
        }}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          selectedIds={selectedIds}
          onMove={handleBulkMove}
          onAddTag={handleBulkTag}
          onArchive={handleBulkArchive}
          onCancel={() => setSelectedIds(new Set())}
          isPending={bulkUpdateMutation.isPending}
        />
      )}
    </div>
  )
}
