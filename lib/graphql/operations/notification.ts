/**
 * ============================================================================
 * FILE: lib/graphql/operations/notification.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for notifications.
 *
 * DATA FLOW:
 *   Browser → Apollo Client (useQuery/useMutation)
 *           → POST /api/graphql
 *           → lib/graphql/resolvers/notification.ts
 *           → Drizzle ORM → PostgreSQL (notifications table)
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-notifications.ts — useQuery / useMutation hooks
 */

import { gql } from "@apollo/client"

/**
 * NOTIFICATION_FIELDS — Reusable fragment for standard notification fields.
 * Maps 1:1 to columns in the notifications table.
 *
 * readAt: null means unread, ISO timestamp means read.
 * payload: JSONB with type-specific data (e.g., taskId, documentId).
 */
export const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on Notification {
    id
    userId
    orgId
    type
    title
    message
    readAt
    payload
    createdAt
  }
`

/**
 * GET_NOTIFICATIONS — Paginated list of notifications for the current user.
 *
 * Variables (all optional):
 *   unreadOnly — if true, only return unread notifications
 *   page       — page number (default 1)
 *   limit      — items per page (default 25, max 100)
 */
export const GET_NOTIFICATIONS = gql`
  ${NOTIFICATION_FIELDS}
  query GetNotifications($unreadOnly: Boolean, $page: Int, $limit: Int) {
    notifications(unreadOnly: $unreadOnly, page: $page, limit: $limit) {
      items {
        ...NotificationFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * MARK_NOTIFICATION_READ — Marks a single notification as read.
 * Sets readAt to the current timestamp server-side.
 */
export const MARK_NOTIFICATION_READ = gql`
  ${NOTIFICATION_FIELDS}
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      ...NotificationFields
    }
  }
`

/**
 * MARK_ALL_NOTIFICATIONS_READ — Marks all unread notifications as read.
 * Returns Boolean (true on success).
 */
export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`
