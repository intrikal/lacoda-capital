/**
 * ============================================================================
 * IMPORTS EXPLAINED
 * ============================================================================
 *
 * Kevin, imports bring in code from other files so we can use it here.
 * Let's explain each one:
 */

/**
 * import { relations } from "drizzle-orm"
 *
 * WHAT: Imports the "relations" function from the Drizzle ORM library.
 * WHY:  We use this to define HOW this table connects to other tables.
 *       For valuations, we need to define: "a valuation belongs to ONE asset."
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * See orgs.ts for full explanation of the relations function.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, numeric, index } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each function creates a different part of a database table.
 *
 * Let's break down each one:
 *
 * pgTable   = Function to create a new database table.
 *             Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *             See orgs.ts for full explanation.
 *
 * uuid      = Column type for UUIDs (Universally Unique Identifier).
 *             A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *             It's a random 36-character string that's practically impossible to guess.
 *             See orgs.ts for full explanation.
 *
 * text      = Column type for text/strings (like "manual" or "Some notes about this valuation").
 *             Can hold any length of text.
 *             See orgs.ts for full explanation.
 *
 * timestamp = Column type for dates and times (like "2024-01-15 10:30:00").
 *             We use { withTimezone: true } to track the timezone too.
 *             See orgs.ts for full explanation.
 *
 * numeric   = Column type for EXACT decimal numbers (like "1234567.89").
 *             ┌─────────────────────────────────────────────────────────────┐
 *             │ WHY NUMERIC INSTEAD OF FLOAT/DOUBLE?                       │
 *             │                                                             │
 *             │ In programming, there are two ways to store decimals:       │
 *             │                                                             │
 *             │ FLOAT/DOUBLE (approximate):                                 │
 *             │   0.1 + 0.2 = 0.30000000000000004  (!!!)                    │
 *             │   This is fine for science/graphics, but TERRIBLE for money.│
 *             │   Imagine telling a client their portfolio is off by $0.01  │
 *             │   on every transaction. Those pennies add up!               │
 *             │                                                             │
 *             │ NUMERIC/DECIMAL (exact):                                    │
 *             │   0.1 + 0.2 = 0.30  (exactly right!)                        │
 *             │   Uses special math to guarantee precision.                 │
 *             │   Slower than float, but EXACT. Perfect for money.          │
 *             │                                                             │
 *             │ RULE: Always use NUMERIC for financial values.              │
 *             └─────────────────────────────────────────────────────────────┘
 *
 * index     = Function to create database indexes (makes queries faster).
 *             Think of it like the index in the back of a book.
 *             See orgs.ts for full explanation.
 *
 * WHERE: "drizzle-orm/pg-core" is the PostgreSQL-specific part of Drizzle.
 *        The "/pg-core" means "PostgreSQL core functions".
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";

/**
 * import { assets } from "./assets"
 *
 * WHAT: Imports the assets table definition from the assets.ts file.
 * WHY:  We need to reference assets.id to create a Foreign Key relationship.
 *       This line says "I need to know about the assets table so I can point to it."
 *       Specifically, valuations.assetId will POINT TO assets.id.
 * WHERE: "./" means "same directory", so this imports from app/db/schema/assets.ts
 *
 * See clients.ts for full explanation of importing parent tables for FK references.
 */
import { assets } from "./assets";

/**
 * ============================================================================
 * VALUATIONS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, this table stores point-in-time valuations for assets.
 * It's a TIME-SERIES table - we never update old rows, only append new ones.
 *
 * WHAT IS A TIME-SERIES TABLE?
 *   A time-series table records data points over time, like a log.
 *   Each row is a snapshot: "On this date, this asset was worth this much."
 *
 *   Example rows for a single asset:
 *     | as_of_date  | value       | source    |
 *     |-------------|-------------|-----------|
 *     | 2024-01-01  | 500,000.00  | statement |
 *     | 2024-04-01  | 520,000.00  | appraisal |
 *     | 2024-07-01  | 515,000.00  | manual    |
 *     | 2024-10-01  | 540,000.00  | plaid     |
 *
 *   We NEVER go back and change the Jan row. We just add a new row.
 *   This gives us a complete history of how the value changed over time.
 *
 * WHY TIME-SERIES INSTEAD OF JUST current_value ON ASSETS?
 *   - Historical performance tracking ("How did this asset do over 5 years?")
 *   - Audit trail for compliance ("Prove the value was X on this date")
 *   - Point-in-time reporting (quarterly statements, year-end reports)
 *   - We still denormalize current_value to assets for query efficiency
 *     (so you don't have to scan ALL valuations just to get the latest one)
 *
 * WHAT IS A LEAF NODE?
 *   This table is at the BOTTOM of the hierarchy. No other table points to it.
 *
 *     Org -> Client -> Entity -> Asset -> Valuation
 *                                            ^
 *                                       (LEAF NODE)
 *                                  No children, only a parent.
 *
 *   Compare to the "clients" table which sits in the MIDDLE:
 *   clients has a parent (orgs) AND children (entities, documents, etc.).
 *   Valuations only has a parent (assets) and NO children.
 *
 * IMPORTANT: When inserting a new valuation, update assets.current_value
 * and assets.valued_at in the same transaction. This keeps the denormalized
 * "latest value" on the asset in sync with the actual valuation history.
 */

/**
 * export const valuations = pgTable(...)
 *
 * BREAKDOWN:
 *   export      = Makes this available for other files to import.
 *                 Other files can do: import { valuations } from "./valuations"
 *   const       = Declares a constant (value that won't change).
 *   valuations  = The name we give this table in our TypeScript code.
 *                 We'll use it like: db.query.valuations.findMany()
 *   pgTable     = The function that creates a PostgreSQL table definition.
 *                 It takes 3 arguments: table name, columns, and indexes.
 *
 * See orgs.ts for full explanation of the pgTable function.
 */
export const valuations = pgTable(
  "valuations", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ PRIMARY KEY (PK) - Unique identifier for this valuation record.     │
     * │                                                                     │
     * │ Let's break this down piece by piece:                               │
     * │                                                                     │
     * │ id:                                                                 │
     * │   The TypeScript property name. In code, we use: valuations.id      │
     * │                                                                     │
     * │ uuid("id")                                                          │
     * │   Creates a column named "id" in the database with type UUID.       │
     * │   UUID = Universally Unique Identifier                              │
     * │   Example value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"            │
     * │   See orgs.ts for full explanation of UUIDs.                        │
     * │                                                                     │
     * │ .primaryKey()                                                       │
     * │   Makes this THE unique identifier for each valuation row.          │
     * │   No two valuations can have the same id.                           │
     * │   See orgs.ts for full explanation of Primary Keys.                 │
     * │                                                                     │
     * │   NOTE: Even though valuations is a LEAF NODE (no table points      │
     * │   to this PK via a Foreign Key), we still need a PK because:        │
     * │   1. Every table MUST have a Primary Key (database rule)            │
     * │   2. We still need to find/update/delete specific valuations        │
     * │      SELECT * FROM valuations WHERE id = 'a1b2c3d4-...'             │
     * │   3. Future tables COULD reference it if needed                     │
     * │                                                                     │
     * │ .defaultRandom()                                                    │
     * │   Automatically generates a random UUID if you don't provide one.   │
     * │   So when inserting a new valuation, you don't have to create       │
     * │   the ID yourself.                                                  │
     * │   See orgs.ts for full explanation of .defaultRandom().             │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assetId: uuid("asset_id").notNull()                                 │
     * │          .references(() => assets.id, { onDelete: "cascade" })      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY (FK) - Points to the asset being valued.                │
     * │                                                                     │
     * │ assetId:                                                            │
     * │   TypeScript property name. We use valuations.assetId in code.      │
     * │   Note: camelCase in TypeScript (assetId), but snake_case in the    │
     * │   database (asset_id). Drizzle handles this mapping for us.         │
     * │                                                                     │
     * │ uuid("asset_id")                                                    │
     * │   Creates a column named "asset_id" in the database.                │
     * │   It stores a UUID that must match an id in the assets table.       │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every valuation MUST belong to an asset. You can't have a         │
     * │   valuation floating around with no asset attached.                  │
     * │   If you try to insert a valuation without asset_id:                │
     * │     INSERT INTO valuations (value) VALUES ('500000')                │
     * │     --> DATABASE ERROR: "asset_id cannot be null"                    │
     * │   See clients.ts for full explanation of .notNull().                 │
     * │                                                                     │
     * │ .references(() => assets.id, { onDelete: "cascade" })               │
     * │   This creates the FOREIGN KEY constraint.                          │
     * │   "The value in asset_id MUST exist in the assets table's id column"│
     * │                                                                     │
     * │   Kevin, this is the END of the Primary Key / Foreign Key chain:    │
     * │                                                                     │
     * │   FULL CHAIN VISUAL:                                                │
     * │                                                                     │
     * │     orgs table        clients table      entities table              │
     * │     ┌──────────┐      ┌──────────────┐   ┌───────────────┐          │
     * │     │ id (PK)  │◄─────│ org_id (FK)  │   │               │          │
     * │     └──────────┘      │ id (PK)      │◄──│ client_id (FK)│          │
     * │                       └──────────────┘   │ id (PK)       │          │
     * │                                          └───────┬───────┘          │
     * │                                                  │                  │
     * │     assets table         valuations table        │                  │
     * │     ┌───────────────┐    ┌────────────────┐      │                  │
     * │     │ entity_id (FK)│◄───┘                │      │                  │
     * │     │ id (PK)       │◄───│ asset_id (FK)  │      │                  │
     * │     └───────────────┘    │ id (PK)        │      │                  │
     * │                          │ value           │      │                  │
     * │                          │ as_of_date      │      │                  │
     * │                          └────────────────┘      │                  │
     * │                             ▲                                       │
     * │                        (LEAF NODE)                                  │
     * │                   No table points TO valuations                     │
     * │                                                                     │
     * │   In short:                                                         │
     * │     org.id (PK) <-- client.org_id (FK)                              │
     * │                     client.id (PK) <-- entity.client_id (FK)        │
     * │                                        entity.id (PK) <-- asset.entity_id (FK)│
     * │                                                           asset.id (PK) <-- valuation.asset_id (FK)│
     * │                                                                              valuation.id (PK)│
     * │                                                                              ▲                │
     * │                                                                         (END OF CHAIN)        │
     * │                                                                                               │
     * │   { onDelete: "cascade" }                                           │
     * │     What happens if the PARENT asset is deleted?                     │
     * │     "cascade" = DELETE the valuations too.                           │
     * │     Delete an asset --> All its valuation history is deleted.        │
     * │     This makes sense because valuations without an asset             │
     * │     are meaningless orphaned data.                                   │
     * │     See clients.ts for full explanation of onDelete options.         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull() │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The EFFECTIVE DATE of this valuation.                                │
     * │                                                                     │
     * │ IMPORTANT DISTINCTION:                                              │
     * │   as_of_date  = "What date is this valuation FOR?"                  │
     * │   created_at  = "When was this row RECORDED in the database?"       │
     * │                                                                     │
     * │   Example:                                                          │
     * │     A quarterly statement arrives on January 5th showing the        │
     * │     asset value as of December 31st.                                │
     * │     → as_of_date = December 31, 2024  (the valuation date)          │
     * │     → created_at = January 5, 2025    (when we entered it)          │
     * │                                                                     │
     * │   This distinction matters for financial reporting. When someone     │
     * │   asks "What was the portfolio worth on Dec 31?", we look at        │
     * │   as_of_date, not created_at.                                       │
     * │                                                                     │
     * │ asOfDate:                                                           │
     * │   TypeScript property name. In code: valuations.asOfDate            │
     * │                                                                     │
     * │ timestamp("as_of_date", { withTimezone: true })                     │
     * │   Creates a timestamp column that stores date AND time.             │
     * │   { withTimezone: true } = Also stores timezone info.               │
     * │   Example value: "2024-12-31T00:00:00-05:00"                        │
     * │   See orgs.ts for full explanation of timestamps.                   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every valuation MUST have a date. A valuation without a date      │
     * │   is useless - we wouldn't know WHEN the asset was worth that much. │
     * │   If you try to insert without as_of_date:                          │
     * │     INSERT INTO valuations (asset_id, value)                        │
     * │       VALUES ('abc-123', '500000')                                  │
     * │     --> DATABASE ERROR: "as_of_date cannot be null"                  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ value: numeric("value", { precision: 18, scale: 2 }).notNull()      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The dollar (or other currency) amount of this valuation.            │
     * │                                                                     │
     * │ value:                                                              │
     * │   TypeScript property name. In code: valuations.value               │
     * │                                                                     │
     * │ numeric("value", { precision: 18, scale: 2 })                       │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ PRECISION AND SCALE EXPLAINED:                              │   │
     * │   │                                                             │   │
     * │   │ precision = TOTAL number of digits allowed (before + after  │   │
     * │   │             the decimal point combined)                     │   │
     * │   │ scale     = Number of digits AFTER the decimal point        │   │
     * │   │                                                             │   │
     * │   │ precision: 18, scale: 2 means:                              │   │
     * │   │   - Up to 18 total digits                                   │   │
     * │   │   - 2 digits after the decimal point                        │   │
     * │   │   - So: 16 digits BEFORE the decimal + 2 AFTER             │   │
     * │   │                                                             │   │
     * │   │ VALID VALUES:                                               │   │
     * │   │   "500000.00"              (a $500K house)                   │   │
     * │   │   "1234567890123456.78"    (quadrillions - very large!)     │   │
     * │   │   "0.50"                   (fifty cents)                    │   │
     * │   │                                                             │   │
     * │   │ INVALID VALUES:                                             │   │
     * │   │   "123.456"  (3 decimal places, but scale only allows 2)   │   │
     * │   │   "12345678901234567.89" (19 digits, but precision is 18)  │   │
     * │   │                                                             │   │
     * │   │ WHY precision: 18?                                          │   │
     * │   │   16 digits before the decimal can hold values up to:       │   │
     * │   │   $9,999,999,999,999,999.99 (nearly 10 quadrillion)        │   │
     * │   │   This is more than enough for any wealth management        │   │
     * │   │   scenario, even for ultra-high-net-worth clients.          │   │
     * │   │                                                             │   │
     * │   │ WHY scale: 2?                                               │   │
     * │   │   Two decimal places = cents. Most currencies use 2 decimal │   │
     * │   │   places: $1,234.56, EUR 789.01, etc.                       │   │
     * │   │                                                             │   │
     * │   │ WHY NUMERIC INSTEAD OF FLOAT?                               │   │
     * │   │   NUMERIC is EXACT. Float is approximate.                   │   │
     * │   │   0.1 + 0.2 in float = 0.30000000000000004 (wrong!)        │   │
     * │   │   0.1 + 0.2 in numeric = 0.30 (exactly right!)             │   │
     * │   │   For financial data, we MUST be exact.                     │   │
     * │   │                                                             │   │
     * │   │ NOTE: Drizzle returns numeric values as STRINGS in          │   │
     * │   │ TypeScript (e.g., "500000.00" not 500000.00).               │   │
     * │   │ This is because JavaScript numbers (float64) can lose       │   │
     * │   │ precision for very large values. Keeping it as a string     │   │
     * │   │ preserves the exact value from the database.                │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every valuation MUST have a value. A valuation record without     │
     * │   an actual dollar amount is meaningless.                           │
     * │   If you try to insert without a value:                             │
     * │     INSERT INTO valuations (asset_id, as_of_date)                   │
     * │       VALUES ('abc-123', '2024-12-31')                              │
     * │     --> DATABASE ERROR: "value cannot be null"                       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ currency: text("currency").default("USD")                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The currency the valuation is denominated in.                       │
     * │                                                                     │
     * │ currency:                                                           │
     * │   TypeScript property name. In code: valuations.currency            │
     * │                                                                     │
     * │ text("currency")                                                    │
     * │   Creates a TEXT column named "currency" in the database.           │
     * │   Stores ISO 4217 currency codes like "USD", "EUR", "GBP", "JPY".  │
     * │                                                                     │
     * │ .default("USD")                                                     │
     * │   If no currency is provided when inserting, it defaults to "USD"   │
     * │   (United States Dollar). Most wealth management firms in the US    │
     * │   primarily deal in USD, so this saves typing for the common case.  │
     * │                                                                     │
     * │   WITHOUT .default("USD"):                                          │
     * │     You'd have to specify currency every time:                      │
     * │     { assetId: "...", value: "500000", currency: "USD" }            │
     * │                                                                     │
     * │   WITH .default("USD"):                                             │
     * │     You can skip it for USD valuations:                             │
     * │     { assetId: "...", value: "500000" }  // currency = "USD" auto   │
     * │     But you can still override it:                                  │
     * │     { assetId: "...", value: "500000", currency: "EUR" }            │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   Technically the value CAN be null, but with .default("USD"),      │
     * │   it will almost always have a value. A null currency might mean     │
     * │   "unknown" or "not applicable" in edge cases.                      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    currency: text("currency").default("USD"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ source: text("source")                                              │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHERE this valuation came from.                                     │
     * │                                                                     │
     * │ source:                                                             │
     * │   TypeScript property name. In code: valuations.source              │
     * │                                                                     │
     * │ text("source")                                                      │
     * │   Creates a TEXT column named "source" in the database.             │
     * │                                                                     │
     * │ Common values:                                                      │
     * │   "manual"    = Someone typed it in by hand                         │
     * │   "plaid"     = Pulled automatically from Plaid API (bank feeds)    │
     * │   "statement" = Extracted from a financial statement/document       │
     * │   "appraisal" = From a professional appraisal (e.g., real estate)  │
     * │   "api"       = From some other external API integration            │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   Source is OPTIONAL. If not provided, it's null (unknown source).  │
     * │   This is useful for legacy data or bulk imports where the source   │
     * │   might not be tracked.                                             │
     * │                                                                     │
     * │ WHY NOT USE AN ENUM?                                                │
     * │   We use a plain text field instead of an enum (fixed list of       │
     * │   values) because new sources might be added in the future.         │
     * │   Adding a new integration shouldn't require a database migration.  │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    source: text("source"), // 'manual', 'plaid', 'statement', 'appraisal', etc.

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ notes: text("notes")                                                │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Free-form text for additional context about this valuation.          │
     * │                                                                     │
     * │ notes:                                                              │
     * │   TypeScript property name. In code: valuations.notes               │
     * │                                                                     │
     * │ text("notes")                                                       │
     * │   Creates a TEXT column named "notes" in the database.              │
     * │   Can hold any amount of text.                                      │
     * │                                                                     │
     * │ Example values:                                                     │
     * │   "Based on Q4 2024 brokerage statement"                            │
     * │   "Appraisal by Smith & Associates, report #12345"                  │
     * │   "Estimated value - pending formal appraisal"                      │
     * │   "Adjusted for 2-for-1 stock split on 2024-06-15"                  │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   Notes are OPTIONAL. Most valuations won't need notes.             │
     * │   Only add notes when there's something unusual or important        │
     * │   to record about how/why this valuation was determined.            │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    notes: text("notes"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })          │
     * │            .notNull().defaultNow()                                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ When this valuation RECORD was created in the database.             │
     * │                                                                     │
     * │ IMPORTANT - THIS IS DIFFERENT FROM as_of_date:                      │
     * │   as_of_date = "What date is this valuation FOR?"                   │
     * │                (the effective/business date)                        │
     * │   created_at = "When was this row SAVED to the database?"           │
     * │                (the technical/audit date)                           │
     * │                                                                     │
     * │   Example:                                                          │
     * │     A year-end statement arrives on January 5th, 2025:              │
     * │     → as_of_date = "2024-12-31" (the valuation date on the stmt)   │
     * │     → created_at = "2025-01-05" (when someone entered the data)    │
     * │                                                                     │
     * │ createdAt:                                                          │
     * │   TypeScript property name. In code: valuations.createdAt           │
     * │                                                                     │
     * │ timestamp("created_at", { withTimezone: true })                     │
     * │   Creates a timestamp column with timezone info.                    │
     * │   See orgs.ts for full explanation of timestamps.                   │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every row must have a created_at time.                            │
     * │                                                                     │
     * │ .defaultNow()                                                       │
     * │   If not provided, use the current time when the row is inserted.   │
     * │   See orgs.ts for full explanation of .defaultNow().                │
     * │                                                                     │
     * │ NOTE: There is NO updatedAt column on this table!                   │
     * │   Because this is a time-series table, we NEVER update rows.        │
     * │   We only INSERT new valuations. If a valuation was wrong,          │
     * │   we'd insert a corrected one rather than editing the old one.      │
     * │   This preserves the complete audit trail.                          │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * SOFT DELETE — see documents.ts deletedAt for full explanation.
     * NULL = active row. NOT NULL = "deleted" at that timestamp.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },

  // ==================== INDEXES ====================
  /**
   * (table) => [...]
   *
   * This function returns an array of INDEXES for the valuations table.
   *
   * Kevin, indexes make database searches faster. Without them, the database
   * has to scan EVERY row to find what you're looking for. With them, it
   * can jump straight to the right rows, like using the index in a book.
   * See orgs.ts for full explanation of what indexes are and their tradeoffs.
   *
   * For a TIME-SERIES table like valuations, indexes are especially important
   * because the table grows constantly (new valuations are always being added)
   * and we frequently query by asset + date range.
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("valuations_asset_id_idx").on(table.assetId)                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index on the asset_id column.                            │
     * │                                                                     │
     * │ WHY: Find ALL valuations for a specific asset.                      │
     * │                                                                     │
     * │ QUERY THIS SUPPORTS:                                                │
     * │   SELECT * FROM valuations WHERE asset_id = 'abc-123'               │
     * │   "Give me every valuation record for asset abc-123"                │
     * │                                                                     │
     * │ WITHOUT this index: The database would scan every single            │
     * │   valuation in the table (could be millions!) to find the ones      │
     * │   matching this asset.                                              │
     * │ WITH this index: The database jumps directly to the matching rows.  │
     * │                                                                     │
     * │ NAMING: valuations_asset_id_idx follows the convention:             │
     * │   tablename_columnname_idx                                          │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("valuations_asset_id_idx").on(table.assetId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("valuations_asset_date_idx").on(table.assetId, table.asOfDate)│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on TWO columns: asset_id AND as_of_date.          │
     * │                                                                     │
     * │ WHY: Time-series queries - find valuations for an asset within      │
     * │ a date range. This is THE most common query for this table.         │
     * │                                                                     │
     * │ QUERIES THIS SUPPORTS:                                              │
     * │                                                                     │
     * │ 1. "Get all valuations for asset X between two dates"               │
     * │    SELECT * FROM valuations                                         │
     * │      WHERE asset_id = 'abc-123'                                     │
     * │      AND as_of_date BETWEEN '2024-01-01' AND '2024-12-31'           │
     * │    (For annual performance reports)                                  │
     * │                                                                     │
     * │ 2. "Get all valuations for asset X, ordered by date"                │
     * │    SELECT * FROM valuations                                         │
     * │      WHERE asset_id = 'abc-123'                                     │
     * │      ORDER BY as_of_date DESC                                       │
     * │    (Show valuation history, newest first)                           │
     * │                                                                     │
     * │ 3. "Get the latest valuation for asset X"                           │
     * │    SELECT * FROM valuations                                         │
     * │      WHERE asset_id = 'abc-123'                                     │
     * │      ORDER BY as_of_date DESC                                       │
     * │      LIMIT 1                                                        │
     * │    (Get just the most recent valuation by effective date)           │
     * │                                                                     │
     * │ COMPOSITE INDEX NOTE:                                               │
     * │   A composite index on (asset_id, as_of_date) works for queries     │
     * │   that filter by asset_id alone OR by both asset_id + as_of_date.   │
     * │   It does NOT help queries that filter by as_of_date alone.         │
     * │   Think of it like a phone book sorted by last name, then first     │
     * │   name: you can find all "Smiths" or "Smith, John" fast, but        │
     * │   finding all "Johns" (regardless of last name) is still slow.      │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("valuations_asset_date_idx").on(table.assetId, table.asOfDate),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("valuations_asset_created_idx")                               │
     * │   .on(table.assetId, table.createdAt)                               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on asset_id AND created_at.                       │
     * │                                                                     │
     * │ WHY: Find the most recently RECORDED valuation for an asset.        │
     * │                                                                     │
     * │ IMPORTANT DISTINCTION FROM THE PREVIOUS INDEX:                      │
     * │   valuations_asset_date_idx    = ordered by EFFECTIVE date           │
     * │     (as_of_date - when was the asset worth this?)                   │
     * │   valuations_asset_created_idx = ordered by RECORDING date           │
     * │     (created_at - when did we enter this in the database?)          │
     * │                                                                     │
     * │ QUERY THIS SUPPORTS:                                                │
     * │   SELECT * FROM valuations                                          │
     * │     WHERE asset_id = 'abc-123'                                      │
     * │     ORDER BY created_at DESC                                        │
     * │     LIMIT 1                                                         │
     * │   "Get the most recently ENTERED valuation for this asset"          │
     * │                                                                     │
     * │ REAL-WORLD EXAMPLE:                                                 │
     * │   Imagine two valuations are entered on different days:             │
     * │     Jan 10: Enter a valuation as_of Dec 31 (quarterly statement)   │
     * │     Jan 12: Enter a valuation as_of Jan 5 (Plaid API update)       │
     * │                                                                     │
     * │   "Latest by as_of_date" = Jan 5 valuation (most recent date)      │
     * │   "Latest by created_at" = Jan 12 entry (most recently recorded)   │
     * │                                                                     │
     * │   Both queries are useful for different purposes:                   │
     * │   - "Latest by as_of_date" for reporting: "What's the most recent  │
     * │     known value?"                                                   │
     * │   - "Latest by created_at" for auditing: "What's the last thing    │
     * │     someone entered for this asset?"                                │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("valuations_asset_created_idx").on(table.assetId, table.createdAt),
  ]
);

/**
 * ============================================================================
 * RELATIONS DEFINITION
 * ============================================================================
 */

/**
 * Valuation Relations (LEAF NODE - Bottom of hierarchy)
 *
 * Kevin, valuations are the leaf nodes - they have no children, only a parent.
 *
 * HIERARCHY POSITION:
 *   Org ──► Client ──► Entity ──► Asset ──► Valuation
 *                                              ▲
 *                                         (LEAF NODE)
 *                                    (no children, only parent)
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER (see org_members.ts for full breakdown):              │
 *   │                                                                     │
 *   │ SELECT * FROM [table] WHERE [column] = [value]                      │
 *   │   "Fetch all columns from [table] where [column] matches [value]"   │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each valuation:
 *     valuation.asset → "Find the ONE asset this valuation is for" (go UP)
 *                       SELECT * FROM assets WHERE id = valuation.asset_id
 *     // No children - valuations is the end of the chain
 *
 * TRAVERSING UP THE FULL CHAIN:
 *   valuation.asset.entity.client.org
 *
 * QUERY EXAMPLE - Get valuation with full context:
 *   const valuation = await db.query.valuations.findFirst({
 *     where: eq(valuations.id, valuationId),
 *     with: {
 *       asset: {
 *         with: {
 *           entity: {
 *             with: {
 *               client: {
 *                 with: {
 *                   org: true,
 *                 },
 *               },
 *             },
 *           },
 *         },
 *       },
 *     },
 *   });
 *   // Result: valuation.asset.entity.client.org.name
 *
 * NOTE: Leaf nodes only have one() relations, never many()
 */
export const valuationsRelations = relations(valuations, ({ one }) => ({
  /**
   * ONE relationship: Valuation belongs to ONE Asset (going UP)
   *
   * one(assets, { ... }) means:
   *   - "A valuation is for exactly ONE asset"
   *   - This is the ONLY relation - valuations have no children
   *
   * SQL: SELECT * FROM assets WHERE id = valuation.asset_id
   */
  asset: one(assets, {
    fields: [valuations.assetId],  // FK on THIS table (valuations)
    references: [assets.id],       // PK on PARENT table (assets)
  }),

  // NOTE: No many() relations here - valuations is a leaf node
  // It only points UP to its parent (asset), never DOWN to children
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * export type Valuation = typeof valuations.$inferSelect
 *
 * Creates a TypeScript type representing a VALUATION ROW from the database.
 * Used when you SELECT (read) data FROM the database.
 *
 * $inferSelect = "Infer the type for selecting data"
 *
 * The resulting type looks roughly like:
 *   {
 *     id: string;           // UUID
 *     assetId: string;      // UUID (FK to assets)
 *     asOfDate: Date;       // The effective valuation date
 *     value: string;        // NUMERIC comes back as string (exact precision)
 *     currency: string | null;  // Nullable, defaults to "USD"
 *     source: string | null;    // Nullable
 *     notes: string | null;     // Nullable
 *     createdAt: Date;          // When the row was created
 *   }
 *
 * USAGE:
 *   const valuation: Valuation = await db.query.valuations.findFirst();
 *   valuation.value       // TypeScript knows this is a string (not number!)
 *   valuation.asOfDate    // TypeScript knows this is a Date
 *   valuation.source      // TypeScript knows this is string | null
 */
export type Valuation = typeof valuations.$inferSelect;

/**
 * export type NewValuation = typeof valuations.$inferInsert
 *
 * Creates a TypeScript type for INSERTING a new valuation row.
 * Some fields are optional (have defaults), so this type reflects that.
 *
 * $inferInsert = "Infer the type for inserting data"
 *
 * REQUIRED fields (no default):
 *   - assetId:  Which asset is being valued (FK)
 *   - asOfDate: The effective date of the valuation
 *   - value:    The dollar amount
 *
 * OPTIONAL fields (have defaults or are nullable):
 *   - id:        Auto-generated UUID (.defaultRandom())
 *   - currency:  Defaults to "USD" (.default("USD"))
 *   - source:    Nullable (can be omitted)
 *   - notes:     Nullable (can be omitted)
 *   - createdAt: Auto-set to now (.defaultNow())
 *
 * USAGE:
 *   const newVal: NewValuation = {
 *     assetId: "abc-123",                          // Required (FK to assets)
 *     asOfDate: new Date("2024-12-31"),             // Required
 *     value: "500000.00",                           // Required (string, not number!)
 *     // currency, source, notes, id, createdAt are all optional
 *   };
 *   await db.insert(valuations).values(newVal);
 */
export type NewValuation = typeof valuations.$inferInsert;
