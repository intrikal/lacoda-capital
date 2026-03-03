import { gql } from "@apollo/client"

export const ASSET_FIELDS = gql`
  fragment AssetFields on Asset {
    id
    entityId
    name
    description
    assetClass
    status
    acquisitionDate
    acquisitionCost
    currency
    currentValue
    valuedAt
    externalId
    createdAt
    updatedAt
  }
`

export const GET_ASSETS = gql`
  ${ASSET_FIELDS}
  query GetAssets($page: Int, $limit: Int, $search: String, $entityId: ID, $assetClass: AssetClass, $status: AssetStatus) {
    assets(page: $page, limit: $limit, search: $search, entityId: $entityId, assetClass: $assetClass, status: $status) {
      items {
        ...AssetFields
      }
      totalCount
      page
      limit
    }
  }
`

export const GET_ASSET = gql`
  ${ASSET_FIELDS}
  query GetAsset($id: ID!) {
    asset(id: $id) {
      ...AssetFields
      metadata
      entity {
        id
        name
        entityType
        client {
          id
          displayName
        }
      }
      latestValuation {
        id
        value
        asOfDate
        source
      }
    }
  }
`

export const CREATE_ASSET = gql`
  ${ASSET_FIELDS}
  mutation CreateAsset($input: CreateAssetInput!) {
    createAsset(input: $input) {
      ...AssetFields
    }
  }
`

export const UPDATE_ASSET = gql`
  ${ASSET_FIELDS}
  mutation UpdateAsset($id: ID!, $input: UpdateAssetInput!) {
    updateAsset(id: $id, input: $input) {
      ...AssetFields
    }
  }
`

export const DELETE_ASSET = gql`
  mutation DeleteAsset($id: ID!) {
    deleteAsset(id: $id)
  }
`
