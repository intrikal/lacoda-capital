/**
 * ============================================================================
 * FILE: /lib/hooks/crud/use-compliance.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Compliance page UI to the GraphQL API.
 *   Each hook wraps an Apollo Client operation and exposes a simple interface
 *   that page components consume.
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ Compliance Page (app/(dashboard)/app/compliance/page.tsx)       │
 *   │   └── useComplianceControls() → fetches controls + stats        │
 *   │   └── useCreateComplianceControl() → creates new control        │
 *   │   └── useUpdateComplianceControl() → edits control metadata     │
 *   │   └── useDeleteComplianceControl() → removes a control          │
 *   │         ↓                                                       │
 *   │ Apollo Client (useQuery / useMutation)                          │
 *   │         ↓                                                       │
 *   │ POST /api/graphql                                               │
 *   │         ↓                                                       │
 *   │ compliance resolvers → Drizzle ORM → PostgreSQL                 │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * DATA MODEL (RULES + PROOF PATTERN):
 *   ComplianceControl  — the requirement (e.g., "Collect passport for KYC")
 *   ComplianceEvidence — proof linking a document to a control
 *
 *   A control's compliance status is DERIVED from its evidence array:
 *     approved, non-expired evidence → "compliant"
 *     pending evidence only          → "in_progress"
 *     no evidence or all rejected/expired → "needs_attention"
 *
 *   The DB uses isActive (boolean) for soft-deactivation of controls,
 *   NOT a status enum. Status is a computed property, not a stored value.
 *
 * PREVIOUS IMPLEMENTATION:
 *   This file originally used useCrudState + mock data with a fake status
 *   enum (compliant/non_compliant/in_progress/not_started). That model
 *   doesn't match the DB schema. It has been rewritten to use Apollo Client
 *   for real database persistence with the actual schema.
 *
 * DB SCHEMA:
 *   See: app/db/schema/compliance.ts
 *   complianceControls: id, orgId, code, name, description, category,
 *     isActive, frequency, requiredDocumentTypes, metadata, createdAt, updatedAt
 *   complianceEvidence: id, controlId, documentId, clientId, status,
 *     validFrom, validUntil, reviewedBy, reviewedAt, reviewNotes, createdAt, updatedAt
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/compliance/page.tsx (advisor compliance dashboard)
 */

"use client"

import { useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_COMPLIANCE_CONTROLS,
  CREATE_COMPLIANCE_CONTROL,
  UPDATE_COMPLIANCE_CONTROL,
  DELETE_COMPLIANCE_CONTROL,
} from "@/lib/graphql/operations/compliance"
import type {
  CreateComplianceControlInput,
  UpdateComplianceControlInput,
} from "@/lib/validations/compliance.schema"

// ─── TYPES ────────────────────────────────────────────────────────────────────

/**
 * ComplianceEvidenceRecord — Evidence linking a document to a compliance control.
 *
 * status lifecycle:
 *   pending → approved | rejected
 *   approved → [time passes] → expired (when validUntil is exceeded)
 *
 * A control is "compliant" if at least one evidence record is:
 *   - status === "approved"
 *   - AND (validUntil is null OR validUntil > now)
 */
export interface ComplianceEvidenceRecord {
  id: string
  status: "pending" | "approved" | "rejected" | "expired"
  validFrom: string | null
  validUntil: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
}

/**
 * ComplianceControlRecord — TypeScript interface for the shape of a compliance
 * control returned by the GraphQL API. Maps 1:1 to the COMPLIANCE_CONTROL_FIELDS
 * fragment (which includes evidence inline).
 *
 * Field notes:
 *   isActive  — soft-deactivation; false = control is no longer enforced
 *   code      — immutable after creation (e.g., "KYC-001", "AML-002")
 *   category  — grouping label (e.g., "KYC", "AML", "TAX", "REGULATORY")
 *   frequency — recurrence cadence (e.g., "once", "annually", "quarterly")
 *   evidence  — all evidence records for this control (fetched inline)
 *
 * NOTE: There is no `status` column in the DB. Compliance status is derived
 * from the `evidence` array by `deriveControlStatus()` in this file.
 */
export interface ComplianceControlRecord {
  id: string
  orgId: string
  code: string
  name: string
  description: string | null
  category: string | null
  isActive: boolean
  status: "needs_attention" | "in_progress" | "compliant"
  frequency: string | null
  requiredDocumentTypes: string[]
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  evidence: ComplianceEvidenceRecord[]
}

/**
 * ControlComplianceStatus — Derived compliance status for a control.
 *
 * This is NOT stored in the DB. It is computed from the control's evidence:
 *   "compliant"       → has ≥1 approved, non-expired evidence
 *   "in_progress"     → has pending evidence, but no approved evidence
 *   "needs_attention" → no evidence, or all evidence is rejected/expired
 */
export type ControlComplianceStatus = "compliant" | "in_progress" | "needs_attention"

/**
 * deriveControlStatus — Computes the compliance status of a control from
 * its evidence records.
 *
 * Logic:
 *   1. If any evidence is approved AND not yet expired → "compliant"
 *   2. Else if any evidence is pending → "in_progress"
 *   3. Otherwise → "needs_attention"
 *
 * @param evidence - The evidence records for the control
 * @returns The derived compliance status
 */
export function deriveControlStatus(evidence: ComplianceEvidenceRecord[]): ControlComplianceStatus {
  const now = new Date()

  const hasApproved = evidence.some(
    (e) =>
      e.status === "approved" &&
      (!e.validUntil || new Date(e.validUntil) > now)
  )
  if (hasApproved) return "compliant"

  const hasPending = evidence.some((e) => e.status === "pending")
  if (hasPending) return "in_progress"

  return "needs_attention"
}

/** Shape of the raw Apollo useQuery response for GET_COMPLIANCE_CONTROLS. */
interface GetComplianceControlsData {
  complianceControls: {
    items: ComplianceControlRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

/**
 * useComplianceControls — Fetches the list of compliance controls and computes
 * aggregate stats. Evidence is fetched inline so compliance status can be
 * derived client-side without additional queries.
 *
 * @param params — Optional filters passed to the GraphQL query.
 *   category — Only controls in this category (e.g., "KYC")
 *   isActive — Only active (true) or inactive (false) controls
 *
 * @returns
 *   controls  — Array of ComplianceControlRecord (empty while loading)
 *   isLoading — True during the initial fetch
 *   isError   — True if the query failed
 *   error     — The ApolloError object (null if no error)
 *   stats     — { total, active, compliant, inProgress, needsAttention, score }
 *
 * stats.score — Compliance percentage: Math.round((compliant / active) * 100)
 *   or 0 if no active controls.
 */
export function useComplianceControls(params?: {
  category?: string
  isActive?: boolean
}) {
  const variables: Record<string, unknown> = {}
  if (params?.category) variables.category = params.category
  if (params?.isActive !== undefined) variables.isActive = params.isActive

  const { data, loading, error } = useQuery<GetComplianceControlsData>(
    GET_COMPLIANCE_CONTROLS,
    { variables }
  )

  const controls = data?.complianceControls?.items ?? []

  // Compute aggregate stats from the stored status column.
  // useMemo ensures this only recalculates when the controls array changes.
  const stats = useMemo(() => {
    const active = controls.filter((c) => c.isActive)
    const compliant = active.filter((c) => c.status === "compliant").length
    const inProgress = active.filter((c) => c.status === "in_progress").length
    const needsAttention = active.filter((c) => c.status === "needs_attention").length

    return {
      total: controls.length,
      active: active.length,
      compliant,
      inProgress,
      needsAttention,
      // Compliance score = percentage of active controls that are compliant.
      score: active.length > 0 ? Math.round((compliant / active.length) * 100) : 0,
    }
  }, [controls])

  return {
    controls,
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
    stats,
  }
}

/**
 * useCreateComplianceControl — Mutation hook for creating a new compliance control.
 *
 * Usage:
 *   const createMutation = useCreateComplianceControl()
 *   await createMutation.mutate({ code: "KYC-001", name: "Passport Collection" })
 *
 * Requires role: admin (enforced server-side by the resolver).
 *
 * The resolver auto-sets:
 *   - orgId     → from the authenticated session
 *   - isActive  → defaults to true
 *   - requiredDocumentTypes → defaults to []
 *   - metadata  → defaults to {}
 *
 * code is immutable after creation — it's the canonical identifier for the
 * control in evidence records and compliance reports.
 */
export function useCreateComplianceControl() {
  const [createControl, { loading }] = useMutation(CREATE_COMPLIANCE_CONTROL, {
    refetchQueries: [{ query: GET_COMPLIANCE_CONTROLS }],
  })

  const mutate = useCallback(
    (input: CreateComplianceControlInput) => {
      return createControl({ variables: { input } })
    },
    [createControl]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateComplianceControl — Mutation hook for editing a compliance control.
 *
 * Usage:
 *   const updateMutation = useUpdateComplianceControl()
 *   updateMutation.mutate({ id: "control-uuid", input: { isActive: false } })
 *
 * Only the provided fields are updated (partial update pattern).
 * code and orgId are immutable and cannot be changed.
 *
 * Setting isActive: false soft-deactivates the control (removes it from
 * enforcement without deleting its evidence history).
 *
 * For JSONB fields (metadata), the resolver MERGES new values with existing
 * ones — so you can add a new metadata key without losing existing ones.
 *
 * Requires role: admin (enforced server-side by the resolver).
 */
export function useUpdateComplianceControl() {
  const [updateControl, { loading }] = useMutation(UPDATE_COMPLIANCE_CONTROL, {
    refetchQueries: [{ query: GET_COMPLIANCE_CONTROLS }],
  })

  const mutate = useCallback(
    ({ id, input }: { id: string; input: UpdateComplianceControlInput }) => {
      return updateControl({ variables: { id, input } })
    },
    [updateControl]
  )

  return { mutate, isPending: loading }
}

/**
 * useDeleteComplianceControl — Mutation hook for removing a compliance control.
 *
 * Usage:
 *   const deleteMutation = useDeleteComplianceControl()
 *   deleteMutation.mutate(controlId, { onSuccess: () => closeDialog() })
 *
 * Requires role: admin only (enforced server-side by the resolver).
 *
 * CASCADING: Deleting a control also deletes all its ComplianceEvidence records
 * (configured via ON DELETE CASCADE in the database schema). This is irreversible.
 *
 * The optional onSuccess callback is called after the mutation promise resolves —
 * used to close the delete confirmation AlertDialog.
 */
export function useDeleteComplianceControl() {
  const [deleteControl, { loading }] = useMutation(DELETE_COMPLIANCE_CONTROL, {
    refetchQueries: [{ query: GET_COMPLIANCE_CONTROLS }],
  })

  const mutate = useCallback(
    (id: string, options?: { onSuccess?: () => void }) => {
      deleteControl({ variables: { id } }).then(() => {
        options?.onSuccess?.()
      })
    },
    [deleteControl]
  )

  return { mutate, isPending: loading }
}
