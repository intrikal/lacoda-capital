/**
 * ============================================================================
 * FILE: lib/graphql/operations/tax-deduction.ts
 * ============================================================================
 *
 * Client-side GraphQL fragments, queries, and mutations for tax deductions.
 * Consumed by Apollo Client hooks in use-tax-deductions.ts.
 *
 * CONSUMERS:
 *   - lib/hooks/crud/use-tax-deductions.ts
 */

import { gql } from "@apollo/client"

export const TAX_DEDUCTION_FIELDS = gql`
  fragment TaxDeductionFields on TaxDeduction {
    id
    orgId
    clientId
    name
    category
    type
    status
    amount
    estimatedSavings
    taxYear
    description
    notes
    metadata
    createdAt
    updatedAt
  }
`

export const GET_TAX_DEDUCTIONS = gql`
  ${TAX_DEDUCTION_FIELDS}
  query GetTaxDeductions(
    $clientId: ID
    $status: String
    $category: String
    $type: String
    $taxYear: String
    $page: Int
    $limit: Int
  ) {
    taxDeductions(
      clientId: $clientId
      status: $status
      category: $category
      type: $type
      taxYear: $taxYear
      page: $page
      limit: $limit
    ) {
      items {
        ...TaxDeductionFields
      }
      totalCount
      page
      limit
    }
  }
`

export const GET_TAX_DEDUCTION = gql`
  ${TAX_DEDUCTION_FIELDS}
  query GetTaxDeduction($id: ID!) {
    taxDeduction(id: $id) {
      ...TaxDeductionFields
      client {
        id
        displayName
      }
    }
  }
`

export const CREATE_TAX_DEDUCTION = gql`
  ${TAX_DEDUCTION_FIELDS}
  mutation CreateTaxDeduction($input: CreateTaxDeductionInput!) {
    createTaxDeduction(input: $input) {
      ...TaxDeductionFields
    }
  }
`

export const UPDATE_TAX_DEDUCTION = gql`
  ${TAX_DEDUCTION_FIELDS}
  mutation UpdateTaxDeduction($id: ID!, $input: UpdateTaxDeductionInput!) {
    updateTaxDeduction(id: $id, input: $input) {
      ...TaxDeductionFields
    }
  }
`

export const DELETE_TAX_DEDUCTION = gql`
  mutation DeleteTaxDeduction($id: ID!) {
    deleteTaxDeduction(id: $id)
  }
`
