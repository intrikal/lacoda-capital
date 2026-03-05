/**
 * ============================================================================
 * FILE: lib/graphql/operations/org.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for org member management.
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/org.ts
 *           → Drizzle ORM → PostgreSQL (org_members + users tables)
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-org-members.ts — useQuery / useMutation hooks
 */

import { gql } from "@apollo/client"

/**
 * ORG_MEMBER_FIELDS — Reusable fragment for org member fields.
 * Includes the resolved user relation for display (name, email, avatar).
 */
export const ORG_MEMBER_FIELDS = gql`
  fragment OrgMemberFields on OrgMember {
    id
    orgId
    userId
    role
    clientId
    createdAt
    updatedAt
    user {
      id
      email
      fullName
      avatarUrl
    }
  }
`

/**
 * GET_ORG_MEMBERS — Paginated list of org members with user details.
 */
export const GET_ORG_MEMBERS = gql`
  ${ORG_MEMBER_FIELDS}
  query GetOrgMembers($page: Int, $limit: Int) {
    orgMembers(page: $page, limit: $limit) {
      items {
        ...OrgMemberFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_ME — Fetches the current user's org membership.
 */
export const GET_ME = gql`
  ${ORG_MEMBER_FIELDS}
  query GetMe {
    me {
      ...OrgMemberFields
    }
  }
`

/**
 * INVITE_ORG_MEMBER — Adds a user to the org by email.
 */
export const INVITE_ORG_MEMBER = gql`
  ${ORG_MEMBER_FIELDS}
  mutation InviteOrgMember($input: InviteOrgMemberInput!) {
    inviteOrgMember(input: $input) {
      ...OrgMemberFields
    }
  }
`

/**
 * UPDATE_ORG_MEMBER_ROLE — Changes a member's role.
 */
export const UPDATE_ORG_MEMBER_ROLE = gql`
  ${ORG_MEMBER_FIELDS}
  mutation UpdateOrgMemberRole($id: ID!, $input: UpdateOrgMemberRoleInput!) {
    updateOrgMemberRole(id: $id, input: $input) {
      ...OrgMemberFields
    }
  }
`

/**
 * REMOVE_ORG_MEMBER — Removes a member from the org.
 */
export const REMOVE_ORG_MEMBER = gql`
  mutation RemoveOrgMember($id: ID!) {
    removeOrgMember(id: $id)
  }
`
