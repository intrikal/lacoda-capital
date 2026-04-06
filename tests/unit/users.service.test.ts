/**
 * ============================================================================
 * TEST FILE: users.service.test.ts
 * ============================================================================
 *
 * Kevin, this tests the users service which reads from the `users` and
 * `orgMembers` tables.
 *
 * Query chain patterns:
 *   getCurrentUser    → .from(users).where(eq id)           terminal: where
 *                       + fallback .from(users).limit(1)    terminal: limit
 *   getUsers          → .from(users).where(isNull)          terminal: where
 *   getUserById       → .from(users).where(eq id)           terminal: where
 *   getUsersByRole    → .from(users).innerJoin(...).where()  terminal: where
 *   getActiveUsers    → .from(users).where(isNull)          terminal: where
 *
 * RELATED FILES:
 *   lib/services/users.service.ts   — service under test
 *   app/db/schema/users.ts          — users table
 *   app/db/schema/org_members.ts    — orgMembers table (role column)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/app/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/app/db"
import {
  getCurrentUser,
  getUsers,
  getUserById,
  getUsersByRole,
  getActiveUsers,
} from "@/lib/services/users.service"

// ============================================================================
// HELPERS
// ============================================================================

function makeChain(terminal: string, value: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  }
  chain[terminal] = vi.fn().mockResolvedValue(value)
  return chain
}

function makeUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-001",
    fullName: "Alice Advisor",
    email: "alice@lacoda.com",
    avatarUrl: null,
    updatedAt: new Date("2024-01-10T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  }
}

function makeOrgMemberRow(user: ReturnType<typeof makeUserRow>, role = "analyst") {
  return { user, role }
}

// ============================================================================
// 1. toUser — DB row to User mapping (tested via getUsers)
// ============================================================================

describe("toUser — DB row to User mapping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps required fields correctly", async () => {
    const row = makeUserRow()
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const users = await getUsers()
    const user = users[0]

    expect(user.id).toBe("user-001")
    expect(user.name).toBe("Alice Advisor")
    expect(user.email).toBe("alice@lacoda.com")
  })

  it("falls back to email for name when fullName is null", async () => {
    const row = makeUserRow({ fullName: null })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const users = await getUsers()
    expect(users[0].name).toBe("alice@lacoda.com")
  })

  it("maps null avatarUrl to undefined", async () => {
    const row = makeUserRow({ avatarUrl: null })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const users = await getUsers()
    expect(users[0].avatar).toBeUndefined()
  })

  it("lastLogin is updatedAt as ISO string", async () => {
    const row = makeUserRow({ updatedAt: new Date("2024-01-10T00:00:00Z") })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const users = await getUsers()
    expect(users[0].lastLogin).toBe("2024-01-10T00:00:00.000Z")
  })

  it("status is active when deletedAt is null", async () => {
    const row = makeUserRow({ deletedAt: null })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const users = await getUsers()
    expect(users[0].status).toBe("active")
  })

  it("status is inactive when deletedAt is set", async () => {
    const row = makeUserRow({ deletedAt: new Date("2024-01-05T00:00:00Z") })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const users = await getUsers()
    expect(users[0].status).toBe("inactive")
  })

  it("mfaEnabled is always false (not tracked in DB)", async () => {
    const row = makeUserRow()
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const users = await getUsers()
    expect(users[0].mfaEnabled).toBe(false)
  })

  it("role defaults to viewer when not provided", async () => {
    const row = makeUserRow()
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const users = await getUsers()
    expect(users[0].role).toBe("viewer")
  })
})

// ============================================================================
// 2. getCurrentUser
// ============================================================================

describe("getCurrentUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns the user when the demo user id is found", async () => {
    const row = makeUserRow({ id: "user-001" })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const user = await getCurrentUser()
    expect(user.id).toBe("user-001")
  })

  it("falls back to limit(1) when demo user id is not found", async () => {
    // First call: empty (demo user not found)
    // Second call: fallback first user
    const fallbackRow = makeUserRow({ id: "user-999" })
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain("where", []) as never)
      .mockReturnValueOnce(makeChain("limit", [fallbackRow]) as never)

    const user = await getCurrentUser()
    expect(user.id).toBe("user-999")
  })

  it("applies where filter for user id lookup", async () => {
    const chain = makeChain("where", [makeUserRow()])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getCurrentUser()
    expect(chain.where).toHaveBeenCalled()
  })
})

// ============================================================================
// 3. getUsers
// ============================================================================

describe("getUsers", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no users exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const users = await getUsers()
    expect(users).toEqual([])
  })

  it("returns all non-deleted users", async () => {
    const rows = [makeUserRow({ id: "u1" }), makeUserRow({ id: "u2" })]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const users = await getUsers()
    expect(users).toHaveLength(2)
  })

  it("applies deletedAt IS NULL filter", async () => {
    const chain = makeChain("where", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getUsers()
    expect(chain.where).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("where", [])
    chain.where.mockRejectedValue(new Error("Connection refused"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getUsers()).rejects.toThrow("Connection refused")
  })
})

// ============================================================================
// 4. getUserById
// ============================================================================

describe("getUserById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns mapped User when found", async () => {
    const row = makeUserRow({ id: "user-007" })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const user = await getUserById("user-007")
    expect(user).toBeDefined()
    expect(user!.id).toBe("user-007")
  })

  it("returns undefined when not found", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const user = await getUserById("no-such-user")
    expect(user).toBeUndefined()
  })
})

// ============================================================================
// 5. getUsersByRole
// ============================================================================

describe("getUsersByRole", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns users with the given role", async () => {
    const rows = [
      makeOrgMemberRow(makeUserRow({ id: "u1" }), "analyst"),
      makeOrgMemberRow(makeUserRow({ id: "u2" }), "analyst"),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const users = await getUsersByRole("analyst")
    expect(users).toHaveLength(2)
    for (const u of users) {
      expect(u.role).toBe("analyst")
    }
  })

  it("returns empty array when no users have that role", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const users = await getUsersByRole("admin")
    expect(users).toEqual([])
  })

  it("uses innerJoin on orgMembers", async () => {
    const chain = makeChain("where", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getUsersByRole("analyst")
    expect(chain.innerJoin).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("where", [])
    chain.where.mockRejectedValue(new Error("Query failed"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getUsersByRole("analyst")).rejects.toThrow("Query failed")
  })
})

// ============================================================================
// 6. getActiveUsers
// ============================================================================

describe("getActiveUsers", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns active (non-deleted) users", async () => {
    const rows = [makeUserRow({ id: "u1" }), makeUserRow({ id: "u2" })]
    vi.mocked(db.select).mockReturnValue(makeChain("where", rows) as never)

    const users = await getActiveUsers()
    expect(users).toHaveLength(2)
  })

  it("returns empty array when no active users", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const users = await getActiveUsers()
    expect(users).toEqual([])
  })

  it("applies the deletedAt IS NULL filter", async () => {
    const chain = makeChain("where", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getActiveUsers()
    expect(chain.where).toHaveBeenCalled()
  })
})
