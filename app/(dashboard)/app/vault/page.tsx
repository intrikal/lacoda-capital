/**
 * ============================================================================
 * FILE: /app/(dashboard)/app/vault/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   The Document Vault page for the admin dashboard at /app/vault.
 *   Displays a filterable, searchable list of documents stored in the database.
 *   Supports uploading files (via Supabase Storage), editing metadata, and
 *   deleting documents — all backed by real GraphQL mutations.
 *
 * DATA SOURCE:
 *   Real — Apollo Client → GraphQL API → PostgreSQL via Drizzle ORM.
 *   Previously used mock data (useCrudState + mockDocuments), now fully wired.
 *
 * COMPONENTS IN THIS FILE:
 *   1. UploadDocumentDialog — File upload dialog with Supabase Storage integration
 *   2. VaultPage (default export) — Main page with stats, tabs, search, list
 *
 * CRUD OPERATIONS:
 *   Create  → UploadDocumentDialog: file → Supabase Storage, metadata → GraphQL
 *   Read    → useDocuments() hook fetches from GET_DOCUMENTS query
 *   Update  → DocumentFormDialog (imported) → useUpdateDocument mutation
 *   Delete  → AlertDialog confirmation → useDeleteDocument mutation
 *
 * FILE UPLOAD FLOW:
 *   1. User selects a file via <input type="file">
 *   2. File uploaded to Supabase Storage bucket "documents"
 *   3. Storage returns the file path
 *   4. GraphQL createDocument mutation stores metadata + path in PostgreSQL
 *   5. GET_DOCUMENTS refetched → new document appears in list
 *
 * RELATED FILES:
 *   lib/hooks/crud/use-documents.ts            — Apollo hooks + DocumentRecord type
 *   components/forms/document-form-dialog.tsx   — Edit metadata dialog
 *   lib/graphql/operations/document.ts          — GraphQL queries/mutations
 *   lib/graphql/resolvers/document.ts           — Server-side resolver
 *   utils/supabase/client.ts                    — Supabase browser client
 */

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
  Star,
  Trash2,
  FolderOpen,
  Pencil,
  Loader2,
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
import { cn } from "@/lib/utils"
import { ContentCard, StatCard, PageHeader, Tabs } from "@/components/dashboard/content-card"
import type { LucideIcon } from "lucide-react"
import {
  useDocuments,
  useCreateDocument,
  useDeleteDocument,
  useUpdateDocument,
  type DocumentRecord,
} from "@/lib/hooks/crud/use-documents"
import { DocumentFormDialog } from "@/components/forms/document-form-dialog"
import { createClient } from "@/utils/supabase/client"

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
// Maps each document status to its display label, text color, and background.
// Previously imported from lib/mock/data; now defined locally since this page
// is the only consumer and the DB enum doesn't include "missing" (old mock status).

type DocumentStatus = "pending" | "verified" | "expired" | "rejected"

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

// ─── UPLOAD DIALOG ────────────────────────────────────────────────────────────
/**
 * UploadDocumentDialog — Modal for uploading a new document.
 *
 * Integrates with Supabase Storage for real file uploads:
 *   1. User picks a file via <input type="file"> (hidden, triggered by label click)
 *   2. User fills in name, folder, tags
 *   3. On submit: file → Supabase Storage, then metadata → GraphQL createDocument
 *
 * @param createMutation — The useCreateDocument() hook instance, passed from the
 *   parent so the dialog can call the GraphQL mutation after the file upload.
 */
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

  async function handleSubmit() {
    if (!file || !docName.trim()) return
    setIsUploading(true)
    setUploadError(null)

    try {
      const supabase = createClient()
      const filePath = `documents/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: false })

      if (error) throw error

      await createMutation.mutate({
        name: docName.trim(),
        folder: folder || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        storagePath: data.path,
        mimeType: file.type || null,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        status: "pending",
      })

      setDocName("")
      setTags("")
      setFile(null)
      setOpen(false)
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
    }
    setOpen(next)
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
          <DialogDescription>
            Add a new document to your secure vault
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <label
            htmlFor="file-upload"
            className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-zinc-600 transition-colors cursor-pointer block"
          >
            <Upload className="h-8 w-8 mx-auto text-zinc-500 mb-4" />
            {file ? (
              <p className="text-sm text-zinc-200">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-zinc-400">
                  Drag and drop files here, or{" "}
                  <span className="text-tiffany-500">browse</span>
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  PDF, DOC, XLS, JPG up to 50MB
                </p>
              </>
            )}
            <input
              id="file-upload"
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {uploadError && (
            <p className="text-xs text-rose-400">{uploadError}</p>
          )}
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type TabId = "all" | "verified" | "pending" | "expired"

export default function VaultPage() {
  const { documents, isLoading, isError, stats } = useDocuments()
  const createMutation = useCreateDocument()
  const deleteMutation = useDeleteDocument()
  const updateMutation = useUpdateDocument()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const [folderFilter, setFolderFilter] = React.useState<string>("all")
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const [editTarget, setEditTarget] = React.useState<DocumentRecord | null>(null)

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
    const matchesFolder =
      folderFilter === "all" || doc.folder === folderFilter
    return matchesSearch && matchesTab && matchesFolder
  })

  const tabs = [
    { id: "all", label: "All Documents", count: stats.total },
    { id: "verified", label: "Verified", count: stats.verified },
    { id: "pending", label: "Pending", count: stats.pending },
    { id: "expired", label: "Expired", count: stats.expired },
  ]

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
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
              <p className="text-xs text-zinc-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredDocuments.map((doc) => {
                const statusConf = documentStatusConfig[doc.status]
                const StatusIcon = statusIcons[doc.status]
                const isExpired =
                  doc.expiresAt && new Date(doc.expiresAt) < new Date()

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-3 px-4 hover:bg-zinc-800/30 transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn("p-2 rounded-lg", statusConf.bg)}>
                        <StatusIcon
                          className={cn("h-4 w-4", statusConf.color)}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {doc.folder ?? "Uncategorized"}
                          </span>
                          <span>·</span>
                          <span>
                            {format(new Date(doc.createdAt), "MMM d, yyyy")}
                          </span>
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
                      {isExpired && (
                        <Badge
                          variant="outline"
                          className="text-rose-400 border-rose-400/30"
                        >
                          Expired
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs hidden sm:inline-flex",
                          statusConf.color
                        )}
                      >
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-zinc-900 border-zinc-800"
                          >
                            <DropdownMenuItem
                              onClick={() => setEditTarget(doc)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
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
              This action cannot be undone. The document will be permanently
              removed.
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
            updateMutation.mutate({ id: editTarget.id, input: data })
          }
        }}
        isPending={updateMutation.isPending}
      />
    </div>
  )
}
