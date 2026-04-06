"use server"

import { eq, and, desc, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { expenses } from "@/app/db/schema"
import { requireAdvisor } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { captureServerEvent } from "@/lib/analytics/posthog-server"
import type { NewExpense, Expense } from "@/app/db/schema"

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateExpenseInput = Omit<
  NewExpense,
  "id" | "orgId" | "createdBy" | "createdAt" | "updatedAt" | "deletedAt"
>

export type UpdateExpenseInput = Partial<
  Omit<NewExpense, "id" | "orgId" | "createdBy" | "createdAt" | "updatedAt">
>

export type ExpenseSummary = {
  totalPaid: number
  totalPending: number
  totalOverdue: number
  countByCategory: Record<string, number>
  amountByCategory: Record<string, number>
}

// ─── Queries ───────────────────────────────────────────────────────────────���─

/**
 * List all active (non-deleted) expenses for the org.
 * Optionally filter by assetId or clientId.
 */
export async function listExpenses(filters?: {
  assetId?: string
  clientId?: string
  entityId?: string
  status?: Expense["status"]
}): Promise<Expense[]> {
  const session = await requireAdvisor()

  const conditions = [
    eq(expenses.orgId, session.orgId),
    isNull(expenses.deletedAt),
  ]

  if (filters?.assetId) conditions.push(eq(expenses.assetId, filters.assetId))
  if (filters?.clientId) conditions.push(eq(expenses.clientId, filters.clientId))
  if (filters?.entityId) conditions.push(eq(expenses.entityId, filters.entityId))
  if (filters?.status) conditions.push(eq(expenses.status, filters.status))

  return db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.date))
}

/**
 * Aggregate expense totals for the org dashboard.
 */
export async function getExpenseSummary(): Promise<ExpenseSummary> {
  const session = await requireAdvisor()

  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.orgId, session.orgId), isNull(expenses.deletedAt)))

  const summary: ExpenseSummary = {
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    countByCategory: {},
    amountByCategory: {},
  }

  for (const row of rows) {
    const amount = parseFloat(row.amount ?? "0")
    if (row.status === "paid") summary.totalPaid += amount
    else if (row.status === "pending") summary.totalPending += amount
    else if (row.status === "overdue") summary.totalOverdue += amount

    const cat = row.category
    summary.countByCategory[cat] = (summary.countByCategory[cat] ?? 0) + 1
    summary.amountByCategory[cat] = (summary.amountByCategory[cat] ?? 0) + amount
  }

  return summary
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createExpense(
  input: CreateExpenseInput
): Promise<Expense> {
  const session = await requireAdvisor()

  const [expense] = await db
    .insert(expenses)
    .values({
      ...input,
      orgId: session.orgId,
      createdBy: session.userId,
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "created",
    targetType: "org",
    targetId: expense.id,
    metadata: { type: "expense", category: expense.category, amount: expense.amount },
  })

  captureServerEvent(session.userId, "expense.created", {
    org_id: session.orgId,
    category: expense.category,
  })

  return expense
}

export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput
): Promise<Expense> {
  const session = await requireAdvisor()

  const [updated] = await db
    .update(expenses)
    .set(input)
    .where(and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)))
    .returning()

  if (!updated) throw new Error("Expense not found")

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: expenseId,
    metadata: { type: "expense", changes: Object.keys(input) },
  })

  return updated
}

export async function markExpensePaid(expenseId: string): Promise<Expense> {
  return updateExpense(expenseId, {
    status: "paid",
    paidAt: new Date(),
  })
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const session = await requireAdvisor()

  await db
    .update(expenses)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "deleted",
    targetType: "org",
    targetId: expenseId,
    metadata: { type: "expense" },
  })
}
