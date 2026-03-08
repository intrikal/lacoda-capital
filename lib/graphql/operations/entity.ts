import { gql } from "@apollo/client"

export const ENTITY_FIELDS = gql`
  fragment EntityFields on Entity {
    id
    clientId
    name
    entityType
    jurisdiction
    formationDate
    taxId
    createdAt
    updatedAt
    assetCount
    totalValue
  }
`

export const GET_ENTITIES = gql`
  ${ENTITY_FIELDS}
  query GetEntities($page: Int, $limit: Int, $search: String, $clientId: ID, $entityType: EntityType) {
    entities(page: $page, limit: $limit, search: $search, clientId: $clientId, entityType: $entityType) {
      items {
        ...EntityFields
      }
      totalCount
      page
      limit
    }
  }
`

export const GET_ENTITY = gql`
  ${ENTITY_FIELDS}
  query GetEntity($id: ID!) {
    entity(id: $id) {
      ...EntityFields
      metadata
      client {
        id
        displayName
      }
      assets {
        id
        name
        assetClass
        currentValue
        status
      }
    }
  }
`

export const CREATE_ENTITY = gql`
  ${ENTITY_FIELDS}
  mutation CreateEntity($input: CreateEntityInput!) {
    createEntity(input: $input) {
      ...EntityFields
    }
  }
`

export const UPDATE_ENTITY = gql`
  ${ENTITY_FIELDS}
  mutation UpdateEntity($id: ID!, $input: UpdateEntityInput!) {
    updateEntity(id: $id, input: $input) {
      ...EntityFields
    }
  }
`

export const DELETE_ENTITY = gql`
  mutation DeleteEntity($id: ID!) {
    deleteEntity(id: $id)
  }
`
