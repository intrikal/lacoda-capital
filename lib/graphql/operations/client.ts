import { gql } from "@apollo/client"

export const CLIENT_FIELDS = gql`
  fragment ClientFields on Client {
    id
    displayName
    email
    phone
    clientType
    clientStatus
    createdAt
    entityCount
    assetCount
    totalAUM
  }
`

export const GET_CLIENTS = gql`
  ${CLIENT_FIELDS}
  query GetClients($page: Int, $limit: Int, $search: String, $status: ClientStatus) {
    clients(page: $page, limit: $limit, search: $search, status: $status) {
      items {
        ...ClientFields
      }
      totalCount
      page
      limit
    }
  }
`

export const GET_CLIENT = gql`
  ${CLIENT_FIELDS}
  query GetClient($id: ID!) {
    client(id: $id) {
      ...ClientFields
      profile
      entities {
        id
        name
        entityType
      }
    }
  }
`

export const CREATE_CLIENT = gql`
  ${CLIENT_FIELDS}
  mutation CreateClient($input: CreateClientInput!) {
    createClient(input: $input) {
      ...ClientFields
    }
  }
`

export const UPDATE_CLIENT = gql`
  ${CLIENT_FIELDS}
  mutation UpdateClient($id: ID!, $input: UpdateClientInput!) {
    updateClient(id: $id, input: $input) {
      ...ClientFields
    }
  }
`

export const DELETE_CLIENT = gql`
  mutation DeleteClient($id: ID!) {
    deleteClient(id: $id)
  }
`
