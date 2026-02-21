"use client"

import { useCallback, useMemo } from "react"
import { useCrudState } from "./use-crud-state"
import { getComplianceControls } from "@/lib/services/compliance.service"
import type { ComplianceControl, ComplianceStatus } from "@/lib/mock/types"

export function useCompliance() {
  const { data, isLoading, update, getById } = useCrudState<ComplianceControl>(getComplianceControls)

  const updateControlStatus = useCallback(
    (id: string, status: ComplianceStatus) => {
      update(id, { status, lastChecked: new Date().toISOString().split("T")[0] })
    },
    [update]
  )

  const stats = useMemo(() => {
    const passing = data.filter((c) => c.status === "compliant").length
    return {
      total: data.length,
      compliant: passing,
      nonCompliant: data.filter((c) => c.status === "non_compliant").length,
      inProgress: data.filter((c) => c.status === "in_progress").length,
      notStarted: data.filter((c) => c.status === "not_started").length,
      score: data.length > 0 ? Math.round((passing / data.length) * 100) : 0,
    }
  }, [data])

  return {
    controls: data,
    isLoading,
    updateControlStatus,
    getControlById: getById,
    stats,
  }
}
