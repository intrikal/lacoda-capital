import { eq, and } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { assignments, orgMembers, clients } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { createAssignmentSchema } from "@/lib/validations/assignment.schema"
import type { GraphQLContext } from "./context"

export const assignmentResolvers = {
  Query: {
    assignments: async (
      _: unknown,
      args: { clientId?: string; assistantMemberId?: string },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)

      const conditions = [
        eq(assignments.clientId, assignments.clientId), // placeholder for join filter
      ]
      if (args.clientId) conditions.push(eq(assignments.clientId, args.clientId))
      if (args.assistantMemberId) conditions.push(eq(assignments.assistantMemberId, args.assistantMemberId))

      // Fetch assignments and filter by org
      const results = await db.query.assignments.findMany({
        where: args.clientId || args.assistantMemberId ? and(...conditions) : undefined,
        with: { client: true, assistant: true },
      })

      return results.filter(
        (a) => (a.client as { orgId: string }).orgId === session.orgId
      )
    },
  },

  Mutation: {
    createAssignment: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const parsed = createAssignmentSchema.parse(args.input)

      // Verify both belong to org
      const member = await db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.id, parsed.assistantMemberId), eq(orgMembers.orgId, session.orgId)),
      })
      if (!member) throw new GraphQLError("Member not found", { extensions: { code: "NOT_FOUND" } })

      const client = await db.query.clients.findFirst({
        where: and(eq(clients.id, parsed.clientId), eq(clients.orgId, session.orgId)),
      })
      if (!client) throw new GraphQLError("Client not found", { extensions: { code: "NOT_FOUND" } })

      const [created] = await db.insert(assignments).values(parsed).returning()
      return created
    },

    deleteAssignment: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])
      const existing = await db.query.assignments.findFirst({
        where: eq(assignments.id, args.id),
        with: { client: true },
      })
      if (!existing || (existing.client as { orgId: string }).orgId !== session.orgId) {
        throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } })
      }
      await db.delete(assignments).where(eq(assignments.id, args.id))
      return true
    },
  },

  Assignment: {
    assistant: async (parent: { assistantMemberId: string }) => {
      return db.query.orgMembers.findFirst({ where: eq(orgMembers.id, parent.assistantMemberId) })
    },
    client: async (parent: { clientId: string }) => {
      return db.query.clients.findFirst({ where: eq(clients.id, parent.clientId) })
    },
  },
}
