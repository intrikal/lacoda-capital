import { eq, and, count } from "drizzle-orm"
import { GraphQLError } from "graphql"
import { db } from "@/app/db"
import { orgs, orgMembers, clients, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "./auth"
import { inviteOrgMemberSchema, updateOrgMemberRoleSchema } from "@/lib/validations/org.schema"
import type { GraphQLContext } from "./context"

export const orgResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.orgMembers.findFirst({
        where: eq(orgMembers.id, session.memberId),
      })
    },

    org: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const session = requireAuth(ctx)
      return db.query.orgs.findFirst({
        where: eq(orgs.id, session.orgId),
      })
    },

    orgMembers: async (
      _: unknown,
      args: { page?: number; limit?: number },
      ctx: GraphQLContext
    ) => {
      const session = requireAuth(ctx)
      const page = args.page ?? 1
      const limit = Math.min(args.limit ?? 25, 100)
      const offset = (page - 1) * limit

      const where = eq(orgMembers.orgId, session.orgId)
      const [items, [{ total }]] = await Promise.all([
        db.select().from(orgMembers).where(where).orderBy(orgMembers.createdAt).limit(limit).offset(offset),
        db.select({ total: count() }).from(orgMembers).where(where),
      ])

      return { items, totalCount: total, page, limit }
    },
  },

  Org: {
    members: async (parent: { id: string }) => {
      return db.query.orgMembers.findMany({ where: eq(orgMembers.orgId, parent.id) })
    },
    clients: async (parent: { id: string }) => {
      return db.query.clients.findMany({ where: eq(clients.orgId, parent.id) })
    },
    integrations: async (parent: { id: string }) => {
      const { integrations } = await import("@/app/db/schema")
      return db.query.integrations.findMany({ where: eq(integrations.orgId, parent.id) })
    },
    clientCount: async (parent: { id: string }) => {
      const [{ total }] = await db.select({ total: count() }).from(clients).where(eq(clients.orgId, parent.id))
      return total
    },
    memberCount: async (parent: { id: string }) => {
      const [{ total }] = await db.select({ total: count() }).from(orgMembers).where(eq(orgMembers.orgId, parent.id))
      return total
    },
  },

  OrgMember: {
    org: async (parent: { orgId: string }) => {
      return db.query.orgs.findFirst({ where: eq(orgs.id, parent.orgId) })
    },
    user: async (parent: { userId: string }) => {
      return db.query.users.findFirst({ where: eq(users.id, parent.userId) })
    },
    client: async (parent: { clientId: string | null }) => {
      if (!parent.clientId) return null
      return db.query.clients.findFirst({ where: eq(clients.id, parent.clientId) })
    },
    assignmentsAsAssistant: async (parent: { id: string }) => {
      const { assignments } = await import("@/app/db/schema")
      return db.query.assignments.findMany({ where: eq(assignments.assistantMemberId, parent.id) })
    },
  },

  Mutation: {
    /** Invite a member by email. Creates org_member row (user must already exist). */
    inviteOrgMember: async (
      _: unknown,
      args: { input: { email: string; role: string; clientId?: string | null } },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const input = inviteOrgMemberSchema.parse(args.input)

      // Look up user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      })
      if (!user) {
        throw new GraphQLError("No user found with that email", {
          extensions: { code: "NOT_FOUND" },
        })
      }

      // Check if already a member
      const existing = await db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.orgId, session.orgId),
          eq(orgMembers.userId, user.id),
        ),
      })
      if (existing) {
        throw new GraphQLError("User is already a member of this organization", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      }

      const [created] = await db
        .insert(orgMembers)
        .values({
          orgId: session.orgId,
          userId: user.id,
          role: input.role,
          clientId: input.clientId ?? null,
        })
        .returning()

      return created
    },

    /** Update a member's role within the org. */
    updateOrgMemberRole: async (
      _: unknown,
      args: { id: string; input: { role: string; clientId?: string | null } },
      ctx: GraphQLContext
    ) => {
      const session = requireRole(ctx, ["admin"])
      const input = updateOrgMemberRoleSchema.parse(args.input)

      // Verify member belongs to this org
      const existing = await db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.id, args.id),
          eq(orgMembers.orgId, session.orgId),
        ),
      })
      if (!existing) {
        throw new GraphQLError("Member not found", {
          extensions: { code: "NOT_FOUND" },
        })
      }

      // Prevent demoting yourself
      if (existing.id === session.memberId && input.role !== "admin") {
        throw new GraphQLError("Cannot change your own role", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      }

      const [updated] = await db
        .update(orgMembers)
        .set({ role: input.role, clientId: input.clientId ?? existing.clientId })
        .where(eq(orgMembers.id, args.id))
        .returning()

      return updated
    },

    /** Remove a member from the org. */
    removeOrgMember: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const session = requireRole(ctx, ["admin"])

      const existing = await db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.id, args.id),
          eq(orgMembers.orgId, session.orgId),
        ),
      })
      if (!existing) {
        throw new GraphQLError("Member not found", {
          extensions: { code: "NOT_FOUND" },
        })
      }

      // Prevent removing yourself
      if (existing.id === session.memberId) {
        throw new GraphQLError("Cannot remove yourself from the organization", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      }

      await db.delete(orgMembers).where(eq(orgMembers.id, args.id))
      return true
    },
  },
}
