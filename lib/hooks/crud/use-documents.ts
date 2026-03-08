/**
 * ============================================================================
 * FILE: /lib/hooks/crud/use-documents.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Document Vault UI to the GraphQL API.
 *   Each hook wraps an Apollo Client operation and exposes a simple interface
 *   that page components consume.
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ Vault Page (app/(dashboard)/app/vault/page.tsx)            │
 *   │   └── useDocuments()       → fetches list + computes stats │
 *   │   └── useCreateDocument()  → uploads new document          │
 *   │   └── useUpdateDocument()  → edits document metadata       │
 *   │   └── useDeleteDocument()  → removes a document            │
 *   │         ↓                                                   │
 *   │ Apollo Client (useQuery / useMutation)                      │
 *   │         ↓                                                   │
 *   │ POST /api/graphql                                           │
 *   │         ↓                                                   │
 *   │ document resolvers → Drizzle ORM → PostgreSQL               │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * PATTERN:
 *   Mirrors the structure of use-clients.ts and use-entities.ts exactly:
 *     - One READ hook (useDocuments) that returns { data, loading, stats }
 *     - Three MUTATION hooks that return { mutate, isPending }
 *     - All mutations use refetchQueries to keep the list in sync
 *
 * PREVIOUS IMPLEMENTATION:
 *   This file originally used useCrudState + mockDocuments (in-memory only).
 *   It was rewritten to use Apollo Client for real database persistence.
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/vault/page.tsx       (admin vault)
 *   - app/(client)/client/documents/page.tsx   (client portal)
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_DOCUMENTS,
  CREATE_DOCUMENT,
  UPDATE_DOCUMENT,
  DELETE_DOCUMENT,
} from "@/lib/graphql/operations/document"
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
} from "@/lib/validations/document.schema"

/**
 * DocumentRecord — TypeScript interface for the shape of a document returned
 * by the GraphQL API. Maps 1:1 to the DOCUMENT_FIELDS fragment.
 *
 * Exported so page components can use this type for state variables
 * (e.g., `const [editTarget, setEditTarget] = useState<DocumentRecord | null>(null)`).
 *
 * Field notes:
 *   storagePath — The Supabase Storage path (e.g., "documents/1709312400-passport.pdf")
 *   folder      — UI folder for grouping (e.g., "Real Estate", "Tax"); nullable
 *   status      — One of: pending → verified → expired, or pending → rejected
 *   tags        — JSONB array stored in the DB, coerced to string[] by the resolver
 *   fileSize    — Human-readable string (e.g., "2.40 MB"), NOT a number
 */
export interface DocumentRecord {
  id: string
  orgId: string
  clientId: string | null
  entityId: string | null
  assetId: string | null
  name: string
  description: string | null
  mimeType: string | null
  fileSize: string | null
  storagePath: string
  folder: string | null
  status: "pending" | "verified" | "expired" | "rejected"
  expiresAt: string | null
  verifiedAt: string | null
  verifiedBy: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** Shape of the raw Apollo useQuery response for GET_DOCUMENTS. */
interface GetDocumentsData {
  documents: {
    items: DocumentRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

/**
 * useDocuments — Fetches the list of documents and computes status counts.
 *
 * @param params — Optional filters passed to the GraphQL query.
 *   clientId — Only documents linked to this client
 *   entityId — Only documents linked to this entity
 *   assetId  — Only documents linked to this asset
 *
 * @returns
 *   documents — Array of DocumentRecord (empty while loading)
 *   isLoading — True during the initial fetch
 *   isError   — True if the query failed
 *   error     — The ApolloError object (null if no error)
 *   stats     — { total, verified, pending, expired, rejected } counts
 *
 * Cache behavior:
 *   Uses Apollo's "cache-and-network" policy (set in apollo-provider.tsx).
 *   This means: show cached data immediately, then re-fetch in the background.
 *   The `documents` typePolicies entry uses `merge: false` so refetches replace
 *   the entire list (no stale array merging).
 */
export function useDocuments(params?: {
  clientId?: string
  entityId?: string
  assetId?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.entityId) variables.entityId = params.entityId
  if (params?.assetId) variables.assetId = params.assetId

  const { data, loading, error } = useQuery<GetDocumentsData>(GET_DOCUMENTS, {
    variables,
  })

  const documents = data?.documents?.items ?? []

  // Compute aggregate stats from the fetched list.
  // useMemo ensures this only recalculates when the documents array changes.
  const stats = useMemo(
    () => ({
      total: documents.length,
      verified: documents.filter((d) => d.status === "verified").length,
      pending: documents.filter((d) => d.status === "pending").length,
      expired: documents.filter((d) => d.status === "expired").length,
      rejected: documents.filter((d) => d.status === "rejected").length,
    }),
    [documents]
  )

  return {
    documents,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/**
 * useCreateDocument — Mutation hook for uploading a new document.
 *
 * Usage:
 *   const createMutation = useCreateDocument()
 *   await createMutation.mutate({ name, storagePath, folder, ... })
 *
 * After the mutation succeeds, Apollo automatically re-runs GET_DOCUMENTS
 * (via refetchQueries) so the Vault list updates without a page refresh.
 *
 * The mutate function returns the Apollo MutationResult promise, which is
 * awaited in the upload dialog to sequence: upload file → create record → close.
 */
export function useCreateDocument() {
  const [createDocument, { loading }] = useMutation(CREATE_DOCUMENT, {
    refetchQueries: [{ query: GET_DOCUMENTS }],
  })

  const mutate = useCallback(
    (input: CreateDocumentInput) => {
      return createDocument({ variables: { input } })
    },
    [createDocument]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateDocument — Mutation hook for editing document metadata.
 *
 * Usage:
 *   const updateMutation = useUpdateDocument()
 *   updateMutation.mutate({ id: "doc-uuid", input: { name: "New Name" } })
 *
 * Only the fields included in `input` are updated (partial update).
 * storagePath, clientId, entityId, assetId cannot be changed after creation.
 */
export function useUpdateDocument() {
  const [updateDocument, { loading }] = useMutation(UPDATE_DOCUMENT, {
    refetchQueries: [{ query: GET_DOCUMENTS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateDocumentInput }) => {
      return updateDocument({ variables: { id, input } })
    },
    [updateDocument]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteDocument — Mutation hook for removing a document.
 *
 * Usage:
 *   const deleteMutation = useDeleteDocument()
 *   deleteMutation.mutate(docId, { onSuccess: () => closeDialog() })
 *
 * Requires admin role (enforced server-side).
 *
 * The optional onSuccess callback is called after the mutation promise
 * resolves — used to close the delete confirmation AlertDialog.
 *
 * NOTE: This deletes the database record only. The actual file in Supabase
 * Storage is NOT deleted. Implement a cleanup job or edge function if
 * orphaned files become a concern.
 */
export function useDeleteDocument() {
  const [deleteDocument, { loading }] = useMutation(DELETE_DOCUMENT, {
    refetchQueries: [{ query: GET_DOCUMENTS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteDocument({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteDocument]
  )

  return { mutate, isPending: loading }
}
