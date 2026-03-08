/**
 * Client-side GraphQL operations for insurance policies.
 */

import { gql } from "@apollo/client"

export const INSURANCE_POLICY_FIELDS = gql`
  fragment InsurancePolicyFields on InsurancePolicy {
    id
    orgId
    clientId
    name
    policyType
    status
    provider
    policyNumber
    coverageAmount
    deductible
    premium
    premiumFrequency
    effectiveDate
    expirationDate
    coveredAssets
    beneficiaries
    agent
    notes
    metadata
    createdAt
    updatedAt
  }
`

export const GET_INSURANCE_POLICIES = gql`
  ${INSURANCE_POLICY_FIELDS}
  query GetInsurancePolicies(
    $clientId: ID
    $status: String
    $policyType: String
    $page: Int
    $limit: Int
  ) {
    insurancePolicies(
      clientId: $clientId
      status: $status
      policyType: $policyType
      page: $page
      limit: $limit
    ) {
      items {
        ...InsurancePolicyFields
      }
      totalCount
      page
      limit
    }
  }
`

export const GET_INSURANCE_POLICY = gql`
  ${INSURANCE_POLICY_FIELDS}
  query GetInsurancePolicy($id: ID!) {
    insurancePolicy(id: $id) {
      ...InsurancePolicyFields
      client {
        id
        displayName
      }
    }
  }
`

export const CREATE_INSURANCE_POLICY = gql`
  ${INSURANCE_POLICY_FIELDS}
  mutation CreateInsurancePolicy($input: CreateInsurancePolicyInput!) {
    createInsurancePolicy(input: $input) {
      ...InsurancePolicyFields
    }
  }
`

export const UPDATE_INSURANCE_POLICY = gql`
  ${INSURANCE_POLICY_FIELDS}
  mutation UpdateInsurancePolicy($id: ID!, $input: UpdateInsurancePolicyInput!) {
    updateInsurancePolicy(id: $id, input: $input) {
      ...InsurancePolicyFields
    }
  }
`

export const DELETE_INSURANCE_POLICY = gql`
  mutation DeleteInsurancePolicy($id: ID!) {
    deleteInsurancePolicy(id: $id)
  }
`
