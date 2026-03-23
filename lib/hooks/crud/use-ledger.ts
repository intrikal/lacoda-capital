"use client"

import { useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getLedgerEntries } from "@/lib/services/ledger.service"
import type { LedgerEntry } from "@/lib/types/mock"

export function useLedger() {
  const { data, isLoading, getById } = useCrudState<LedgerEntry>(getLedgerEntries)

  const stats = useMemo(() => ({
    total: data.length,
    sensitive: data.filter((e) => e.isSensitive).length,
  }), [data])

  return {
    entries: data,
    isLoading,
    getEntryById: getById,
    stats,
  }
}
