/**
 * ============================================================================
 * FILE: /components/forms/document-form-dialog.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   A modal dialog for editing document metadata (name, description, folder,
 *   status, tags, expiry date). This is the "Edit" form — it does NOT handle
 *   file uploads (that's in the UploadDocumentDialog on the Vault page).
 *
 * PATTERN:
 *   Follows the same architecture as client-form-dialog.tsx:
 *     - TanStack Form for state management + validation
 *     - Zod schema (updateDocumentSchema) for field validation
 *     - Radix Dialog (via shadcn/ui) for the modal container
 *     - FieldError helper for inline validation messages
 *
 * DATA FLOW:
 *   User clicks "Edit" → page sets editTarget → dialog opens with pre-filled
 *   data → user modifies fields → "Save Changes" → updateDocumentSchema
 *   validates → onSubmit(parsedData) → parent calls updateMutation → DB updated
 *   → GET_DOCUMENTS refetched → list updates.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/vault/page.tsx
 *
 * RELATED FILES:
 *   - components/forms/client-form-dialog.tsx   — same pattern for clients
 *   - lib/validations/document.schema.ts        — Zod validation schemas
 *   - lib/hooks/crud/use-documents.ts           — DocumentRecord type
 */

"use client"

import { useForm } from "@tanstack/react-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateDocumentSchema } from "@/lib/validations/document.schema"
import type { UpdateDocumentInput } from "@/lib/validations/document.schema"
import type { DocumentRecord } from "@/lib/hooks/crud/use-documents"

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface DocumentFormDialogProps {
  /** Existing document data to pre-fill form fields. */
  initialData?: Partial<DocumentRecord>

  /** Controls dialog visibility. */
  open: boolean

  /** Callback to open/close the dialog. Called with `false` to close. */
  onOpenChange: (open: boolean) => void

  /** Callback when the form is submitted with validated data. */
  onSubmit: (data: UpdateDocumentInput) => void

  /** Shows a loading state on the submit button while the mutation runs. */
  isPending?: boolean
}

// ─── FIELD ERROR HELPER ───────────────────────────────────────────────────────

/** Renders the first validation error below a form field. Null if no errors. */
function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <p className="text-xs text-rose-400 mt-1">{errors[0]}</p>
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function DocumentFormDialog({
  initialData,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: DocumentFormDialogProps) {
  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      folder: initialData?.folder ?? "",
      status: (initialData?.status ?? "pending") as "pending" | "verified" | "expired" | "rejected",
      tags: initialData?.tags?.join(", ") ?? "",
      expiresAt: initialData?.expiresAt?.split("T")[0] ?? "",
    },
    onSubmit: async ({ value }) => {
      const parsed = updateDocumentSchema.safeParse({
        name: value.name || undefined,
        description: value.description || null,
        folder: value.folder || null,
        status: value.status || undefined,
        tags: value.tags
          ? value.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        expiresAt: value.expiresAt || null,
      })
      if (!parsed.success) return
      onSubmit(parsed.data)
      onOpenChange(false)
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = updateDocumentSchema.safeParse({ name: value.name })
        return result.success ? undefined : "Please fix the errors above"
      },
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>Update document metadata.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4 py-4"
        >
          <form.Field
            name="name"
            validators={{
              onBlur: ({ value }) => {
                if (!value) return "Name is required"
                return undefined
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="doc-name">Document Name *</Label>
                <Input
                  id="doc-name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="bg-zinc-800/50 border-zinc-700"
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError
                  errors={field.state.meta.errors.filter(Boolean) as string[]}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="doc-description">Description</Label>
                <Input
                  id="doc-description"
                  placeholder="Brief description of this document"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="folder">
              {(field) => (
                <div className="space-y-1">
                  <Label>Folder</Label>
                  <Select
                    value={field.state.value ?? ""}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Document folder"
                    >
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
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) =>
                      field.handleChange(
                        v as "pending" | "verified" | "expired" | "rejected"
                      )
                    }
                  >
                    <SelectTrigger
                      className="bg-zinc-800/50 border-zinc-700"
                      aria-label="Document status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="tags">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="doc-tags">Tags</Label>
                <Input
                  id="doc-tags"
                  placeholder="Comma-separated: deed, legal, 2024"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="expiresAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="doc-expires">Expiry Date</Label>
                <Input
                  id="doc-expires"
                  type="date"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
