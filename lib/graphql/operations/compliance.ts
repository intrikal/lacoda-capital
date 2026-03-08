/**
 * ============================================================================
 * FILE: /lib/graphql/operations/compliance.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for compliance controls
 *   and evidence. These are the "requests" the browser sends to our GraphQL API.
 *
 * HOW IT WORKS:
 *   Apollo Client uses these tagged template literals (`gql`) to:
 *   1. Parse the GraphQL string at build time
 *   2. Send the operation to POST /api/graphql at runtime
 *   3. Cache the results in the InMemoryCache
 *
 * DATA MODEL:
 *   Two-table design (RULES + PROOF pattern):
 *     ComplianceControl  — the rule or requirement (e.g., "Collect KYC docs")
 *     ComplianceEvidence — proof that a control is satisfied (links control → document)
 *
 *   A control's compliance status is derived from its evidence:
 *     approved, non-expired evidence → compliant
 *     pending evidence → in_progress
 *     no evidence or all expired/rejected → needs attention
 *
 * PATTERN:
 *   Same structure as every other entity in this directory:
 *     1. FRAGMENT       — reusable field list
 *     2. LIST QUERY     — paginated, filterable list of controls
 *     3. SINGLE QUERY   — one control by ID with evidence
 *     4. MUTATIONS      — create, update, delete control; create evidence
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/compliance.ts (resolver)
 *           → Zod validation (lib/validations/compliance.schema.ts)
 *           → Drizzle ORM → PostgreSQL
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-compliance.ts — useQuery / useMutation hooks
 *
 * SERVER HANDLER:
 *   lib/graphql/resolvers/compliance.ts — resolves these operations against the DB
 *
 * RELATED FILES:
 *   lib/graphql/operations/report.ts — same pattern for reports
 *   lib/graphql/operations/task.ts   — same pattern for tasks
 */

import { gql } from "@apollo/client"

/**
 * COMPLIANCE_CONTROL_FIELDS — Fragment containing the standard fields for a
 * compliance control. Includes a summary of evidence for deriving compliance
 * status (approved, pending, rejected, expired) client-side.
 *
 * NOTE: We fetch evidence inline (not lazily) so the list page can compute
 * compliance status without a second round-trip per control.
 *
 * Every field maps 1:1 to a column in the `complianceControls` table.
 * See: app/db/schema/compliance.ts for column definitions.
 *
 * isActive — soft-delete/deactivation flag (true = control is enforced)
 * code     — short unique identifier per org (e.g., "KYC-001", "AML-002")
 * category — grouping label (e.g., "KYC", "AML", "TAX", "REGULATORY")
 * frequency — recurrence (e.g., "once", "annually", "quarterly", "monthly")
 */
export const COMPLIANCE_CONTROL_FIELDS = gql`
  fragment ComplianceControlFields on ComplianceControl {
    id
    orgId
    code
    name
    description
    category
    isActive
    status
    frequency
    requiredDocumentTypes
    metadata
    createdAt
    updatedAt
    evidence {
      id
      status
      validFrom
      validUntil
      reviewNotes
      reviewedAt
      createdAt
    }
  }
`

/**
 * GET_COMPLIANCE_CONTROLS — Paginated list of controls with their evidence.
 *
 * Variables (all optional):
 *   category — filter controls by category (e.g., "KYC")
 *   isActive — filter active (true) or inactive (false) controls
 *   page     — page number (default 1)
 *   limit    — items per page (default 25, max 100)
 *
 * The resolver enforces org-scoping — only controls belonging to the
 * authenticated user's organization are returned.
 *
 * Evidence is fetched alongside each control so the page can compute
 * compliance status (compliant / in_progress / needs_attention) client-side
 * without additional queries.
 *
 * EXAMPLE USAGE:
 *   const { data } = useQuery(GET_COMPLIANCE_CONTROLS, {
 *     variables: { isActive: true, page: 1, limit: 50 }
 *   })
 *   // data.complianceControls.items → ComplianceControl[] (with evidence)
 */
export const GET_COMPLIANCE_CONTROLS = gql`
  ${COMPLIANCE_CONTROL_FIELDS}
  query GetComplianceControls(
    $category: String
    $isActive: Boolean
    $page: Int
    $limit: Int
  ) {
    complianceControls(
      category: $category
      isActive: $isActive
      page: $page
      limit: $limit
    ) {
      items {
        ...ComplianceControlFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_COMPLIANCE_CONTROL — Single compliance control by ID, with full evidence.
 *
 * In addition to ComplianceControlFields (which includes evidence), this query
 * is used for control detail views where you need the full context.
 *
 * The evidence array here includes the same fields as in the list query —
 * status, validity dates, and review notes for the detail panel.
 */
export const GET_COMPLIANCE_CONTROL = gql`
  ${COMPLIANCE_CONTROL_FIELDS}
  query GetComplianceControl($id: ID!) {
    complianceControl(id: $id) {
      ...ComplianceControlFields
    }
  }
`

/**
 * CREATE_COMPLIANCE_CONTROL — Inserts a new compliance control.
 *
 * Requires role: admin (enforced by the resolver).
 *
 * Input fields (see CreateComplianceControlInput in compliance.graphql):
 *   code (required), name (required), plus optional:
 *   description, category, frequency, requiredDocumentTypes, metadata.
 *
 * The resolver auto-sets:
 *   - orgId → from the authenticated session (multi-tenant isolation)
 *   - isActive → defaults to true
 *   - requiredDocumentTypes → defaults to []
 *   - metadata → defaults to {}
 *
 * code is immutable after creation — it serves as the canonical
 * identifier for the control (e.g., "KYC-001") in reports and evidence.
 *
 * After mutation succeeds, Apollo refetches GET_COMPLIANCE_CONTROLS
 * to update the list.
 */
export const CREATE_COMPLIANCE_CONTROL = gql`
  ${COMPLIANCE_CONTROL_FIELDS}
  mutation CreateComplianceControl($input: CreateComplianceControlInput!) {
    createComplianceControl(input: $input) {
      ...ComplianceControlFields
    }
  }
`

/**
 * UPDATE_COMPLIANCE_CONTROL — Modifies an existing compliance control.
 *
 * Requires role: admin.
 *
 * Only provided fields are updated (partial update pattern):
 *   name, description, category, isActive, frequency,
 *   requiredDocumentTypes, metadata.
 *
 * NOTE: code is immutable and cannot be changed after creation.
 *
 * Setting isActive: false is a soft-deactivation (the control is
 * removed from enforcement but its history is preserved).
 *
 * For JSONB fields (metadata), the resolver MERGES new values with
 * existing ones — so you can add new keys without losing existing data.
 */
export const UPDATE_COMPLIANCE_CONTROL = gql`
  ${COMPLIANCE_CONTROL_FIELDS}
  mutation UpdateComplianceControl($id: ID!, $input: UpdateComplianceControlInput!) {
    updateComplianceControl(id: $id, input: $input) {
      ...ComplianceControlFields
    }
  }
`

/**
 * DELETE_COMPLIANCE_CONTROL — Hard-deletes a compliance control.
 *
 * Requires role: admin only.
 * Returns Boolean (true on success).
 *
 * IMPORTANT: This cascades to delete all associated ComplianceEvidence
 * records (configured via ON DELETE CASCADE in the database schema).
 * Use with caution — evidence deletion cannot be undone.
 */
export const DELETE_COMPLIANCE_CONTROL = gql`
  mutation DeleteComplianceControl($id: ID!) {
    deleteComplianceControl(id: $id)
  }
`

/**
 * CREATE_COMPLIANCE_EVIDENCE — Links a document as proof for a control.
 *
 * Requires role: admin | assistant.
 *
 * This is the core action for satisfying a compliance control:
 *   1. User uploads a document (via Document Vault)
 *   2. User creates evidence linking that document to this control
 *   3. An admin reviews the evidence and sets status → approved | rejected
 *   4. If validUntil is set, the evidence auto-expires after that date
 *
 * Input fields:
 *   controlId  — which compliance control this satisfies
 *   documentId — the document serving as proof
 *   clientId   — which client this evidence is for
 *   status     — initial status (defaults to "pending")
 *   validFrom  — when the evidence becomes valid (optional)
 *   validUntil — when the evidence expires (optional)
 *   reviewNotes — any notes from the reviewer
 *
 * After mutation, refetches GET_COMPLIANCE_CONTROLS so evidence counts update.
 */
export const CREATE_COMPLIANCE_EVIDENCE = gql`
  mutation CreateComplianceEvidence($input: CreateComplianceEvidenceInput!) {
    createComplianceEvidence(input: $input) {
      id
      controlId
      documentId
      clientId
      status
      validFrom
      validUntil
      reviewNotes
      reviewedAt
      createdAt
    }
  }
`
