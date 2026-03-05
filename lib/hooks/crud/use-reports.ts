/**
 * ============================================================================
 * FILE: /lib/hooks/crud/use-reports.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Reports page UI to the GraphQL API.
 *   Each hook wraps an Apollo Client operation and exposes a simple interface
 *   that page components consume.
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ Reports Page (app/(dashboard)/app/reports/page.tsx)             │
 *   │   └── useReports()       → fetches list + computes stats       │
 *   │   └── useCreateReport()  → creates new report record           │
 *   │   └── useUpdateReport()  → edits report metadata/status        │
 *   │   └── useDeleteReport()  → removes a report                    │
 *   │         ↓                                                       │
 *   │ Apollo Client (useQuery / useMutation)                          │
 *   │         ↓                                                       │
 *   │ POST /api/graphql                                               │
 *   │         ↓                                                       │
 *   │ report resolvers → Drizzle ORM → PostgreSQL                     │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * PATTERN:
 *   Mirrors the structure of use-documents.ts exactly:
 *     - One READ hook (useReports) that returns { data, loading, stats }
 *     - Three MUTATION hooks that return { mutate, isPending }
 *     - All mutations use refetchQueries to keep the list in sync
 *
 * PREVIOUS IMPLEMENTATION:
 *   This file originally used useCrudState + mock data (in-memory only).
 *   It was rewritten to use Apollo Client for real database persistence.
 *
 * DB SCHEMA:
 *   The reports table tracks report metadata (name, type, status).
 *   The reportVersions table tracks revision history for each report.
 *   See: app/db/schema/reports.ts
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/reports/page.tsx (advisor reports dashboard)
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_REPORTS,
  CREATE_REPORT,
  UPDATE_REPORT,
  DELETE_REPORT,
} from "@/lib/graphql/operations/report"
import type {
  CreateReportInput,
  UpdateReportInput,
} from "@/lib/validations/report.schema"

/**
 * ReportRecord — TypeScript interface for the shape of a report returned
 * by the GraphQL API. Maps 1:1 to the REPORT_FIELDS fragment.
 *
 * Exported so page components can use this type for state variables
 * (e.g., `const [editTarget, setEditTarget] = useState<ReportRecord | null>(null)`).
 *
 * Field notes:
 *   reportType          — The kind of report: portfolio_summary, asset_allocation,
 *                          performance, tax_summary, compliance, client_statement, custom
 *   status              — Lifecycle: draft → published → archived
 *   parameters          — JSONB object storing report config (date ranges, sections, etc.)
 *   currentVersionId    — Points to the latest ReportVersion (null if no versions yet)
 *   currentVersionNumber — Integer tracking how many times the report has been generated
 *   createdBy           — UUID of the user who created the report
 */
export interface ReportRecord {
  id: string
  orgId: string
  clientId: string | null
  name: string
  description: string | null
  reportType:
    | "portfolio_summary"
    | "asset_allocation"
    | "performance"
    | "tax_summary"
    | "compliance"
    | "client_statement"
    | "custom"
  status: "draft" | "published" | "archived"
  parameters: Record<string, unknown> | null
  currentVersionId: string | null
  currentVersionNumber: number | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Shape of the raw Apollo useQuery response for GET_REPORTS. */
interface GetReportsData {
  reports: {
    items: ReportRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

/**
 * useReports — Fetches the list of reports and computes status counts.
 *
 * @param params — Optional filters passed to the GraphQL query.
 *   clientId   — Only reports linked to this client
 *   reportType — Only reports of this type (e.g., "portfolio_summary")
 *
 * @returns
 *   reports   — Array of ReportRecord (empty while loading)
 *   isLoading — True during the initial fetch
 *   isError   — True if the query failed
 *   error     — The ApolloError object (null if no error)
 *   stats     — { total, draft, published, archived } counts
 *
 * Cache behavior:
 *   Uses Apollo's default fetch policy (set in apollo-provider.tsx).
 *   Mutations trigger refetchQueries to keep data fresh.
 */
export function useReports(params?: {
  clientId?: string
  reportType?: string
}) {
  const variables: Record<string, unknown> = {}
  if (params?.clientId) variables.clientId = params.clientId
  if (params?.reportType) variables.reportType = params.reportType

  const { data, loading, error } = useQuery<GetReportsData>(GET_REPORTS, {
    variables,
  })

  const reports = data?.reports?.items ?? []

  // Compute aggregate stats from the fetched list.
  // useMemo ensures this only recalculates when the reports array changes.
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
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/**
 * useCreateReport — Mutation hook for creating a new report.
 *
 * Usage:
 *   const createMutation = useCreateReport()
 *   await createMutation.mutate({ name: "Q1 Summary", reportType: "portfolio_summary" })
 *
 * After the mutation succeeds, Apollo automatically re-runs GET_REPORTS
 * (via refetchQueries) so the reports list updates without a page refresh.
 *
 * The resolver auto-sets orgId and createdBy from the session, and
 * defaults status to "draft". See lib/graphql/resolvers/report.ts.
 */
export function useCreateReport() {
  const [createReport, { loading }] = useMutation(CREATE_REPORT, {
    refetchQueries: [{ query: GET_REPORTS }],
  })

  const mutate = useCallback(
    (input: CreateReportInput) => {
      return createReport({ variables: { input } })
    },
    [createReport]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateReport — Mutation hook for editing report metadata.
 *
 * Usage:
 *   const updateMutation = useUpdateReport()
 *   updateMutation.mutate({ id: "report-uuid", input: { status: "published" } })
 *
 * Only the fields included in `input` are updated (partial update).
 * reportType, clientId, and orgId cannot be changed after creation.
 *
 * For JSONB fields (parameters), the resolver MERGES new values with
 * existing ones — so you can add a new parameter key without losing
 * existing ones.
 */
export function useUpdateReport() {
  const [updateReport, { loading }] = useMutation(UPDATE_REPORT, {
    refetchQueries: [{ query: GET_REPORTS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateReportInput }) => {
      return updateReport({ variables: { id, input } })
    },
    [updateReport]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteReport — Mutation hook for removing a report.
 *
 * Usage:
 *   const deleteMutation = useDeleteReport()
 *   deleteMutation.mutate(reportId, { onSuccess: () => closeDialog() })
 *
 * Requires admin role (enforced server-side by the resolver).
 *
 * The optional onSuccess callback is called after the mutation promise
 * resolves — used to close the delete confirmation AlertDialog.
 *
 * CASCADING: Deleting a report also deletes all its ReportVersions
 * (configured via ON DELETE CASCADE in the database schema).
 */
export function useDeleteReport() {
  const [deleteReport, { loading }] = useMutation(DELETE_REPORT, {
    refetchQueries: [{ query: GET_REPORTS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteReport({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteReport]
  )

  return { mutate, isPending: loading }
}
