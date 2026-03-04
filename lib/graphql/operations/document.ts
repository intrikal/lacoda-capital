/**
 * ============================================================================
 * FILE: /lib/graphql/operations/document.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client-side GraphQL operations (queries + mutations) for documents.
 *   These are the "requests" that the browser sends to our GraphQL API.
 *
 * HOW IT WORKS:
 *   Apollo Client uses these tagged template literals (`gql``) to:
 *   1. Parse the GraphQL string at build time
 *   2. Send the operation to POST /api/graphql at runtime
 *   3. Cache the results in the InMemoryCache
 *
 * PATTERN:
 *   Every entity (clients, entities, assets, documents) follows the same
 *   structure in this directory:
 *     1. FRAGMENT  — reusable field list (avoids duplicating fields)
 *     2. LIST QUERY — paginated, filterable list of records
 *     3. SINGLE QUERY — one record by ID with relations
 *     4. CREATE MUTATION — insert a new record
 *     5. UPDATE MUTATION — modify an existing record
 *     6. DELETE MUTATION — remove a record (returns Boolean)
 *
 * CONSUMERS:
 *   lib/hooks/crud/use-documents.ts — useQuery / useMutation hooks
 *
 * SERVER HANDLER:
 *   lib/graphql/resolvers/document.ts — resolves these operations against the DB
 *
 * RELATED FILES:
 *   lib/graphql/operations/client.ts  — same pattern for clients
 *   lib/graphql/operations/entity.ts  — same pattern for entities
 *   lib/graphql/operations/asset.ts   — same pattern for assets
 */

import { gql } from "@apollo/client"

/**
 * DOCUMENT_FIELDS — A GraphQL fragment containing the standard fields for a
 * document record. Fragments are reusable selections — instead of repeating
 * the same 20 fields in every query, we define them once and spread with
 * `...DocumentFields`.
 *
 * Every field here maps 1:1 to a column in the `documents` database table.
 * See: app/db/schema/documents.ts for column definitions.
 */
export const DOCUMENT_FIELDS = gql`
  fragment DocumentFields on Document {
    id
    orgId
    clientId
    entityId
    assetId
    name
    description
    mimeType
    fileSize
    storagePath
    folder
    status
    expiresAt
    verifiedAt
    verifiedBy
    tags
    createdAt
    updatedAt
  }
`

/**
 * GET_DOCUMENTS — Paginated list query.
 *
 * Variables (all optional):
 *   clientId  — filter documents belonging to a specific client
 *   entityId  — filter documents belonging to a specific entity
 *   assetId   — filter documents belonging to a specific asset
 *   page      — page number (default 1)
 *   limit     — items per page (default 25, max 100)
 *
 * Returns a DocumentConnection: { items, totalCount, page, limit }
 *
 * The resolver enforces org-scoping — only documents belonging to the
 * authenticated user's organization are returned.
 */
export const GET_DOCUMENTS = gql`
  ${DOCUMENT_FIELDS}
  query GetDocuments($clientId: ID, $entityId: ID, $assetId: ID, $page: Int, $limit: Int) {
    documents(clientId: $clientId, entityId: $entityId, assetId: $assetId, page: $page, limit: $limit) {
      items {
        ...DocumentFields
      }
      totalCount
      page
      limit
    }
  }
`

/**
 * GET_DOCUMENT — Single document by ID, with resolved relations.
 *
 * In addition to the standard DocumentFields, this also fetches:
 *   - client { id, displayName }
 *   - entity { id, name, entityType }
 *   - asset  { id, name, assetClass }
 *
 * Useful for a document detail view where you want to show which
 * client/entity/asset the document is associated with.
 */
export const GET_DOCUMENT = gql`
  ${DOCUMENT_FIELDS}
  query GetDocument($id: ID!) {
    document(id: $id) {
      ...DocumentFields
      client {
        id
        displayName
      }
      entity {
        id
        name
        entityType
      }
      asset {
        id
        name
        assetClass
      }
    }
  }
`

/**
 * CREATE_DOCUMENT — Inserts a new document record.
 *
 * Requires role: admin | assistant (enforced by the resolver).
 *
 * Input fields (see CreateDocumentInput in document.graphql):
 *   name (required), storagePath (required), plus optional:
 *   clientId, entityId, assetId, description, mimeType, fileSize,
 *   folder, status, expiresAt, tags, metadata.
 *
 * After mutation succeeds, Apollo refetches GET_DOCUMENTS to update the list.
 */
export const CREATE_DOCUMENT = gql`
  ${DOCUMENT_FIELDS}
  mutation CreateDocument($input: CreateDocumentInput!) {
    createDocument(input: $input) {
      ...DocumentFields
    }
  }
`

/**
 * UPDATE_DOCUMENT — Modifies an existing document's metadata.
 *
 * Requires role: admin | assistant.
 *
 * Only the provided fields are updated (partial update). You cannot change
 * storagePath, clientId, entityId, or assetId after creation.
 * See UpdateDocumentInput in document.graphql.
 */
export const UPDATE_DOCUMENT = gql`
  ${DOCUMENT_FIELDS}
  mutation UpdateDocument($id: ID!, $input: UpdateDocumentInput!) {
    updateDocument(id: $id, input: $input) {
      ...DocumentFields
    }
  }
`

/**
 * DELETE_DOCUMENT — Hard-deletes a document record.
 *
 * Requires role: admin only.
 * Returns Boolean (true on success).
 *
 * NOTE: This deletes the database record but does NOT delete the file from
 * Supabase Storage. File cleanup should be handled separately if needed.
 */
export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id)
  }
`
