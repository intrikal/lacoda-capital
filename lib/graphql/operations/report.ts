/**
 * ============================================================================
 * FILE: /lib/graphql/operations/report.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for reports.
 *   These are the "requests" that the browser sends to our GraphQL API.
 *
 * HOW IT WORKS:
 *   Apollo Client uses these tagged template literals (`gql``) to:
 *   1. Parse the GraphQL string at build time
 *   2. Send the operation to POST /api/graphql at runtime
 *   3. Cache the results in the InMemoryCache
 *
 * PATTERN:
 *   Every entity (clients, entities, assets, documents, reports) follows the
 *   same structure in this directory:
 *     1. FRAGMENT       — reusable field list (avoids duplicating fields)
 *     2. LIST QUERY     — paginated, filterable list of records
 *     3. SINGLE QUERY   — one record by ID with relations
 *     4. CREATE MUTATION — insert a new record
 *     5. UPDATE MUTATION — modify an existing record
 *     6. DELETE MUTATION — remove a record (returns Boolean)
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/report.ts (resolver)
 *           → Zod validation (lib/validations/report.schema.ts)
 *           → Drizzle ORM → PostgreSQL
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-reports.ts — useQuery / useMutation hooks
 *
 * SERVER HANDLER:
 *   lib/graphql/resolvers/report.ts — resolves these operations against the DB
 *
 * RELATED FILES:
 *   lib/graphql/operations/document.ts — same pattern for documents
 *   lib/graphql/operations/client.ts   — same pattern for clients
 *   lib/graphql/operations/entity.ts   — same pattern for entities
 *   lib/graphql/operations/asset.ts    — same pattern for assets
 */

import { gql } from "@apollo/client"

/**
 * REPORT_FIELDS — A GraphQL fragment containing the standard fields for a
 * report record. Fragments are reusable selections — instead of repeating
 * the same fields in every query, we define them once and spread with
 * `...ReportFields`.
 *
 * Every field here maps 1:1 to a column in the `reports` database table.
 * See: app/db/schema/reports.ts for column definitions.
 *
 * WHY A FRAGMENT?
 *   Without fragments, every query/mutation that returns a Report would need
 *   to list all 12+ fields. If we add a new column to the reports table,
 *   we'd need to update every single operation. With a fragment, we update
 *   it in ONE place and all operations automatically include the new field.
 */
export const REPORT_FIELDS = gql`
  fragment ReportFields on Report {
    id
    orgId
    clientId
    name
    description
    reportType
    status
    parameters
    currentVersionId
    currentVersionNumber
    createdBy
    createdAt
    updatedAt
  }
`

/**
 * GET_REPORTS — Paginated list query.
 *
 * Variables (all optional):
 *   clientId   — filter reports belonging to a specific client
 *   reportType — filter by report type (e.g., "portfolio_summary", "tax_summary")
 *   page       — page number (default 1)
 *   limit      — items per page (default 25, max 100)
 *
 * Returns a ReportConnection: { items, totalCount, page, limit }
 *
 * The resolver enforces org-scoping — only reports belonging to the
 * authenticated user's organization are returned. This is critical for
 * multi-tenant security: a user at Org A can never see Org B's reports.
 *
 * EXAMPLE USAGE:
 *   const { data } = useQuery(GET_REPORTS, {
 *     variables: { reportType: "portfolio_summary", page: 1, limit: 10 }
 *   })
 *   // data.reports.items → Report[]
 *   // data.reports.totalCount → number (for pagination UI)
 */
export const GET_REPORTS = gql`
  ${REPORT_FIELDS}
  query GetReports($clientId: ID, $reportType: String, $page: Int, $limit: Int) {
    reports(clientId: $clientId, reportType: $reportType, page: $page, limit: $limit) {
      items {
        ...ReportFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_REPORT — Single report by ID, with resolved relations.
 *
 * In addition to the standard ReportFields, this also fetches:
 *   - client { id, displayName }     — which client this report is for
 *   - createdByUser { id, email }    — who generated the report
 *   - versions { ... }               — version history for audit trail
 *
 * Useful for a report detail/preview view where you want to show the
 * full context of who created it and its revision history.
 *
 * VERSIONS:
 *   Reports support versioning — each time a report is regenerated,
 *   a new ReportVersion is created. The `currentVersionId` on the
 *   report points to the latest version.
 */
export const GET_REPORT = gql`
  ${REPORT_FIELDS}
  query GetReport($id: ID!) {
    report(id: $id) {
      ...ReportFields
      client {
        id
        displayName
      }
      createdByUser {
        id
        email
      }
      versions {
        id
        versionNumber
        storagePath
        generatedAt
        generatedByUser {
          id
          email
        }
      }
    }
  }
`

/**
 * CREATE_REPORT — Inserts a new report record.
 *
 * Requires role: admin | assistant (enforced by the resolver).
 *
 * Input fields (see CreateReportInput in report.graphql):
 *   name (required), reportType (required), plus optional:
 *   clientId, description, parameters.
 *
 * The resolver auto-sets:
 *   - orgId     → from the authenticated session (multi-tenant isolation)
 *   - createdBy → from the authenticated user's ID
 *   - status    → defaults to "draft"
 *
 * After mutation succeeds, Apollo refetches GET_REPORTS to update the list.
 */
export const CREATE_REPORT = gql`
  ${REPORT_FIELDS}
  mutation CreateReport($input: CreateReportInput!) {
    createReport(input: $input) {
      ...ReportFields
    }
  }
`

/**
 * UPDATE_REPORT — Modifies an existing report's metadata.
 *
 * Requires role: admin | assistant.
 *
 * Only the provided fields are updated (partial update pattern):
 *   - name, description, status, parameters
 *
 * You cannot change reportType, clientId, or orgId after creation.
 * These are immutable to preserve data integrity and audit trail.
 *
 * For JSONB fields (parameters), the resolver MERGES the new values
 * with existing ones rather than replacing — so you can add new
 * parameters without losing existing ones.
 */
export const UPDATE_REPORT = gql`
  ${REPORT_FIELDS}
  mutation UpdateReport($id: ID!, $input: UpdateReportInput!) {
    updateReport(id: $id, input: $input) {
      ...ReportFields
    }
  }
`

/**
 * DELETE_REPORT — Hard-deletes a report record.
 *
 * Requires role: admin only (assistants cannot delete reports).
 * Returns Boolean (true on success).
 *
 * IMPORTANT: This cascades to delete all associated ReportVersions
 * (configured via ON DELETE CASCADE in the database schema).
 * The actual report files in storage are NOT deleted — file cleanup
 * should be handled separately if needed.
 */
export const DELETE_REPORT = gql`
  mutation DeleteReport($id: ID!) {
    deleteReport(id: $id)
  }
`
