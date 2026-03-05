/**
 * ============================================================================
 * FILE: lib/graphql/operations/goal.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for financial goals.
 *   These are the "requests" the browser sends to our GraphQL API.
 *
 * HOW IT WORKS:
 *   Apollo Client uses these tagged template literals (`gql`) to:
 *   1. Parse the GraphQL string at build time
 *   2. Send the operation to POST /api/graphql at runtime
 *   3. Cache the results in the InMemoryCache
 *
 * DATA MODEL:
 *   A Goal represents a named financial target:
 *     name            — e.g., "Retirement Fund"
 *     category        — retirement | education | realestate | emergency |
 *                       travel | vehicle | investment | custom
 *     status          — on_track | ahead | behind | completed
 *                       (set explicitly by the advisor, not auto-derived)
 *     targetAmount    — the monetary goal (e.g., 5_000_000)
 *     currentAmount   — amount saved so far
 *     monthlyContribution — regular monthly deposit
 *     targetDate      — ISO date string "YYYY-MM-DD"
 *
 * PATTERN:
 *   Same structure as every other entity in this directory:
 *     1. FRAGMENT     — reusable field selection
 *     2. LIST QUERY   — paginated, filterable list
 *     3. SINGLE QUERY — one goal by ID
 *     4. MUTATIONS    — create, update, delete
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/goal.ts (resolver)
 *           → Zod validation (lib/validations/goal.schema.ts)
 *           → Drizzle ORM → PostgreSQL (goals table)
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-goals.ts — useQuery / useMutation hooks
 *
 * SERVER HANDLER:
 *   lib/graphql/resolvers/goal.ts — resolves these operations against the DB
 */

import { gql } from "@apollo/client"

/**
 * GOAL_FIELDS — Fragment containing the standard fields for a goal.
 *
 * Every field maps 1:1 to a column in the `goals` table.
 * See: app/db/schema/goals.ts for column definitions.
 *
 * We intentionally exclude the `client` relation field here — the
 * list query does not need the full Client object (just clientId is enough
 * to avoid N+1 queries on list pages).
 */
export const GOAL_FIELDS = gql`
  fragment GoalFields on Goal {
    id
    orgId
    clientId
    name
    category
    status
    priority
    targetAmount
    currentAmount
    monthlyContribution
    targetDate
    notes
    metadata
    createdAt
    updatedAt
  }
`

/**
 * GET_GOALS — Paginated list of goals with optional filters.
 *
 * Variables (all optional):
 *   clientId  — filter goals linked to a specific client
 *   status    — filter by goal status (on_track | ahead | behind | completed)
 *   category  — filter by goal category (retirement | education | ...)
 *   page      — page number (default 1)
 *   limit     — items per page (default 25, max 100)
 *
 * The resolver enforces org-scoping — only goals belonging to the
 * authenticated user's organization are returned.
 *
 * EXAMPLE USAGE:
 *   const { data } = useQuery(GET_GOALS, {
 *     variables: { status: "on_track", page: 1, limit: 50 }
 *   })
 *   // data.goals.items → Goal[]
 */
export const GET_GOALS = gql`
  ${GOAL_FIELDS}
  query GetGoals(
    $clientId: ID
    $status: String
    $category: String
    $page: Int
    $limit: Int
  ) {
    goals(
      clientId: $clientId
      status: $status
      category: $category
      page: $page
      limit: $limit
    ) {
      items {
        ...GoalFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_GOAL — Single goal by ID, with resolved client relation.
 *
 * Used for detail views where the full client context is needed.
 * The `client` field is resolved lazily server-side only when requested.
 */
export const GET_GOAL = gql`
  ${GOAL_FIELDS}
  query GetGoal($id: ID!) {
    goal(id: $id) {
      ...GoalFields
      client {
        id
        displayName
      }
    }
  }
`

/**
 * CREATE_GOAL — Inserts a new financial goal.
 *
 * Requires role: admin | assistant (enforced by the resolver).
 *
 * Input fields (see CreateGoalInput in goal.graphql):
 *   name (required), category (required), priority (required),
 *   targetAmount (required), targetDate (required), plus optional:
 *   clientId, currentAmount, monthlyContribution, notes, metadata.
 *
 * The resolver auto-sets:
 *   - orgId  → from the authenticated session
 *   - status → "on_track" (DB default)
 *
 * After mutation succeeds, Apollo refetches GET_GOALS to update the list.
 */
export const CREATE_GOAL = gql`
  ${GOAL_FIELDS}
  mutation CreateGoal($input: CreateGoalInput!) {
    createGoal(input: $input) {
      ...GoalFields
    }
  }
`

/**
 * UPDATE_GOAL — Modifies an existing goal (partial update).
 *
 * Requires role: admin | assistant.
 *
 * Only provided fields are updated. All fields in UpdateGoalInput
 * are optional. Use this for:
 *   - Updating amounts after a deposit (currentAmount)
 *   - Changing the status narrative (status)
 *   - Adjusting the monthly contribution (monthlyContribution)
 *   - Soft-linking/unlinking a client (clientId)
 *
 * For metadata (jsonb), the resolver MERGES new keys with existing ones.
 */
export const UPDATE_GOAL = gql`
  ${GOAL_FIELDS}
  mutation UpdateGoal($id: ID!, $input: UpdateGoalInput!) {
    updateGoal(id: $id, input: $input) {
      ...GoalFields
    }
  }
`

/**
 * DELETE_GOAL — Hard-deletes a goal.
 *
 * Requires role: admin only.
 * Returns Boolean (true on success).
 *
 * This is irreversible. Goals have no child tables, so no cascade effects.
 */
export const DELETE_GOAL = gql`
  mutation DeleteGoal($id: ID!) {
    deleteGoal(id: $id)
  }
`
