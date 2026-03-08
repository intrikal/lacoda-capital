import { describe, it, expect } from "vitest"
import { ApolloServer } from "@apollo/server"
import { makeExecutableSchema } from "@graphql-tools/schema"
import { readFileSync } from "fs"
import { join } from "path"
import { mergeTypeDefs } from "@graphql-tools/merge"

/**
 * Integration tests for the GraphQL API layer.
 *
 * These tests use ApolloServer.executeOperation() to test queries/mutations
 * without an HTTP layer. The database is mocked to isolate resolver logic.
 */

// Load schema files
const schemaDir = join(process.cwd(), "lib/graphql/schema")
const schemaFiles = [
  "schema.graphql",
  "client.graphql",
  "entity.graphql",
  "asset.graphql",
  "valuation.graphql",
  "org.graphql",
  "user.graphql",
  "org-member.graphql",
  "document.graphql",
  "document-request.graphql",
  "task.graphql",
  "assignment.graphql",
  "ledger-event.graphql",
  "report.graphql",
  "compliance.graphql",
  "integration.graphql",
  "notification.graphql",
]

describe("GraphQL Schema", () => {
  it("loads and parses all schema files without errors", () => {
    const typeDefsArray = schemaFiles.map((file) =>
      readFileSync(join(schemaDir, file), "utf-8")
    )
    const typeDefs = mergeTypeDefs(typeDefsArray)
    expect(typeDefs).toBeDefined()
    expect(typeDefs.kind).toBe("Document")
  })

  it("builds an executable schema from type definitions", () => {
    const typeDefsArray = schemaFiles.map((file) =>
      readFileSync(join(schemaDir, file), "utf-8")
    )
    const typeDefs = mergeTypeDefs(typeDefsArray)

    // Provide stub resolvers for all Query/Mutation fields
    const stubResolvers = {
      DateTime: {
        __serialize: (v: unknown) => v,
        __parseValue: (v: unknown) => v,
      },
      JSON: {
        __serialize: (v: unknown) => v,
        __parseValue: (v: unknown) => v,
      },
      Query: {
        clients: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        client: () => null,
        entities: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        entity: () => null,
        assets: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        asset: () => null,
        valuations: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        documents: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        document: () => null,
        documentRequests: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        documentRequest: () => null,
        tasks: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        task: () => null,
        ledgerEvents: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        reports: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        report: () => null,
        complianceControls: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        complianceControl: () => null,
        integrations: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        integration: () => null,
        notifications: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
        me: () => null,
        org: () => null,
        orgMembers: () => [],
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers: stubResolvers })
    expect(schema).toBeDefined()
  })

  it("can execute a basic clients query against stub resolvers", async () => {
    const typeDefsArray = schemaFiles.map((file) =>
      readFileSync(join(schemaDir, file), "utf-8")
    )
    const typeDefs = mergeTypeDefs(typeDefsArray)

    const stubResolvers = {
      DateTime: {
        __serialize: (v: unknown) => v,
        __parseValue: (v: unknown) => v,
      },
      JSON: {
        __serialize: (v: unknown) => v,
        __parseValue: (v: unknown) => v,
      },
      Query: {
        clients: () => ({
          items: [
            {
              id: "client-1",
              displayName: "Alice Johnson",
              email: "alice@example.com",
              phone: null,
              clientType: "individual",
              clientStatus: "active",
              createdAt: "2024-01-15T00:00:00.000Z",
              entityCount: 2,
              assetCount: 3,
              totalAUM: 1500000,
            },
          ],
          totalCount: 1,
          page: 1,
          limit: 25,
        }),
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers: stubResolvers })
    const server = new ApolloServer({ schema })

    const response = await server.executeOperation({
      query: `
        query GetClients {
          clients {
            items {
              id
              displayName
              email
              clientType
              clientStatus
              totalAUM
            }
            totalCount
          }
        }
      `,
    })

    expect(response.body.kind).toBe("single")
    if (response.body.kind === "single") {
      expect(response.body.singleResult.errors).toBeUndefined()
      const data = response.body.singleResult.data as {
        clients: { items: Array<{ id: string; displayName: string }>; totalCount: number }
      }
      expect(data.clients.items).toHaveLength(1)
      expect(data.clients.items[0].displayName).toBe("Alice Johnson")
      expect(data.clients.totalCount).toBe(1)
    }
  })

  it("can execute a createClient mutation against stub resolvers", async () => {
    const typeDefsArray = schemaFiles.map((file) =>
      readFileSync(join(schemaDir, file), "utf-8")
    )
    const typeDefs = mergeTypeDefs(typeDefsArray)

    const stubResolvers = {
      DateTime: {
        __serialize: (v: unknown) => v,
        __parseValue: (v: unknown) => v,
      },
      JSON: {
        __serialize: (v: unknown) => v,
        __parseValue: (v: unknown) => v,
      },
      Query: {
        clients: () => ({ items: [], totalCount: 0, page: 1, limit: 25 }),
      },
      Mutation: {
        createClient: (_: unknown, args: { input: { displayName: string } }) => ({
          id: "new-client-1",
          displayName: args.input.displayName,
          email: null,
          phone: null,
          clientType: "individual",
          clientStatus: "prospect",
          createdAt: new Date().toISOString(),
          entityCount: 0,
          assetCount: 0,
          totalAUM: 0,
        }),
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers: stubResolvers })
    const server = new ApolloServer({ schema })

    const response = await server.executeOperation({
      query: `
        mutation CreateClient($input: CreateClientInput!) {
          createClient(input: $input) {
            id
            displayName
            clientType
            clientStatus
          }
        }
      `,
      variables: {
        input: { displayName: "New Client" },
      },
    })

    expect(response.body.kind).toBe("single")
    if (response.body.kind === "single") {
      expect(response.body.singleResult.errors).toBeUndefined()
      const data = response.body.singleResult.data as {
        createClient: { id: string; displayName: string; clientType: string }
      }
      expect(data.createClient.displayName).toBe("New Client")
      expect(data.createClient.clientType).toBe("individual")
    }
  })
})
