import { gql } from "@apollo/client"

export const BENCHMARK_FIELDS = gql`
  fragment BenchmarkFields on Benchmark {
    id
    orgId
    clientId
    name
    symbol
    category
    ytdReturn
    alpha
    beta
    sharpeRatio
    volatility
    notes
    metadata
    createdAt
    updatedAt
  }
`

export const GET_BENCHMARKS = gql`
  ${BENCHMARK_FIELDS}
  query GetBenchmarks(
    $clientId: ID
    $category: String
    $page: Int
    $limit: Int
  ) {
    benchmarks(
      clientId: $clientId
      category: $category
      page: $page
      limit: $limit
    ) {
      items {
        ...BenchmarkFields
      }
      totalCount
      page
      limit
    }
  }
`

export const GET_BENCHMARK = gql`
  ${BENCHMARK_FIELDS}
  query GetBenchmark($id: ID!) {
    benchmark(id: $id) {
      ...BenchmarkFields
      client {
        id
        displayName
      }
    }
  }
`

export const CREATE_BENCHMARK = gql`
  ${BENCHMARK_FIELDS}
  mutation CreateBenchmark($input: CreateBenchmarkInput!) {
    createBenchmark(input: $input) {
      ...BenchmarkFields
    }
  }
`

export const UPDATE_BENCHMARK = gql`
  ${BENCHMARK_FIELDS}
  mutation UpdateBenchmark($id: ID!, $input: UpdateBenchmarkInput!) {
    updateBenchmark(id: $id, input: $input) {
      ...BenchmarkFields
    }
  }
`

export const DELETE_BENCHMARK = gql`
  mutation DeleteBenchmark($id: ID!) {
    deleteBenchmark(id: $id)
  }
`
