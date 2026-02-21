"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getDocuments } from "@/lib/services/documents.service"
import type { Document } from "@/lib/mock/types"

function generateId(): string {
  return `doc-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateDocumentInput = Omit<Document, "id">

export function useDocuments() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<Document>(getDocuments)

  const addDocument = useCallback(
    (input: CreateDocumentInput): Document => {
      const newDoc: Document = {
        ...input,
        id: generateId(),
      }
      add(newDoc)
      return newDoc
    },
    [add]
  )

  const stats = useMemo(() => ({
    total: data.length,
    verified: data.filter((d) => d.status === "verified").length,
    pending: data.filter((d) => d.status === "pending").length,
    expired: data.filter((d) => d.status === "expired").length,
    missing: data.filter((d) => d.status === "missing").length,
  }), [data])

  return {
    documents: data,
    isLoading,
    addDocument,
    updateDocument: update,
    deleteDocument: remove,
    getDocumentById: getById,
    stats,
  }
}
