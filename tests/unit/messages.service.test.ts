/**
 * ============================================================================
 * TEST FILE: messages.service.test.ts
 * ============================================================================
 *
 * Kevin, this tests the messages service which reads from the `conversations`
 * and `messages` DB tables.
 *
 * Query chain patterns:
 *   getConversations           → .from().where(isNull).orderBy(desc)   terminal: orderBy
 *   getConversationById        → .from().where(eq)                     terminal: where
 *   getMessagesByConversation  → .from().where(eq).orderBy(asc)        terminal: orderBy
 *   getUnreadMessageCount      → .from().where(isNull)                 terminal: where
 *                                (selects sum() — resolves to [{total}])
 *
 * RELATED FILES:
 *   lib/services/messages.service.ts  — service under test
 *   app/db/schema/conversations.ts    — conversations + messages tables
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/app/db", () => ({
  db: { select: vi.fn() },
}))

import { db } from "@/app/db"
import {
  getConversations,
  getConversationById,
  getMessagesByConversation,
  getUnreadMessageCount,
} from "@/lib/services/messages.service"

// ============================================================================
// HELPERS
// ============================================================================

function makeChain(terminal: string, value: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  }
  chain[terminal] = vi.fn().mockResolvedValue(value)
  return chain
}

function makeConversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv-001",
    name: "James Blackwood",
    type: "direct",
    lastMessage: "Thank you for the update.",
    lastMessageAt: new Date("2024-01-20T15:00:00Z"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
    unreadCount: 2,
    deletedAt: null,
    ...overrides,
  }
}

function makeMessageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-001",
    conversationId: "conv-001",
    senderId: "user-advisor-001",
    senderType: "advisor",
    content: "Good morning! Here is your portfolio update.",
    createdAt: new Date("2024-01-20T09:00:00Z"),
    read: true,
    metadata: {},
    ...overrides,
  }
}

// ============================================================================
// 1. toConversation — DB row to Conversation mapping
// ============================================================================

describe("toConversation — DB row to Conversation mapping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps required fields correctly", async () => {
    const row = makeConversationRow()
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const convs = await getConversations()
    const conv = convs[0]

    expect(conv.id).toBe("conv-001")
    expect(conv.name).toBe("James Blackwood")
    expect(conv.type).toBe("direct")
    expect(conv.lastMessage).toBe("Thank you for the update.")
    expect(conv.unread).toBe(2)
  })

  it("timestamp uses lastMessageAt when present", async () => {
    const row = makeConversationRow({ lastMessageAt: new Date("2024-01-20T15:00:00Z") })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const convs = await getConversations()
    expect(convs[0].timestamp).toBe("2024-01-20T15:00:00.000Z")
  })

  it("timestamp falls back to createdAt when lastMessageAt is null", async () => {
    const row = makeConversationRow({ lastMessageAt: null, createdAt: new Date("2024-01-01T00:00:00Z") })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const convs = await getConversations()
    expect(convs[0].timestamp).toBe("2024-01-01T00:00:00.000Z")
  })

  it("generates avatar initials from name (first two words)", async () => {
    const row = makeConversationRow({ name: "James Blackwood" })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const convs = await getConversations()
    expect(convs[0].avatar).toBe("JB")
  })

  it("maps null lastMessage to empty string", async () => {
    const row = makeConversationRow({ lastMessage: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const convs = await getConversations()
    expect(convs[0].lastMessage).toBe("")
  })

  it("online is always false (not tracked in DB)", async () => {
    const row = makeConversationRow()
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const convs = await getConversations()
    expect(convs[0].online).toBe(false)
  })
})

// ============================================================================
// 2. getConversations
// ============================================================================

describe("getConversations", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no conversations exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const convs = await getConversations()
    expect(convs).toEqual([])
  })

  it("returns all rows from the DB", async () => {
    const rows = [
      makeConversationRow({ id: "c1" }),
      makeConversationRow({ id: "c2" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const convs = await getConversations()
    expect(convs).toHaveLength(2)
  })

  it("applies deletedAt IS NULL filter", async () => {
    const chain = makeChain("orderBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getConversations()
    expect(chain.where).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("orderBy", [])
    chain.orderBy.mockRejectedValue(new Error("DB timeout"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getConversations()).rejects.toThrow("DB timeout")
  })
})

// ============================================================================
// 3. getConversationById
// ============================================================================

describe("getConversationById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns mapped Conversation when found", async () => {
    const row = makeConversationRow({ id: "conv-007" })
    vi.mocked(db.select).mockReturnValue(makeChain("where", [row]) as never)

    const conv = await getConversationById("conv-007")
    expect(conv).toBeDefined()
    expect(conv!.id).toBe("conv-007")
  })

  it("returns undefined when not found", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const conv = await getConversationById("no-such-id")
    expect(conv).toBeUndefined()
  })
})

// ============================================================================
// 4. toMessage — DB row to Message mapping (tested via getMessagesByConversation)
// ============================================================================

describe("toMessage — DB row to Message mapping", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps required message fields correctly", async () => {
    const row = makeMessageRow()
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const messages = await getMessagesByConversation("conv-001")
    const msg = messages[0]

    expect(msg.id).toBe("msg-001")
    expect(msg.conversationId).toBe("conv-001")
    expect(msg.sender).toBe("user-advisor-001")
    expect(msg.senderType).toBe("advisor")
    expect(msg.content).toBe("Good morning! Here is your portfolio update.")
    expect(msg.read).toBe(true)
  })

  it("converts createdAt Date to ISO string", async () => {
    const row = makeMessageRow({ createdAt: new Date("2024-01-20T09:00:00Z") })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const messages = await getMessagesByConversation("conv-001")
    expect(messages[0].timestamp).toBe("2024-01-20T09:00:00.000Z")
  })

  it("maps null senderId to system", async () => {
    const row = makeMessageRow({ senderId: null })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const messages = await getMessagesByConversation("conv-001")
    expect(messages[0].sender).toBe("system")
  })

  it("maps metadata.attachments to attachments field", async () => {
    const attachments = [{ name: "report.pdf", url: "/files/report.pdf" }]
    const row = makeMessageRow({ metadata: { attachments } })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const messages = await getMessagesByConversation("conv-001")
    expect(messages[0].attachments).toEqual(attachments)
  })

  it("maps null/missing metadata to undefined attachments", async () => {
    const row = makeMessageRow({ metadata: {} })
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", [row]) as never)

    const messages = await getMessagesByConversation("conv-001")
    expect(messages[0].attachments).toBeUndefined()
  })
})

// ============================================================================
// 5. getMessagesByConversation
// ============================================================================

describe("getMessagesByConversation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no messages exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", []) as never)

    const messages = await getMessagesByConversation("conv-001")
    expect(messages).toEqual([])
  })

  it("returns all messages for the conversation", async () => {
    const rows = [
      makeMessageRow({ id: "m1" }),
      makeMessageRow({ id: "m2" }),
      makeMessageRow({ id: "m3" }),
    ]
    vi.mocked(db.select).mockReturnValue(makeChain("orderBy", rows) as never)

    const messages = await getMessagesByConversation("conv-001")
    expect(messages).toHaveLength(3)
  })

  it("applies where filter for conversationId", async () => {
    const chain = makeChain("orderBy", [])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getMessagesByConversation("conv-001")
    expect(chain.where).toHaveBeenCalled()
  })
})

// ============================================================================
// 6. getUnreadMessageCount
// ============================================================================

describe("getUnreadMessageCount", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns the summed unreadCount as a number", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", [{ total: "7" }]) as never)

    const count = await getUnreadMessageCount()
    expect(count).toBe(7)
  })

  it("returns 0 when sum result is null", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", [{ total: null }]) as never)

    const count = await getUnreadMessageCount()
    expect(count).toBe(0)
  })

  it("returns 0 when no conversations exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain("where", []) as never)

    const count = await getUnreadMessageCount()
    expect(count).toBe(0)
  })

  it("applies the deletedAt IS NULL filter", async () => {
    const chain = makeChain("where", [{ total: "0" }])
    vi.mocked(db.select).mockReturnValue(chain as never)

    await getUnreadMessageCount()
    expect(chain.where).toHaveBeenCalled()
  })

  it("propagates DB errors", async () => {
    const chain = makeChain("where", [])
    chain.where.mockRejectedValue(new Error("Connection refused"))
    vi.mocked(db.select).mockReturnValue(chain as never)

    await expect(getUnreadMessageCount()).rejects.toThrow("Connection refused")
  })
})
