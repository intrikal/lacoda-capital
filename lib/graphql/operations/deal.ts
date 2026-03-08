/**
 * ============================================================================
 * FILE: lib/graphql/operations/deal.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for deals/pipeline.
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/deal.ts
 *           → Drizzle ORM → PostgreSQL (deals table)
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-deals.ts — useQuery / useMutation hooks
 */

import { gql } from "@apollo/client"

/**
 * DEAL_FIELDS — Reusable fragment for standard deal fields.
 */
export const DEAL_FIELDS = gql`
  fragment DealFields on Deal {
    id
    orgId
    clientId
    name
    stage
    type
    potentialValue
    probability
    assignedTo
    assigneeName
    dueDate
    notes
    lastActivity
    createdAt
    updatedAt
  }
`

/**
 * GET_DEALS — Paginated list of deals with optional stage/type filtering.
 */
export const GET_DEALS = gql`
  ${DEAL_FIELDS}
  query GetDeals($clientId: ID, $stage: DealStage, $type: DealType, $page: Int, $limit: Int) {
    deals(clientId: $clientId, stage: $stage, type: $type, page: $page, limit: $limit) {
      items {
        ...DealFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_DEAL — Single deal by ID.
 */
export const GET_DEAL = gql`
  ${DEAL_FIELDS}
  query GetDeal($id: ID!) {
    deal(id: $id) {
      ...DealFields
    }
  }
`

/**
 * CREATE_DEAL — Creates a new deal in the pipeline.
 */
export const CREATE_DEAL = gql`
  ${DEAL_FIELDS}
  mutation CreateDeal($input: CreateDealInput!) {
    createDeal(input: $input) {
      ...DealFields
    }
  }
`

/**
 * UPDATE_DEAL — Updates an existing deal (stage change, edit fields, etc.).
 */
export const UPDATE_DEAL = gql`
  ${DEAL_FIELDS}
  mutation UpdateDeal($id: ID!, $input: UpdateDealInput!) {
    updateDeal(id: $id, input: $input) {
      ...DealFields
    }
  }
`

/**
 * DELETE_DEAL — Removes a deal from the pipeline.
 */
export const DELETE_DEAL = gql`
  mutation DeleteDeal($id: ID!) {
    deleteDeal(id: $id)
  }
`
