/**
 * GraphQL Auth Helpers
 *
 * Reusable authentication and authorization guards for resolvers.
 * Throw GraphQLError with standard Apollo error codes.
 */
import { GraphQLError } from "graphql"
import type { AuthSession } from "@/lib/auth"
import type { GraphQLContext } from "./context"

type AuthenticatedSession = AuthSession & { orgId: string; memberId: string }

/**
 * Ensures the user is authenticated and has an org.
 * Throws UNAUTHENTICATED if not logged in or no org.
 */
export function requireAuth(ctx: GraphQLContext): AuthenticatedSession {
  if (!ctx.session || !ctx.session.orgId || !ctx.session.memberId) {
    throw new GraphQLError("Not authenticated", {
      extensions: { code: "UNAUTHENTICATED" },
    })
  }
  return ctx.session as AuthenticatedSession
}

/**
 * Ensures the user has one of the required roles.
 * Throws FORBIDDEN if the user's role is not in the allowed list.
 */
export function requireRole(
  ctx: GraphQLContext,
  roles: Array<"admin" | "assistant" | "client">
): AuthenticatedSession {
  const session = requireAuth(ctx)
  if (!roles.includes(session.role as "admin" | "assistant" | "client")) {
    throw new GraphQLError("Forbidden", {
      extensions: { code: "FORBIDDEN" },
    })
  }
  return session
}
