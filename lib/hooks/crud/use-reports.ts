"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getReports } from "@/lib/services/reports.service"
import type { Report } from "@/lib/mock/types"

function generateId(): string {
  return `rpt-${crypto.randomUUID().slice(0, 8)}`
}

export type CreateReportInput = Omit<Report, "id" | "generatedAt" | "status" | "downloadUrl">

export function useReports() {
  const { data, isLoading, add, update, remove, getById } = useCrudState<Report>(getReports)

  const addReport = useCallback(
    (input: CreateReportInput): Report => {
      const newReport: Report = {
        ...input,
        id: generateId(),
        generatedAt: new Date().toISOString(),
        status: "generating",
      }
      add(newReport)
      // Simulate generation completing after a short delay
      setTimeout(() => {
        update(newReport.id, { status: "ready", downloadUrl: "#" })
      }, 2000)
      return newReport
    },
    [add, update]
  )

  const stats = useMemo(() => ({
    total: data.length,
    ready: data.filter((r) => r.status === "ready").length,
    generating: data.filter((r) => r.status === "generating").length,
  }), [data])

  return {
    reports: data,
    isLoading,
    addReport,
    updateReport: update,
    deleteReport: remove,
    getReportById: getById,
    stats,
  }
}
