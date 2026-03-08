/**
 * ============================================================================
 * FILE: /lib/graphql/operations/task.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for tasks.
 *   These are the "requests" that the browser sends to our GraphQL API.
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/task.ts (resolver)
 *           → Zod validation (lib/validations/task.schema.ts)
 *           → Drizzle ORM → PostgreSQL
 *
 * PATTERN:
 *   Same structure as document.ts and report.ts:
 *     1. FRAGMENT       — reusable field list
 *     2. LIST QUERY     — paginated, filterable list
 *     3. SINGLE QUERY   — one record by ID with relations
 *     4. CREATE MUTATION — insert a new record
 *     5. UPDATE MUTATION — modify an existing record
 *     6. DELETE MUTATION — remove a record (returns Boolean)
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-tasks.ts — useQuery / useMutation hooks
 *
 * SERVER HANDLER:
 *   lib/graphql/resolvers/task.ts — resolves these operations against the DB
 */

import { gql } from "@apollo/client"

/**
 * TASK_FIELDS — Fragment containing the standard fields for a task record.
 *
 * Every field maps 1:1 to a column in the `tasks` database table.
 * See: app/db/schema/tasks.ts for column definitions.
 *
 * Notable fields:
 *   - assignedTo/createdBy/completedBy — UUIDs referencing the users table
 *   - clientId/entityId/assetId/documentId — polymorphic links to related records
 *   - metadata — JSONB column for flexible data (checklist, tags, recurrence, etc.)
 *   - completedAt — auto-set by the resolver when status changes to "completed"
 */
export const TASK_FIELDS = gql`
  fragment TaskFields on Task {
    id
    orgId
    title
    description
    status
    priority
    dueDate
    assignedTo
    createdBy
    clientId
    entityId
    assetId
    documentId
    completedAt
    completedBy
    metadata
    createdAt
    updatedAt
  }
`

/**
 * GET_TASKS — Paginated list query with optional filters.
 *
 * Variables (all optional):
 *   clientId   — filter tasks linked to a specific client
 *   assignedTo — filter tasks assigned to a specific user (UUID)
 *   status     — filter by status (e.g., "pending", "in_progress")
 *   page       — page number (default 1)
 *   limit      — items per page (default 25, max 100)
 *
 * Returns a TaskConnection: { items, totalCount, page, limit }
 *
 * The resolver enforces org-scoping — only tasks belonging to the
 * authenticated user's organization are returned.
 */
export const GET_TASKS = gql`
  ${TASK_FIELDS}
  query GetTasks($clientId: ID, $assignedTo: ID, $status: String, $page: Int, $limit: Int) {
    tasks(clientId: $clientId, assignedTo: $assignedTo, status: $status, page: $page, limit: $limit) {
      items {
        ...TaskFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_TASK — Single task by ID, with resolved relations.
 *
 * In addition to the standard TaskFields, this fetches:
 *   - assignedToUser { id, email }  — who should do the task
 *   - createdByUser { id, email }   — who created it
 *   - client { id, displayName }    — linked client
 *   - entity { id, name }           — linked entity
 *   - asset { id, name }            — linked asset
 *
 * Useful for a task detail view showing the full context.
 */
export const GET_TASK = gql`
  ${TASK_FIELDS}
  query GetTask($id: ID!) {
    task(id: $id) {
      ...TaskFields
      assignedToUser {
        id
        email
      }
      createdByUser {
        id
        email
      }
      client {
        id
        displayName
      }
      entity {
        id
        name
      }
      asset {
        id
        name
      }
    }
  }
`

/**
 * CREATE_TASK — Inserts a new task record.
 *
 * Requires role: admin | assistant (enforced by the resolver).
 *
 * The resolver auto-sets:
 *   - orgId     → from the authenticated session
 *   - createdBy → from the authenticated user's member ID
 *   - status    → defaults to "pending" if not provided
 *   - priority  → defaults to "medium" if not provided
 */
export const CREATE_TASK = gql`
  ${TASK_FIELDS}
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      ...TaskFields
    }
  }
`

/**
 * UPDATE_TASK — Modifies an existing task.
 *
 * Requires role: admin | assistant.
 *
 * Only provided fields are updated (partial update pattern).
 *
 * AUTO-COMPLETION: When status is changed to "completed", the resolver
 * automatically sets completedAt and completedBy from the session.
 * This ensures accurate audit trail without requiring client-side logic.
 *
 * METADATA MERGING: The resolver shallow-merges new metadata with existing,
 * so updating { tags: ["new"] } won't erase an existing { checklist: [...] }.
 */
export const UPDATE_TASK = gql`
  ${TASK_FIELDS}
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      ...TaskFields
    }
  }
`

/**
 * DELETE_TASK — Hard-deletes a task record.
 *
 * Requires role: admin only.
 * Returns Boolean (true on success).
 */
export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`
