"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/actions/document.actions"
import type { DocumentRecord } from "@/lib/types"
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
} from "@/lib/validations/document.schema"

export type { DocumentRecord }

export function useDocuments(params?: {
  clientId?: string
  entityId?: string
  assetId?: string
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getDocuments(params)
      setDocuments(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.entityId, params?.assetId])

  useEffect(() => { load() }, [load])

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
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateDocument() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateDocumentInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createDocument(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateDocument() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateDocumentInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateDocument(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteDocument() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteDocument(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
