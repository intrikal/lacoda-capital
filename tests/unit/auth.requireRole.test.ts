/**
 * ============================================================================
 * TEST FILE: auth.requireRole.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the requireRole() function from lib/auth.ts.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT DOES THIS TEST CHECK?                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ requireRole(minimumRole) is a "bouncer" function. Given a minimum     │
 * │ required role, it should:                                              │
 * │                                                                         │
 * │   ✓ Allow users whose role meets or exceeds the minimum               │
 * │   ✓ Redirect "viewer" (pending/client) users trying to reach /app      │
 * │   ✓ Allow admin to access assistant-level pages                        │
 * │   ✓ Redirect unauthenticated users to /login                          │
 * │   ✓ Redirect users with no org membership to /onboarding              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ROLE HIERARCHY (lowest → highest):
 *   pending < client < assistant < admin
 *
 * RUN THIS TEST:
 *   npx vitest run --project unit tests/unit/auth.requireRole.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * vi.mock() — replaces a module with a fake version.
 *
 * WHAT: We mock three modules that requireRole() depends on:
 *   1. @/utils/supabase/server — so we don't need a real Supabase connection
 *   2. @/app/db                — so we don't need a real PostgreSQL database
 *   3. next/navigation         — so redirect() throws a special error we can catch
 *
 * WHY: Unit tests should test ONE thing in isolation. If we used a real
 * database and Supabase, a failing test could be caused by network issues,
 * wrong credentials, or missing test data — not the logic we're testing.
 */
vi.mock("@/utils/supabase/server")
vi.mock("@/app/db")
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    // Simulate Next.js redirect() by throwing an error.
    // In real Next.js, redirect() throws a special NEXT_REDIRECT error
    // that bubbles up and changes the browser's URL.
    // We throw a plain Error here so we can catch it in tests.
    throw new Error(`REDIRECT:${path}`)
  }),
}))

// Import AFTER mocking so the mocked versions are used
import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { db } from "@/app/db"

// ─── Helper: build a fake AuthSession ────────────────────────────────────────

/**
 * mockSession() — creates a fake user session for testing.
 *
 * Rather than calling the real Supabase API, we return a hand-crafted
 * object that looks exactly like a real AuthSession.
 */
function mockSupabaseUser(userId = "user-123", email = "test@example.com") {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email } },
      }),
    },
  }
  vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
}

function mockSupabaseNoUser() {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
      }),
    },
  }
  vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
}

/**
 * mockOrgMembership() — pretends the DB returned an org_members row.
 */
function mockOrgMembership(
  role: "admin" | "assistant" | "client" | "pending",
  orgId = "org-abc"
) {
  vi.mocked(db).query = {
    orgMembers: {
      findFirst: vi.fn().mockResolvedValue({
        id: "member-1",
        orgId,
        role,
        userId: "user-123",
      }),
    },
  } as never
}

/**
 * mockNoOrgMembership() — pretends the user has no org (new signup).
 */
function mockNoOrgMembership() {
  vi.mocked(db).query = {
    orgMembers: {
      findFirst: vi.fn().mockResolvedValue(undefined),
    },
  } as never
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("requireRole()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Block: viewer (client role) accessing admin-only page ──────────────────

  /**
   * THE CORE TEST mentioned in the spec:
   * "requireRole('admin') throws for 'viewer' user"
   *
   * A user with role="client" should be redirected when they try to
   * access a page that requires role="admin".
   *
   * "Throws" here means redirect() is called — in Next.js, redirect()
   * throws a special error internally. We catch it and check the path.
   */
  it("redirects a client (viewer) user away from an admin page", async () => {
    mockSupabaseUser()
    mockOrgMembership("client")

    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/client")
  })

  it("redirects a pending user away from an admin page", async () => {
    mockSupabaseUser()
    mockOrgMembership("pending")

    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/unauthorized")
  })

  it("redirects a pending user away from an assistant page", async () => {
    mockSupabaseUser()
    mockOrgMembership("pending")

    await expect(requireRole("assistant")).rejects.toThrow(
      "REDIRECT:/unauthorized"
    )
  })

  it("redirects a client user away from an assistant page", async () => {
    mockSupabaseUser()
    mockOrgMembership("client")

    await expect(requireRole("assistant")).rejects.toThrow("REDIRECT:/client")
  })

  // ── Allow: sufficient role ─────────────────────────────────────────────────

  it("allows an admin user to access an admin page", async () => {
    mockSupabaseUser()
    mockOrgMembership("admin")

    const session = await requireRole("admin")
    expect(session.role).toBe("admin")
    expect(session.orgId).toBe("org-abc")
  })

  it("allows an admin user to access an assistant page (higher rank passes)", async () => {
    mockSupabaseUser()
    mockOrgMembership("admin")

    const session = await requireRole("assistant")
    expect(session.role).toBe("admin")
  })

  it("allows an assistant user to access an assistant page", async () => {
    mockSupabaseUser()
    mockOrgMembership("assistant")

    const session = await requireRole("assistant")
    expect(session.role).toBe("assistant")
  })

  it("allows a client user to access a client page", async () => {
    mockSupabaseUser()
    mockOrgMembership("client")

    const session = await requireRole("client")
    expect(session.role).toBe("client")
  })

  // ── Edge: unauthenticated user ─────────────────────────────────────────────

  /**
   * TEST: Not logged in → redirect to /login
   *
   * If Supabase returns no user (expired session, never logged in),
   * requireRole() should redirect to /login.
   */
  it("redirects an unauthenticated user to /login", async () => {
    mockSupabaseNoUser()

    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/login")
  })

  // ── Edge: user with no org membership ─────────────────────────────────────

  /**
   * TEST: New signup with no org → redirect to /onboarding
   *
   * A freshly registered user exists in Supabase auth but hasn't
   * been assigned to an org yet. They should go to /onboarding.
   */
  it("redirects a user with no org membership to /onboarding", async () => {
    mockSupabaseUser()
    mockNoOrgMembership()

    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/onboarding")
  })

  // ── Return value shape ────────────────────────────────────────────────────

  it("returns orgId and memberId as non-null strings when access is granted", async () => {
    mockSupabaseUser()
    mockOrgMembership("admin", "org-xyz")

    const session = await requireRole("admin")
    expect(typeof session.orgId).toBe("string")
    expect(typeof session.memberId).toBe("string")
  })
})
