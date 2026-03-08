/**
 * ============================================================================
 * FILE: lib/graphql/operations/billing-record.ts
 * ============================================================================
 *
 * Client-side GraphQL fragments, queries, and mutations for billing records.
 * Consumed by Apollo Client hooks in use-billing-records.ts.
 *
 * CONSUMERS:
 *   - lib/hooks/crud/use-billing-records.ts   (advisor CRUD hooks)
 *   - lib/hooks/crud/use-client-billing.ts    (client read-only hook)
 */

import { gql } from "@apollo/client"

export const BILLING_RECORD_FIELDS = gql`
  fragment BillingRecordFields on BillingRecord {
    id
    orgId
    clientId
    period
    amount
    aum
    status
    dueDate
    paidDate
    effectiveRate
    description
    notes
    metadata
    createdAt
    updatedAt
  }
`

export const GET_BILLING_RECORDS = gql`
  ${BILLING_RECORD_FIELDS}
  query GetBillingRecords(
    $clientId: ID
    $status: String
    $page: Int
    $limit: Int
  ) {
    billingRecords(
      clientId: $clientId
      status: $status
      page: $page
      limit: $limit
    ) {
      items {
        ...BillingRecordFields
      }
      totalCount
      page
      limit
    }
  }
`

export const GET_BILLING_RECORD = gql`
  ${BILLING_RECORD_FIELDS}
  query GetBillingRecord($id: ID!) {
    billingRecord(id: $id) {
      ...BillingRecordFields
      client {
        id
        displayName
      }
    }
  }
`

export const CREATE_BILLING_RECORD = gql`
  ${BILLING_RECORD_FIELDS}
  mutation CreateBillingRecord($input: CreateBillingRecordInput!) {
    createBillingRecord(input: $input) {
      ...BillingRecordFields
    }
  }
`

export const UPDATE_BILLING_RECORD = gql`
  ${BILLING_RECORD_FIELDS}
  mutation UpdateBillingRecord($id: ID!, $input: UpdateBillingRecordInput!) {
    updateBillingRecord(id: $id, input: $input) {
      ...BillingRecordFields
    }
  }
`

export const DELETE_BILLING_RECORD = gql`
  mutation DeleteBillingRecord($id: ID!) {
    deleteBillingRecord(id: $id)
  }
`
