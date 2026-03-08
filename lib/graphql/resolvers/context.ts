/**
 * GraphQL Context
 *
 * Builds the context object that every resolver receives.
 * Contains the authenticated user's session (or null if not logged in).
 */
import { getSession, type AuthSession } from "@/lib/auth"

export interface GraphQLContext {
  session: AuthSession | null
}

export async function buildContext(): Promise<GraphQLContext> {
  const session = await getSession()
  return { session }
}
