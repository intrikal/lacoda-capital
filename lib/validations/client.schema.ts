/**
 * ============================================================================
 * FILE: /lib/validations/client.schema.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   A "validation schema" file. It defines the RULES for what valid client
 *   data looks like. Think of it as a bouncer at a club — it checks every
 *   piece of data against a set of rules before letting it through.
 *
 * WHY WE NEED THIS:
 *   Users can send ANYTHING to our API. Without validation:
 *     - Someone could create a client with an empty name
 *     - Someone could send an email like "not-an-email"
 *     - Someone could set clientType to "banana" (not a real type)
 *
 *   This file prevents all of that by defining strict rules.
 *
 * WHERE IS THIS USED?
 *   1. API routes (server-side) — validates incoming HTTP request bodies
 *      → app/api/clients/route.ts (POST)
 *      → app/api/clients/[id]/route.ts (PATCH)
 *   2. Form component (client-side) — validates form fields as user types
 *      → components/forms/client-form-dialog.tsx
 *
 *   IMPORTANT: We validate on BOTH sides:
 *     - Client-side: Gives instant feedback ("name too short")
 *     - Server-side: Security layer (client validation can be bypassed)
 *     NEVER trust client-side validation alone.
 *
 * WHAT IS ZOD?
 *   Zod is a TypeScript-first validation library. It lets you:
 *   1. Define schemas (rules for what valid data looks like)
 *   2. Parse/validate data against those schemas
 *   3. Infer TypeScript types from schemas (so types stay in sync with rules)
 *
 *   Without Zod, you'd write manual if/else checks everywhere:
 *     if (!name || name.length < 2) throw Error("too short")
 *     if (name.length > 120) throw Error("too long")
 *     ...tedious and error-prone
 *
 *   With Zod, you declare the rules ONCE and reuse them everywhere.
 */

// ─── IMPORTS ────────────────────────────────────────────────────────────────────

/**
 * import { z } from "zod"
 *
 * Imports the Zod library. We use `z` as the main entry point.
 * All Zod functions start with `z.`:
 *   z.string()  → validates a string
 *   z.number()  → validates a number
 *   z.object()  → validates an object with specific keys
 *   z.enum()    → validates against a fixed set of allowed values
 */
import { z } from "zod"


// ─── ENUMS ──────────────────────────────────────────────────────────────────────
/**
 * WHAT IS AN ENUM?
 *   An "enum" (enumeration) is a fixed set of allowed values.
 *   Think of it as a dropdown menu — you can only pick from the list.
 *
 *   clientTypeEnum: Can ONLY be "individual", "institution", "trust", or "fund"
 *   Anything else (like "banana" or "company") is rejected.
 *
 * z.enum(["a", "b", "c"])
 *   Creates a Zod validator that ONLY accepts "a", "b", or "c".
 *   Any other value fails validation.
 */

/**
 * Client Type — What kind of client is this?
 *   "individual"  → A single person (e.g., "John Smith")
 *   "institution" → A company or organization (e.g., "Goldman Sachs")
 *   "trust"       → A legal trust (e.g., "Smith Family Trust")
 *   "fund"        → An investment fund (e.g., "Alpha Capital Fund I")
 */
export const clientTypeEnum = z.enum(["individual", "institution", "trust", "fund"])

/**
 * Client Status — What lifecycle stage is this client in?
 *   "active"    → Currently a paying client with active accounts
 *   "inactive"  → Was a client but no longer active (might return)
 *   "prospect"  → Not yet a client, in the pipeline (potential future client)
 */
export const clientStatusEnum = z.enum(["active", "inactive", "prospect"])

/**
 * TYPE INFERENCE FROM SCHEMAS:
 *
 * z.infer<typeof someSchema> extracts a TypeScript type from a Zod schema.
 * This means our TYPE and our VALIDATION stay in sync automatically.
 *
 * If we add a new client type (e.g., "partnership") to the enum,
 * the TypeScript type updates automatically — no manual sync needed.
 *
 * ClientType resolves to: "individual" | "institution" | "trust" | "fund"
 * ClientStatus resolves to: "active" | "inactive" | "prospect"
 *
 * The `|` symbol means "or" — the value can be ANY ONE of these strings.
 * This is called a "union type" in TypeScript.
 */
export type ClientType = z.infer<typeof clientTypeEnum>
export type ClientStatus = z.infer<typeof clientStatusEnum>


// ─── CREATE SCHEMA ──────────────────────────────────────────────────────────────
/**
 * createClientSchema — Validates data for creating a NEW client.
 *
 * z.object({...}) creates a validator for a JavaScript object.
 * Each key defines the rules for that property.
 *
 * USED BY:
 *   - POST /api/clients (server-side validation)
 *   - ClientFormDialog (client-side field validation)
 */
export const createClientSchema = z.object({
  /**
   * displayName — The client's full name or organization name.
   *
   * z.string()           → Must be a string (not a number, boolean, etc.)
   * .min(2, "message")   → Must be at least 2 characters long.
   *                        If shorter, the error message is "Name must be..."
   * .max(120, "message") → Must be at most 120 characters.
   * .trim()              → Automatically removes leading/trailing whitespace.
   *                        "  John Smith  " → "John Smith"
   *                        This happens BEFORE min/max checks.
   *
   * WHY min(2)? Prevents empty or single-character names like "J".
   * WHY max(120)? Prevents absurdly long names that break UI layouts.
   */
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name must be under 120 characters")
    .trim(),

  /**
   * email — The client's email address.
   *
   * z.string()       → Must be a string
   * .email("msg")    → Must match email format (contains @, has domain, etc.)
   *                    Zod has built-in email validation.
   * .max(255)        → Max 255 chars (standard email length limit per RFC)
   * .nullable()      → The value CAN be null (explicitly "no email")
   * .optional()      → The key can be missing entirely from the object
   *
   * NULLABLE vs OPTIONAL — they're different!
   *   .nullable()  → { email: null } is valid
   *   .optional()  → { } is valid (email key missing entirely)
   *   Both together → { email: null }, { email: "a@b.com" }, or { } all valid
   *
   * WHY BOTH? In the database, missing email is stored as NULL.
   *   The frontend might send null (explicit clear) or omit the field entirely.
   *   We accept both.
   */
  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .nullable()
    .optional(),

  /**
   * phone — The client's phone number.
   *
   * Simpler than email — just a string with max length.
   * No format validation (phone formats vary wildly worldwide).
   * .max(30) prevents abuse (no real phone number is 30+ chars).
   */
  phone: z
    .string()
    .max(30, "Phone number too long")
    .nullable()
    .optional(),

  /**
   * clientType — What kind of client (individual, institution, trust, fund).
   *
   * clientTypeEnum refers to the z.enum we defined above.
   * .default("individual") → If not provided, use "individual".
   *
   * .default() means: if the value is undefined, substitute this value.
   * So { displayName: "John" } without clientType gets clientType = "individual".
   */
  clientType: clientTypeEnum.default("individual"),

  /**
   * clientStatus — Client lifecycle stage (active, inactive, prospect).
   *
   * .default("prospect") → New clients start as prospects by default.
   * This makes sense: you're adding them to the pipeline first.
   */
  clientStatus: clientStatusEnum.default("prospect"),
})

/**
 * TYPE: CreateClientInput
 *
 * z.infer<typeof createClientSchema> generates the TypeScript type:
 *   {
 *     displayName: string
 *     email?: string | null
 *     phone?: string | null
 *     clientType: "individual" | "institution" | "trust" | "fund"
 *     clientStatus: "active" | "inactive" | "prospect"
 *   }
 *
 * This type is used in function signatures to enforce type safety:
 *   function createClient(input: CreateClientInput) { ... }
 *   → TypeScript ensures you pass the right shape of data.
 */
export type CreateClientInput = z.infer<typeof createClientSchema>


// ─── UPDATE SCHEMA ──────────────────────────────────────────────────────────────
/**
 * updateClientSchema — Validates data for UPDATING an existing client.
 *
 * createClientSchema.partial()
 *   .partial() makes EVERY field optional.
 *
 *   Before .partial():
 *     { displayName: string, email?: string, ... }  ← displayName is REQUIRED
 *
 *   After .partial():
 *     { displayName?: string, email?: string, ... }  ← ALL are optional
 *
 *   WHY? For a PATCH (partial update), you only send the fields you want to change.
 *   { displayName: "New Name" } is valid — you don't need email, phone, etc.
 *
 * USED BY: PATCH /api/clients/:id
 */
export const updateClientSchema = createClientSchema.partial()

/**
 * TYPE: UpdateClientInput
 *
 * All fields from CreateClientInput, but every one is optional.
 *   {
 *     displayName?: string
 *     email?: string | null
 *     phone?: string | null
 *     clientType?: "individual" | "institution" | "trust" | "fund"
 *     clientStatus?: "active" | "inactive" | "prospect"
 *   }
 */
export type UpdateClientInput = z.infer<typeof updateClientSchema>


// ─── API RESPONSE TYPE ──────────────────────────────────────────────────────────
/**
 * ClientRecord — The shape of client data returned by our API.
 *
 * This is an INTERFACE, not a Zod schema. It's TypeScript-only (exists at
 * compile time, erased at runtime). We use it to type-check our API responses.
 *
 * WHY A SEPARATE TYPE FROM CreateClientInput?
 *   CreateClientInput = what you SEND to create a client (the INPUT)
 *   ClientRecord      = what the API RETURNS (the OUTPUT)
 *
 *   The output has EXTRA fields the input doesn't:
 *     - id: generated by the database
 *     - createdAt: auto-set by the database
 *     - assetCount: computed from joined tables
 *     - totalAUM: computed from joined tables
 *
 * INTERFACE vs TYPE:
 *   Both define object shapes in TypeScript. They're mostly interchangeable.
 *   Convention: use `interface` for object shapes, `type` for unions/aliases.
 */
export interface ClientRecord {
  /** The client's unique identifier (UUID), generated by the database */
  id: string

  /** The client's full name or organization name */
  displayName: string

  /** Email address, or null if not provided */
  email: string | null

  /** Phone number, or null if not provided */
  phone: string | null

  /** What kind of client: individual, institution, trust, or fund */
  clientType: ClientType

  /** Client lifecycle stage: active, inactive, or prospect */
  clientStatus: ClientStatus

  /** When this client was created, as an ISO 8601 string (e.g., "2024-01-15T10:30:00Z") */
  createdAt: string

  /** Number of entities belonging to this client */
  entityCount: number

  /** Number of active assets across all entities belonging to this client */
  assetCount: number

  /** Total Assets Under Management in dollars — sum of all active asset values */
  totalAUM: number
}
