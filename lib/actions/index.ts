"use server"

import type { ZodSchema } from "zod"

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * ActionSuccess — returned when a server action succeeds.
 * `data` contains the result returned by the handler.
 */
export type ActionSuccess<T> = { success: true; data: T }

/**
 * ActionError — returned when a server action fails.
 * `error` is a human-readable message safe to display in the UI.
 * `fieldErrors` contains per-field Zod validation errors (optional).
 */
export type ActionError = {
  success: false
  error: string
  fieldErrors?: Record<string, string[]>
}

/** Union result type returned by every server action. */
export type ActionResult<T> = ActionSuccess<T> | ActionError

// ─── createServerAction ───────────────────────────────────────────────────────

/**
 * createServerAction — Factory that wraps a server-side handler with
 * Zod input validation and standardised error handling.
 *
 * Pattern:
 *   export const createThing = createServerAction(
 *     createThingSchema,
 *     async (input, session) => {
 *       // input is fully typed and validated
 *       const [row] = await db.insert(things).values({ ...input, orgId: session.orgId }).returning()
 *       return row
 *     }
 *   )
 *
 * On the client, call the action and inspect the result:
 *   const result = await createThing(formData)
 *   if (!result.success) toast.error(result.error)
 *   else setItems((prev) => [...prev, result.data])
 *
 * @param schema  — Zod schema used to parse and validate the raw input
 * @param handler — Async function that receives the parsed input and returns data
 */
export function createServerAction<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  handler: (input: TInput) => Promise<TOutput>
): (input: unknown) => Promise<ActionResult<TOutput>> {
  return async (rawInput: unknown): Promise<ActionResult<TOutput>> => {
    // Parse and validate the input
    const parsed = schema.safeParse(rawInput)

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".")
        if (!fieldErrors[key]) fieldErrors[key] = []
        fieldErrors[key].push(issue.message)
      }
      return {
        success: false,
        error: "Validation failed",
        fieldErrors,
      }
    }

    try {
      const data = await handler(parsed.data)
      return { success: true, data }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      return { success: false, error: message }
    }
  }
}

// Re-export auth actions for convenience
export * from "./auth.actions"
