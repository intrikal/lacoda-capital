/**
 * ============================================================================
 * FILE: lib/hooks/crud/use-org-members.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   React hooks that connect the Settings Team tab to the GraphQL API.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ Settings Page (Team Tab)                                          │
 *   │   └── useOrgMembers()           → fetches member list             │
 *   │   └── useCurrentMember()        → fetches current user's member   │
 *   │   └── useInviteOrgMember()      → invites a new member           │
 *   │   └── useUpdateOrgMemberRole()  → changes a member's role        │
 *   │   └── useRemoveOrgMember()      → removes a member               │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ orgResolvers → Drizzle ORM → PostgreSQL                           │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * CONSUMERS:
 *   - app/(dashboard)/app/settings/page.tsx
 */

"use client"

import { useCallback } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import {
  GET_ORG_MEMBERS,
  GET_ME,
  INVITE_ORG_MEMBER,
  UPDATE_ORG_MEMBER_ROLE,
  REMOVE_ORG_MEMBER,
} from "@/lib/graphql/operations/org"
import type { InviteOrgMemberInput, UpdateOrgMemberRoleInput } from "@/lib/validations/org.schema"

// ─── TYPES ────────────────────────────────────────────────────────────────────

/** Org member role values matching the DB enum. */
export type OrgMemberRole = "admin" | "assistant" | "client"

/** User details resolved from the user relation. */
export interface OrgMemberUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

/**
 * OrgMemberRecord — Shape of an org member returned by the GraphQL API.
 * Includes the resolved user relation for display purposes.
 */
export interface OrgMemberRecord {
  id: string
  orgId: string
  userId: string
  role: OrgMemberRole
  clientId: string | null
  createdAt: string
  updatedAt: string
  user: OrgMemberUser
}

/** Apollo response shape for GET_ORG_MEMBERS. */
interface GetOrgMembersData {
  orgMembers: {
    items: OrgMemberRecord[]
    totalCount: number
    page: number
    limit: number
  }
}

/** Apollo response shape for GET_ME. */
interface GetMeData {
  me: OrgMemberRecord | null
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

/**
 * useOrgMembers — Fetches the list of org members with user details.
 *
 * @returns
 *   members   — Array of OrgMemberRecord (empty while loading)
 *   isLoading — True during the initial fetch
 *   isError   — True if the query failed
 *   error     — The ApolloError object (null if no error)
 */
export function useOrgMembers() {
  const { data, loading, error } = useQuery<GetOrgMembersData>(
    GET_ORG_MEMBERS,
    { variables: { limit: 100 } }
  )

  return {
    members: data?.orgMembers?.items ?? [],
    isLoading: loading,
    isError: !!error,
    error: error ?? null,
  }
}

/**
 * useCurrentMember — Fetches the current user's org membership record.
 */
export function useCurrentMember() {
  const { data, loading } = useQuery<GetMeData>(GET_ME)

  return {
    member: data?.me ?? null,
    isLoading: loading,
  }
}

/**
 * useInviteOrgMember — Invites a user to the org by email.
 */
export function useInviteOrgMember() {
  const [invite, { loading }] = useMutation(INVITE_ORG_MEMBER, {
    refetchQueries: [{ query: GET_ORG_MEMBERS }],
  })

  const mutate = useCallback(
    (input: InviteOrgMemberInput) => {
      return invite({ variables: { input } })
    },
    [invite]
  )

  return { mutate, isPending: loading }
}

/**
 * useUpdateOrgMemberRole — Changes a member's role in the org.
 */
export function useUpdateOrgMemberRole() {
  const [update, { loading }] = useMutation(UPDATE_ORG_MEMBER_ROLE, {
    refetchQueries: [{ query: GET_ORG_MEMBERS }],
  })

  const mutate = useCallback(
    (id: string, input: UpdateOrgMemberRoleInput) => {
      return update({ variables: { id, input } })
    },
    [update]
  )

  return { mutate, isPending: loading }
}

/**
 * useRemoveOrgMember — Removes a member from the org.
 */
export function useRemoveOrgMember() {
  const [remove, { loading }] = useMutation(REMOVE_ORG_MEMBER, {
    refetchQueries: [{ query: GET_ORG_MEMBERS }],
  })

  const mutate = useCallback(
    (id: string) => {
      return remove({ variables: { id } })
    },
    [remove]
  )

  return { mutate, isPending: loading }
}
