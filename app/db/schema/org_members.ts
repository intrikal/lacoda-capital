import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { orgMemberRoleEnum } from "./00_enums";
import { orgs } from "./orgs";
import { users } from "./users";
import { clients } from "./clients";
import { assignments } from "./assignments";

/**
 * Organization Members Junction Table
 *
 * Kevin, this is the many-to-many relationship between users and orgs.
 * Each record represents a user's membership in an org with a specific role.
 *
 * Design decisions:
 * - Composite uniqueness on (org_id, user_id) - one membership per org/user pair
 * - role enum: Type-safe role assignment
 * - client_id: If role is 'client', this links to their client record
 *
 * Why separate from users table?
 * - Users can belong to multiple orgs (e.g., consultant working with many firms)
 * - Roles are org-specific, not global
 * - Clean separation of concerns
 */
export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Foreign keys
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Role within this org
    role: orgMemberRoleEnum("role").notNull().default("client"),

    // If this member is a client, link to their client record
    // This enables the client portal experience
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    // Standard timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Enforce one membership per org/user pair
    unique("org_members_org_user_unique").on(table.orgId, table.userId),
    // Fast lookups by org (list all members of an org)
    index("org_members_org_id_idx").on(table.orgId),
    // Fast lookups by user (list all orgs a user belongs to)
    index("org_members_user_id_idx").on(table.userId),
    // Find all members with a specific role in an org
    index("org_members_org_role_idx").on(table.orgId, table.role),
  ]
);

/**
 * Org Members Relations (JUNCTION TABLE: User ↔ Org Many-to-Many)
 *
 * Kevin, org_members is a JUNCTION TABLE for the User ↔ Org relationship.
 * But it's also MORE than a simple junction - it carries extra data (role, client link).
 *
 * MANY-TO-MANY PATTERN (User ↔ Org):
 *
 *   Users ◄────────────────────► Orgs
 *          \                    /
 *           \                  /
 *            ► OrgMembers ◄───
 *              (junction)
 *              + role
 *              + client_id
 *
 * WHY THIS TABLE EXISTS:
 *   - A user can work at MULTIPLE orgs (consultant pattern)
 *   - A user has DIFFERENT roles at different orgs
 *   - The role determines what they can do in THAT org
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL MINI-LESSON:                                                    │
 *   │                                                                     │
 *   │ SELECT * FROM orgs WHERE id = member.org_id                         │
 *   │   ▲      ▲   ▲     ▲     ▲                                         │
 *   │   │      │   │     │     └─ "the value must match member's org_id"  │
 *   │   │      │   │     └─ "filter rows WHERE this condition is true"    │
 *   │   │      │   └─ "look in the orgs table"                            │
 *   │   │      └─ "give me ALL columns" (* = everything)                  │
 *   │   └─ "fetch data from the database"                                 │
 *   │                                                                     │
 *   │ In plain English: "Go to the orgs table. Find the row whose id     │
 *   │ matches this member's org_id. Give me all its columns."             │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each org_member:
 *     member.org     → "Find the ONE org this member belongs to"
 *                      SELECT * FROM orgs WHERE id = member.org_id
 *     member.user    → "Find the ONE user this member IS"
 *                      SELECT * FROM users WHERE id = member.user_id
 *     member.client  → "Find the ONE client record (if role is 'client')"
 *                      SELECT * FROM clients WHERE id = member.client_id
 *     member.assignmentsAsAssistant → "Find ALL clients assigned to this member"
 *                                     SELECT * FROM assignments WHERE assistant_member_id = member.id
 *
 * QUERY EXAMPLE - Get all orgs for a user:
 *   const user = await db.query.users.findFirst({
 *     where: eq(users.id, userId),
 *     with: {
 *       orgMemberships: {        // many() defined in users.ts
 *         with: {
 *           org: true,           // one() defined here
 *         },
 *       },
 *     },
 *   });
 *   const orgs = user.orgMemberships.map(m => m.org);
 */
export const orgMembersRelations = relations(orgMembers, ({ one, many }) => ({
  /**
   * ONE relationship: Member belongs to ONE Org
   *
   * one(orgs, { ... }) means:
   *   - "This membership is for exactly ONE org"
   *   - fields: FK on this table (org_members.org_id)
   *   - references: PK on orgs table (orgs.id)
   *
   * SQL: SELECT * FROM orgs WHERE id = org_member.org_id
   */
  org: one(orgs, {
    fields: [orgMembers.orgId],   // FK column on THIS table
    references: [orgs.id],        // PK column on orgs
  }),

  /**
   * ONE relationship: Member IS ONE User
   *
   * one(users, { ... }) means:
   *   - "This membership represents exactly ONE user"
   *   - fields: FK on this table (org_members.user_id)
   *   - references: PK on users table (users.id)
   *
   * SQL: SELECT * FROM users WHERE id = org_member.user_id
   */
  user: one(users, {
    fields: [orgMembers.userId],  // FK column on THIS table
    references: [users.id],       // PK column on users
  }),

  /**
   * ONE relationship: Member MAY BE linked to ONE Client (OPTIONAL)
   *
   * one(clients, { ... }) means:
   *   - "If role='client', this links to their client record"
   *   - client_id can be NULL (for admin/assistant roles)
   *   - Enables: "Show me my portfolio" for client portal users
   *
   * SQL: SELECT * FROM clients WHERE id = org_member.client_id
   */
  client: one(clients, {
    fields: [orgMembers.clientId],  // FK column (nullable)
    references: [clients.id],       // PK column on clients
  }),

  /**
   * MANY relationship: Member (as assistant) has MANY Assignments
   *
   * many(assignments) means:
   *   - "This member can be assigned to multiple clients"
   *   - Part of the Assistant ↔ Client many-to-many
   *   - FK (assistant_member_id) is on assignments table
   *
   * SQL: SELECT * FROM assignments WHERE assistant_member_id = org_member.id
   */
  assignmentsAsAssistant: many(assignments),
}));

// Type exports
export type OrgMember = typeof orgMembers.$inferSelect;
export type NewOrgMember = typeof orgMembers.$inferInsert;
