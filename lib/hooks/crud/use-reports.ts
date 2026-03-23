"use client"

import { useState, useEffect, useTransition, useMemo, useCallback } from "react"
import {
  getReports,
  createReport,
  updateReport,
  deleteReport,
} from "@/lib/actions/report.actions"
import type { ReportRecord } from "@/lib/types"
import type {
  CreateReportInput,
  UpdateReportInput,
} from "@/lib/validations/report.schema"

export type { ReportRecord }

export function useReports(params?: {
  clientId?: string
  reportType?: string
}) {
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getReports(params)
      setReports(result.items)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.clientId, params?.reportType])

  useEffect(() => { load() }, [load])

  const stats = useMemo(
    () => ({
      total: reports.length,
      draft: reports.filter((r) => r.status === "draft").length,
      published: reports.filter((r) => r.status === "published").length,
      archived: reports.filter((r) => r.status === "archived").length,
    }),
    [reports]
  )

  return {
    reports,
    isLoading,
    isError: !!error,
    error,
    stats,
    refetch: load,
  }
}

export function useCreateReport() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (input: CreateReportInput, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await createReport(input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useUpdateReport() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateReportInput }, options?: { onSuccess?: () => void }) => {
      return new Promise<void>((resolve) => {
        startTransition(async () => {
          await updateReport(id, input)
          options?.onSuccess?.()
          resolve()
        })
      })
    },
    []
  )

  return { mutate, isPending }
}

export function useDeleteReport() {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      startTransition(async () => {
        await deleteReport(id)
        options?.onSuccess?.()
      })
    },
    []
  )

  return { mutate, isPending }
}
