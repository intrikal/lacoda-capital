/**
 * GraphQL API Route Handler
 *
 * Mounts Apollo Server 4 as a Next.js Route Handler at /api/graphql.
 * All GraphQL queries and mutations go through this single endpoint.
 */
import { ApolloServer } from "@apollo/server"
import { startServerAndCreateNextHandler } from "@as-integrations/next"
import { typeDefs } from "@/lib/graphql/schema"
import { resolvers } from "@/lib/graphql/resolvers"
import { buildContext } from "@/lib/graphql/resolvers/context"

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== "production",
})

const handler = startServerAndCreateNextHandler(server, {
  context: async () => buildContext(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GET = handler as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const POST = handler as any
