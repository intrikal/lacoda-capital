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
 * WHY:  We use this to define HOW tables connect to each other.
 *       For example, "an asset belongs to an entity" and "an asset has many valuations".
 * WHERE: "drizzle-orm" is a package installed via npm (lives in node_modules).
 *
 * See clients.ts for a full explanation of the relations function.
 */
import { relations } from "drizzle-orm";

/**
 * import { pgTable, uuid, text, timestamp, jsonb, numeric, index } from "drizzle-orm/pg-core"
 *
 * WHAT: Imports functions to define PostgreSQL table structure.
 * WHY:  Each function creates a different part of a database table.
 *
 * BREAKDOWN (see clients.ts for detailed explanations of most of these):
 *   pgTable   = Function to CREATE a new database table
 *               Usage: pgTable("table_name", { columns }, (table) => [indexes])
 *
 *   uuid      = Column type for UUIDs (Universally Unique Identifier)
 *               A UUID looks like: "550e8400-e29b-41d4-a716-446655440000"
 *               It's a random 36-character string that's practically impossible to guess.
 *               See clients.ts for full explanation.
 *
 *   text      = Column type for text/strings (like "123 Main St Property" or "AAPL")
 *               Can hold any length of text. See clients.ts for full explanation.
 *
 *   timestamp = Column type for dates and times (like "2024-01-15 10:30:00")
 *               We use { withTimezone: true } to track the timezone too.
 *               See clients.ts for full explanation.
 *
 *   jsonb     = Column type for JSON data (JavaScript Object Notation, Binary format)
 *               Allows storing flexible, structured data like:
 *               { "ticker": "AAPL", "shares": 100, "brokerageAccount": "ABC-123" }
 *               The "b" means "binary" - stored more efficiently than plain JSON.
 *               See clients.ts for full explanation.
 *
 *   numeric   = Column type for PRECISE decimal numbers (like money amounts)
 *               ┌─────────────────────────────────────────────────────────────┐
 *               │ WHY NUMERIC INSTEAD OF REGULAR NUMBERS?                     │
 *               │                                                             │
 *               │ In programming, floating-point numbers have rounding errors:│
 *               │   0.1 + 0.2 = 0.30000000000000004  (NOT 0.3!)              │
 *               │                                                             │
 *               │ For MONEY, this is unacceptable. You can't tell a client    │
 *               │ their portfolio is worth $1,000,000.00000000004.            │
 *               │                                                             │
 *               │ The "numeric" type stores numbers as EXACT decimals:        │
 *               │   numeric(18, 2) means:                                     │
 *               │     18 = "precision" = total number of digits allowed       │
 *               │      2 = "scale" = digits AFTER the decimal point           │
 *               │                                                             │
 *               │ So numeric(18, 2) can store values like:                    │
 *               │   1234567890123456.78  (16 digits before decimal, 2 after)  │
 *               │   0.01                 (smallest value: one cent)            │
 *               │   9999999999999999.99  (largest value: ~$10 quadrillion)    │
 *               │                                                             │
 *               │ IMPORTANT: In TypeScript, numeric values come back as       │
 *               │ STRINGS (like "500000.00") not numbers, because JavaScript  │
 *               │ numbers can't handle the full precision. You'll need to     │
 *               │ parse them: parseFloat(asset.currentValue)                  │
 *               └─────────────────────────────────────────────────────────────┘
 *
 *   index     = Function to create database indexes (makes queries faster)
 *               See clients.ts for full explanation of indexes.
 *
 * WHERE: "drizzle-orm/pg-core" is the PostgreSQL-specific part of Drizzle.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  index,
} from "drizzle-orm/pg-core";

/**
 * import { assetClassEnum, assetStatusEnum } from "./00_enums"
 *
 * WHAT: Imports two predefined ENUM (enumeration) types from our enums file.
 * WHY:  Enums restrict a column to specific allowed values, preventing bad data.
 *
 * See entities.ts for a full explanation of what enums are and why we use them.
 *
 * QUICK SUMMARY:
 *   An enum is a list of allowed values. The database REJECTS anything not in the list.
 *
 *   assetClassEnum allows ONLY these values:
 *     "real_estate", "equities", "fixed_income", "private_equity",
 *     "venture_capital", "hedge_funds", "commodities", "cash",
 *     "crypto", "collectibles", "intellectual_property", "insurance", "other"
 *
 *     These are standard wealth management categories used for:
 *       - Portfolio allocation reports ("60% equities, 20% real estate, ...")
 *       - Risk analysis (different asset classes have different risk profiles)
 *       - Regulatory reporting
 *
 *   assetStatusEnum allows ONLY these values:
 *     "active"      = Currently held and valued (the normal state)
 *     "pending"     = Acquisition in progress (deal not closed yet)
 *     "sold"        = Asset has been disposed of (kept for historical reporting)
 *     "transferred" = Moved to a different entity (e.g., from personal to trust)
 *
 * WHERE: "./" means "same directory", so this imports from app/db/schema/00_enums.ts
 */
import { assetClassEnum, assetStatusEnum } from "./00_enums";

/**
 * import { entities } from "./entities"
 *
 * WHAT: Imports the entities table definition from the entities.ts file.
 * WHY:  We need to reference entities.id to create a Foreign Key relationship.
 *       This line says "I need to know about the entities table so I can point to it."
 *       Assets belong to entities (legal structures like trusts, LLCs, etc.).
 * WHERE: "./" means "same directory", so this imports from app/db/schema/entities.ts
 *
 * See entities.ts for the full explanation of the entities table.
 */
import { entities } from "./entities";

/**
 * The following imports bring in other tables that have relationships with assets.
 * We import them so we can define the relationships in assetsRelations below.
 *
 * Each of these tables has a Foreign Key (asset_id) that points to assets.id.
 * This creates a "one asset has many X" relationship for each table.
 */
import { valuations } from "./valuations";          // An asset has many valuations (value over time)
import { documents } from "./documents";             // An asset can have many documents (deeds, appraisals)
import { documentRequests } from "./document_requests"; // An asset can have many document requests
import { tasks } from "./tasks";                     // An asset can have many tasks (maintenance, reviews)

/**
 * ============================================================================
 * ASSETS TABLE DEFINITION
 * ============================================================================
 *
 * Kevin, assets are the CORE VALUE OBJECTS in wealth management.
 * This table stores information about each individual asset a client owns.
 *
 * An asset is anything of value: a house, stocks, a bank account, crypto, art, etc.
 *
 * REAL-WORLD EXAMPLES:
 *   - REAL ESTATE: "123 Main St" - a rental property worth $500,000
 *   - EQUITIES: "Apple Stock (AAPL)" - 1,000 shares worth $175,000
 *   - PRIVATE EQUITY: "Sequoia Fund XIV" - a $250,000 commitment to a VC fund
 *   - CRYPTO: "Bitcoin Holdings" - 2.5 BTC in a cold wallet
 *   - INSURANCE: "Northwestern Mutual Life Policy" - $1M death benefit
 *
 * OWNERSHIP CHAIN (assets are 4 levels deep):
 *   Org → Client → Entity → Asset
 *
 *   "Acme Wealth" (org) manages "John Smith" (client),
 *   who owns "Smith Family Trust" (entity),
 *   which holds "123 Main St Property" (asset).
 *
 * DESIGN DECISIONS:
 *   - asset_class enum: Standard categorization for portfolio reports
 *   - status enum: Lifecycle tracking (active → sold/transferred)
 *   - acquisition_date/cost: For cost basis and capital gain/loss calculations
 *   - current_value: Denormalized from latest valuation for quick queries
 *   - metadata JSONB: Asset-class-specific fields (different data for stocks vs real estate)
 *
 * WHY DENORMALIZE current_value?
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ DENORMALIZATION EXPLAINED:                                          │
 *   │                                                                     │
 *   │ "Denormalization" means storing the same data in two places on      │
 *   │ purpose, even though it breaks the DRY ("Don't Repeat Yourself")    │
 *   │ principle.                                                          │
 *   │                                                                     │
 *   │ The "true" source of an asset's value lives in the valuations       │
 *   │ table (a separate table with one row per appraisal/valuation).      │
 *   │ But 99% of queries need the CURRENT value:                          │
 *   │   "Show me all assets and their values for this client."            │
 *   │                                                                     │
 *   │ WITHOUT denormalization (slow):                                     │
 *   │   SELECT assets.*, (                                                │
 *   │     SELECT value FROM valuations                                    │
 *   │     WHERE asset_id = assets.id                                      │
 *   │     ORDER BY as_of_date DESC LIMIT 1                                │
 *   │   ) FROM assets WHERE entity_id = 'xyz'                             │
 *   │   → For each asset, scan the valuations table to find the latest    │
 *   │   → With 1000 assets and 50,000 valuations, this is SLOW            │
 *   │                                                                     │
 *   │ WITH denormalization (fast):                                        │
 *   │   SELECT * FROM assets WHERE entity_id = 'xyz'                      │
 *   │   → current_value is right there on the assets row. No extra query! │
 *   │                                                                     │
 *   │ TRADEOFF:                                                           │
 *   │   - READS are much faster (no join needed for current value)        │
 *   │   - WRITES require updating TWO places when a new valuation comes   │
 *   │   - "Eventual consistency" - there's a brief moment where the value │
 *   │     on assets might be stale until the update propagates            │
 *   │   - For wealth management, this is totally fine (values don't       │
 *   │     change every millisecond)                                       │
 *   └─────────────────────────────────────────────────────────────────────┘
 */

/**
 * export const assets = pgTable(...)
 *
 * BREAKDOWN (see clients.ts for detailed explanation):
 *   export   = Makes this available for other files to import
 *   const    = Declares a constant (value that won't change)
 *   assets   = The name we're giving this table in our TypeScript code
 *   pgTable  = The function that creates a PostgreSQL table
 *
 * pgTable takes 3 arguments:
 *   1. "assets"      = The actual table name in the database
 *   2. { columns }   = An object defining all the columns
 *   3. (table) => [] = A function that returns an array of indexes
 */
export const assets = pgTable(
  "assets", // This is the actual name of the table in PostgreSQL

  // ==================== COLUMNS ====================
  // This object defines every column in the table
  {
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ id: uuid("id").primaryKey().defaultRandom()                         │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ PRIMARY KEY (PK) - Unique identifier for this asset.                │
     * │                                                                     │
     * │ See clients.ts for a complete explanation of:                       │
     * │   - What a UUID is and why we use them                              │
     * │   - What a Primary Key is and its rules                             │
     * │   - What .defaultRandom() does                                      │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │   id:               TypeScript property name (assets.id)            │
     * │   uuid("id")        Creates UUID column named "id" in database      │
     * │   .primaryKey()     Makes this THE unique identifier for each row   │
     * │                     - UNIQUE (no two assets share the same id)      │
     * │                     - NOT NULL (every asset must have an id)         │
     * │                     - IMMUTABLE (never changes once set)             │
     * │   .defaultRandom()  Auto-generates a UUID if you don't provide one  │
     * │                                                                     │
     * │ Example value: "f47ac10b-58cc-4372-a567-0e02b2c3d479"               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ entityId: uuid("entity_id").notNull().references(...)               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ FOREIGN KEY (FK) - Points to the entity that holds this asset.      │
     * │                                                                     │
     * │ See clients.ts for a complete explanation of Foreign Keys,          │
     * │ .notNull(), .references(), and onDelete options.                    │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │   entityId:            TypeScript name (camelCase in code)          │
     * │   uuid("entity_id")    Database column name (snake_case in DB)      │
     * │   .notNull()           Every asset MUST belong to an entity         │
     * │                        (you can't have an unowned asset)            │
     * │   .references(...)     Creates the Foreign Key relationship         │
     * │                                                                     │
     * │ Kevin, here's the COMPLETE OWNERSHIP CHAIN using PKs and FKs:       │
     * │                                                                     │
     * │   ┌─────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
     * │   │  Orgs   │      │   Clients   │      │  Entities   │      │   Assets    │
     * │   ├─────────┤      ├─────────────┤      ├─────────────┤      ├─────────────┤
     * │   │ id (PK) │◄─FK──│ org_id (FK) │      │             │      │             │
     * │   │         │      │ id (PK)     │◄─FK──│ client_id   │      │             │
     * │   │         │      │             │      │ id (PK)     │◄─FK──│ entity_id   │
     * │   │         │      │             │      │             │      │ id (PK)     │
     * │   └─────────┘      └─────────────┘      └─────────────┘      └─────────────┘
     * │                                                                     │
     * │ Reading the diagram:                                                │
     * │ - Each table has its own Primary Key (PK) - the unique ID           │
     * │ - Each Foreign Key (FK) points to the Primary Key of its parent     │
     * │ - The arrow shows: FK ──► PK (Foreign Key points to Primary Key)    │
     * │                                                                     │
     * │ Real-world example:                                                 │
     * │ - Org: "Acme Wealth Management" (id: abc-123)                       │
     * │ - Client: "John Smith" (id: def-456, org_id: abc-123)               │
     * │ - Entity: "Smith Family Trust" (id: ghi-789, client_id: def-456)    │
     * │ - Asset: "123 Main St Property" (id: jkl-012, entity_id: ghi-789)  │
     * │                                                                     │
     * │ .references(() => entities.id, { onDelete: "cascade" })             │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ () => entities.id = "This column points to entities.id"    │   │
     * │   │                                                             │   │
     * │   │ { onDelete: "cascade" } = CASCADE DELETE:                   │   │
     * │   │   If you delete the PARENT entity, all its assets are       │   │
     * │   │   automatically deleted too.                                │   │
     * │   │                                                             │   │
     * │   │   Example: Delete "Smith Family Trust" (entity)             │   │
     * │   │     → "123 Main St Property" (asset) is auto-deleted        │   │
     * │   │     → "Apple Stock" (asset) is auto-deleted                 │   │
     * │   │     → All other assets in that entity are auto-deleted      │   │
     * │   │                                                             │   │
     * │   │   This cascades all the way up: if you delete the ORG,      │   │
     * │   │   it deletes its clients, which deletes their entities,     │   │
     * │   │   which deletes their assets (cascade chain).               │   │
     * │   │                                                             │   │
     * │   │   See clients.ts for other onDelete options:                │   │
     * │   │     "set null", "restrict", "no action"                     │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),

    // ==================== ASSET IDENTIFICATION ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ name: text("name").notNull()                                        │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The human-readable name of this asset.                              │
     * │                                                                     │
     * │ text("name")                                                        │
     * │   Creates a TEXT column named "name" in the database.               │
     * │   Can hold any string, no length limit.                             │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every asset MUST have a name. It cannot be empty.                 │
     * │   If you try to insert an asset without a name:                     │
     * │     INSERT INTO assets (entity_id) VALUES ('ghi-789')               │
     * │     → DATABASE ERROR: "name cannot be null"                         │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   "123 Main St, New York" (real estate)                             │
     * │   "Apple Inc (AAPL) - Vanguard" (equities)                          │
     * │   "Sequoia Capital Fund XIV" (private equity)                       │
     * │   "Bitcoin Cold Storage" (crypto)                                   │
     * │   "Picasso - Guernica Study" (collectibles)                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    name: text("name").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ description: text("description")                                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Optional free-text description of the asset.                        │
     * │                                                                     │
     * │ text("description")                                                 │
     * │   Creates a TEXT column named "description".                        │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - The value CAN be empty (null)                                   │
     * │   - Description is optional for an asset                            │
     * │   - Some assets are self-explanatory ("AAPL stock")                 │
     * │   - Others need more context                                        │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   "3-bedroom rental property, tenant lease expires 2025-06"         │
     * │   "Growth portfolio managed by Vanguard, auto-rebalancing"          │
     * │   null (no description provided)                                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    description: text("description"),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ assetClass: assetClassEnum("asset_class").notNull()                  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The category of this asset, using a database ENUM.                  │
     * │                                                                     │
     * │ assetClassEnum("asset_class")                                       │
     * │   Uses our ENUM type (defined in 00_enums.ts) for the column.       │
     * │   See entities.ts for a full explanation of what enums are.         │
     * │                                                                     │
     * │   This restricts the value to ONLY these options:                   │
     * │     "real_estate"           - Houses, buildings, land               │
     * │     "equities"              - Stocks (public company shares)        │
     * │     "fixed_income"          - Bonds, CDs, treasury bills            │
     * │     "private_equity"        - Ownership in private companies        │
     * │     "venture_capital"       - Investments in startups               │
     * │     "hedge_funds"           - Alternative investment funds          │
     * │     "commodities"           - Gold, oil, agricultural products      │
     * │     "cash"                  - Bank accounts, money market           │
     * │     "crypto"                - Bitcoin, Ethereum, etc.               │
     * │     "collectibles"          - Art, wine, classic cars               │
     * │     "intellectual_property" - Patents, trademarks, royalties        │
     * │     "insurance"             - Life insurance policies               │
     * │     "other"                 - Anything that doesn't fit above       │
     * │                                                                     │
     * │   If you try to insert an invalid value:                            │
     * │     INSERT INTO assets (asset_class) VALUES ('dogs')                │
     * │     → DATABASE ERROR: "invalid input value for enum asset_class"    │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every asset MUST have a class. It cannot be empty.                │
     * │   This is required because portfolio reports group assets by class:  │
     * │     "60% equities, 20% real_estate, 10% fixed_income, 10% cash"    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    assetClass: assetClassEnum("asset_class").notNull(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ status: assetStatusEnum("status").notNull().default("active")       │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The lifecycle status of this asset, using a database ENUM.           │
     * │                                                                     │
     * │ assetStatusEnum("status")                                           │
     * │   Uses our ENUM type (defined in 00_enums.ts) for the column.       │
     * │                                                                     │
     * │   This restricts the value to ONLY these options:                   │
     * │     "active"      - Currently held and valued (normal state)        │
     * │     "pending"     - Acquisition in progress (closing on a house)    │
     * │     "sold"        - Disposed of (kept for tax/historical reporting) │
     * │     "transferred" - Moved to another entity (personal → trust)      │
     * │                                                                     │
     * │ .notNull()                                                          │
     * │   Every asset MUST have a status. It cannot be empty.               │
     * │                                                                     │
     * │ .default("active")                                                  │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ DEFAULT VALUES EXPLAINED:                                   │   │
     * │   │                                                             │   │
     * │   │ If you insert an asset WITHOUT specifying a status:         │   │
     * │   │   INSERT INTO assets (name, entity_id, asset_class)        │   │
     * │   │   VALUES ('My House', 'ghi-789', 'real_estate')            │   │
     * │   │   → status is automatically set to "active"                │   │
     * │   │                                                             │   │
     * │   │ This makes sense because most new assets are "active"      │   │
     * │   │ (you're recording them because you currently own them).     │   │
     * │   │                                                             │   │
     * │   │ You can still override the default:                        │   │
     * │   │   INSERT INTO assets (..., status) VALUES (..., 'pending') │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ WHY KEEP SOLD ASSETS?                                               │
     * │   When an asset is sold, we don't DELETE it from the database.      │
     * │   We change its status to "sold" instead. Why?                      │
     * │   - Tax reporting needs historical data (capital gains/losses)      │
     * │   - Audit trail: regulators may ask "what did you sell in 2024?"    │
     * │   - Performance reporting: "portfolio returned 12% including sales" │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    status: assetStatusEnum("status").notNull().default("active"),

    // ==================== ACQUISITION DETAILS ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ acquisitionDate: timestamp("acquisition_date", { withTimezone: true })│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The date/time when the asset was acquired (purchased, received, etc.)│
     * │                                                                     │
     * │ timestamp("acquisition_date", { withTimezone: true })               │
     * │   Creates a TIMESTAMP column that stores date AND time.             │
     * │   { withTimezone: true } = Also stores timezone info                │
     * │   Example value: "2020-06-15T00:00:00-05:00"                        │
     * │                                                                     │
     * │   See clients.ts for a full explanation of timestamps.             │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - The value CAN be empty (null)                                   │
     * │   - Not all assets have a known acquisition date                    │
     * │   - Inherited assets or long-held assets may not have exact dates   │
     * │                                                                     │
     * │ WHY TRACK THIS?                                                     │
     * │   - COST BASIS PERIOD: Short-term vs long-term capital gains        │
     * │     (assets held > 1 year get favorable tax treatment in the US)    │
     * │   - REPORTING: "When was this asset added to the portfolio?"        │
     * │   - COMPLIANCE: Regulators may require acquisition history          │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   "2020-06-15" (bought a house on June 15, 2020)                    │
     * │   "2023-01-03" (purchased stocks on January 3, 2023)                │
     * │   null (inherited assets with unknown acquisition date)             │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    acquisitionDate: timestamp("acquisition_date", { withTimezone: true }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ acquisitionCost: numeric("acquisition_cost", { precision: 18, scale: 2 })│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ How much was paid to acquire this asset (the original cost).         │
     * │                                                                     │
     * │ numeric("acquisition_cost", { precision: 18, scale: 2 })            │
     * │   Creates a NUMERIC column for precise money values.                │
     * │                                                                     │
     * │   precision: 18 = Up to 18 total digits                             │
     * │   scale: 2      = Exactly 2 digits after the decimal point          │
     * │                                                                     │
     * │   This means the column can hold values like:                       │
     * │     "500000.00"           ($500,000 for a house)                     │
     * │     "175.50"              ($175.50 per share)                        │
     * │     "250000.00"           ($250,000 PE fund commitment)              │
     * │     "0.01"                (smallest: one cent)                       │
     * │     "9999999999999999.99" (largest: ~$10 quadrillion)                │
     * │                                                                     │
     * │   IMPORTANT: This comes back as a STRING in TypeScript!             │
     * │   asset.acquisitionCost = "500000.00" (not 500000)                  │
     * │   To use as a number: parseFloat(asset.acquisitionCost)             │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - Not all assets have a known acquisition cost                    │
     * │   - Inherited or gifted assets may not have a cost basis            │
     * │                                                                     │
     * │ WHY TRACK THIS?                                                     │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ COST BASIS EXPLAINED:                                       │   │
     * │   │                                                             │   │
     * │   │ "Cost basis" is the original price you paid for an asset.   │   │
     * │   │ When you sell, the GAIN or LOSS is:                         │   │
     * │   │                                                             │   │
     * │   │   Gain/Loss = Sale Price - Acquisition Cost                 │   │
     * │   │                                                             │   │
     * │   │ Example:                                                    │   │
     * │   │   Bought house for $500,000 (acquisition_cost)              │   │
     * │   │   Sold house for  $700,000 (sale price)                     │   │
     * │   │   Capital Gain  = $200,000 (taxable!)                       │   │
     * │   │                                                             │   │
     * │   │ Without the acquisition cost, you can't calculate taxes.    │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    acquisitionCost: numeric("acquisition_cost", { precision: 18, scale: 2 }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ currency: text("currency").default("USD")                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The currency that acquisition_cost and current_value are stored in.  │
     * │                                                                     │
     * │ text("currency")                                                    │
     * │   Creates a TEXT column named "currency".                           │
     * │                                                                     │
     * │ .default("USD")                                                     │
     * │   If no currency is specified, defaults to US Dollars.              │
     * │   Most assets in a US wealth management firm are in USD.            │
     * │                                                                     │
     * │ NO .notNull() means this is technically NULLABLE:                   │
     * │   - But with .default("USD"), it will almost always have a value    │
     * │   - You'd only set it to something else for international assets    │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   "USD" (US Dollar - the default)                                   │
     * │   "EUR" (Euro - for European properties)                            │
     * │   "GBP" (British Pound)                                             │
     * │   "BTC" (Bitcoin - for crypto assets)                               │
     * │   "JPY" (Japanese Yen)                                              │
     * │                                                                     │
     * │ WHY TRACK CURRENCY?                                                 │
     * │   Wealthy clients often hold assets in multiple currencies.         │
     * │   To calculate total portfolio value, you need to know each         │
     * │   asset's currency so you can convert them all to one base currency.│
     * └─────────────────────────────────────────────────────────────────────┘
     */
    currency: text("currency").default("USD"),

    // ==================== DENORMALIZED CURRENT VALUE ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ currentValue: numeric("current_value", { precision: 18, scale: 2 }) │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ The CURRENT market value of this asset (denormalized).              │
     * │                                                                     │
     * │ numeric("current_value", { precision: 18, scale: 2 })              │
     * │   Same as acquisition_cost: precise decimal for money values.       │
     * │   precision: 18, scale: 2 → up to 18 digits, 2 after decimal.      │
     * │   See acquisitionCost above for full numeric explanation.           │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - New assets may not have been valued yet                         │
     * │   - Some illiquid assets (like art) are hard to value               │
     * │                                                                     │
     * │ THIS IS A DENORMALIZED FIELD:                                       │
     * │   ┌─────────────────────────────────────────────────────────────┐   │
     * │   │ The "true" value history lives in the VALUATIONS table.    │   │
     * │   │ This field is a COPY of the latest valuation for speed.    │   │
     * │   │                                                             │   │
     * │   │ When a new valuation is recorded in the valuations table:   │   │
     * │   │   1. INSERT INTO valuations (asset_id, value, ...)          │   │
     * │   │   2. UPDATE assets SET current_value = new_value,           │   │
     * │   │                        valued_at = new_date                 │   │
     * │   │      WHERE id = asset_id                                    │   │
     * │   │                                                             │   │
     * │   │ This way, queries like "show all assets with their values"  │   │
     * │   │ don't need to JOIN the valuations table at all.             │   │
     * │   │                                                             │   │
     * │   │ See the table header comment for full denormalization       │   │
     * │   │ explanation.                                                │   │
     * │   └─────────────────────────────────────────────────────────────┘   │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   "750000.00" (a house currently worth $750,000)                    │
     * │   "175250.00" (1,000 shares of AAPL at $175.25 each)               │
     * │   null (newly added asset, no valuation yet)                        │
     * │                                                                     │
     * │ IMPORTANT: Comes back as a STRING in TypeScript!                    │
     * │   parseFloat(asset.currentValue) to use as a number.               │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    currentValue: numeric("current_value", { precision: 18, scale: 2 }),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ valuedAt: timestamp("valued_at", { withTimezone: true })            │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ WHEN the current_value was last updated (from the latest valuation).│
     * │                                                                     │
     * │ timestamp("valued_at", { withTimezone: true })                      │
     * │   Creates a TIMESTAMP column that stores date AND time.             │
     * │   { withTimezone: true } = Also stores timezone info.               │
     * │   See clients.ts for a full explanation of timestamps.             │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - If current_value is null, valued_at is also null                │
     * │   - Asset hasn't been valued yet                                    │
     * │                                                                     │
     * │ THIS PAIRS WITH current_value:                                      │
     * │   Together they answer: "What is this asset worth, and when was     │
     * │   that value determined?"                                           │
     * │                                                                     │
     * │ Example:                                                            │
     * │   current_value = "750000.00", valued_at = "2024-06-01T10:00:00Z"  │
     * │   → "This asset was worth $750,000 as of June 1, 2024 at 10am UTC" │
     * │                                                                     │
     * │ WHY TRACK THE VALUATION DATE?                                       │
     * │   A value from 3 years ago is very different from one from today.   │
     * │   The UI might show: "$750,000 (valued 2 days ago)" vs              │
     * │                      "$750,000 (valued 3 years ago) ⚠️ STALE"       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    valuedAt: timestamp("valued_at", { withTimezone: true }),

    // ==================== EXTERNAL REFERENCE ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ externalId: text("external_id")                                     │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Optional ID from an external system (for integrations/syncing).     │
     * │                                                                     │
     * │ text("external_id")                                                 │
     * │   Creates a TEXT column named "external_id".                        │
     * │                                                                     │
     * │ NO .notNull() means this is NULLABLE:                               │
     * │   - Not all assets come from external systems                       │
     * │   - Manually entered assets won't have one                          │
     * │                                                                     │
     * │ WHY: When data is synced from other systems (like Plaid for bank    │
     * │ accounts, or a brokerage API), we need to match OUR records with    │
     * │ THEIR records. The external_id stores their identifier so we can    │
     * │ say "this asset in our system = that account in their system."      │
     * │                                                                     │
     * │ Examples:                                                           │
     * │   "PLD-ACC-12345" (Plaid account ID for a bank account)             │
     * │   "VGD-9876543" (Vanguard brokerage account number)                 │
     * │   "123-456-7890" (property parcel number from county records)       │
     * │   null (manually entered asset, no external system)                 │
     * │                                                                     │
     * │ COMMON QUERY:                                                       │
     * │   "Find our asset record for Plaid account PLD-ACC-12345"           │
     * │   SELECT * FROM assets WHERE external_id = 'PLD-ACC-12345'          │
     * │   (We have an index on this column to make this query fast!)        │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    externalId: text("external_id"),

    // ==================== ASSET-CLASS-SPECIFIC METADATA ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ metadata: jsonb("metadata").$type<AssetMetadata>().default({})      │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ JSONB column for flexible, asset-class-specific data.               │
     * │                                                                     │
     * │ See clients.ts for a full explanation of JSONB columns and          │
     * │ .$type<>() type annotations.                                       │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │                                                                     │
     * │ jsonb("metadata")                                                   │
     * │   Creates a JSONB column. JSONB stores structured data.             │
     * │                                                                     │
     * │ .$type<AssetMetadata>()                                             │
     * │   Tells TypeScript what SHAPE the JSON should have.                 │
     * │   AssetMetadata is defined below - it's a TypeScript interface.     │
     * │   This gives us autocomplete and type checking!                     │
     * │                                                                     │
     * │ .default({})                                                        │
     * │   If no metadata is provided, use an empty object {}.               │
     * │   New assets start with no metadata, added later as needed.         │
     * │                                                                     │
     * │ WHY USE JSONB FOR ASSET METADATA?                                   │
     * │   Different asset classes need VERY different fields:               │
     * │                                                                     │
     * │   Real Estate might have:                                           │
     * │     {                                                               │
     * │       "propertyAddress": { "street": "123 Main St", "city": "NYC" },│
     * │       "propertyType": "residential",                                │
     * │       "squareFeet": 2500,                                           │
     * │       "yearBuilt": 1998,                                            │
     * │       "mortgageBalance": 350000                                     │
     * │     }                                                               │
     * │                                                                     │
     * │   Equities might have:                                              │
     * │     {                                                               │
     * │       "ticker": "AAPL",                                             │
     * │       "shares": 1000,                                               │
     * │       "brokerageAccount": "VGD-9876543"                             │
     * │     }                                                               │
     * │                                                                     │
     * │   Crypto might have:                                                │
     * │     {                                                               │
     * │       "walletAddress": "bc1q...",                                   │
     * │       "blockchain": "bitcoin",                                      │
     * │       "tokenSymbol": "BTC",                                         │
     * │       "quantity": 2.5                                               │
     * │     }                                                               │
     * │                                                                     │
     * │   Instead of having 30+ columns that are NULL for most assets,      │
     * │   we use ONE flexible JSONB column that stores whatever is relevant │
     * │   for that specific asset class.                                    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    metadata: jsonb("metadata").$type<AssetMetadata>().default({}),

    // ==================== STANDARD TIMESTAMPS ====================

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ createdAt: timestamp("created_at", { withTimezone: true })          │
     * │   .notNull().defaultNow()                                           │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this asset record was created in our database.          │
     * │ (Different from acquisitionDate, which is when the asset was bought!)│
     * │                                                                     │
     * │ See clients.ts for a full explanation of:                           │
     * │   - timestamp with timezone                                         │
     * │   - .notNull()                                                      │
     * │   - .defaultNow()                                                   │
     * │                                                                     │
     * │ QUICK SUMMARY:                                                      │
     * │   timestamp("created_at", { withTimezone: true })                   │
     * │     Creates a timestamp column with timezone info.                  │
     * │   .notNull()                                                        │
     * │     Every row must have a created_at time.                          │
     * │   .defaultNow()                                                     │
     * │     Automatically set to the current time when the row is inserted. │
     * │                                                                     │
     * │ Example: You enter a property bought in 2020 into the system today. │
     * │   acquisitionDate = "2020-06-15" (when you BOUGHT the house)        │
     * │   createdAt = "2024-11-20" (when you ENTERED IT in the database)    │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ updatedAt: timestamp("updated_at", { withTimezone: true })          │
     * │   .notNull().defaultNow().$onUpdate(() => new Date())               │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Records WHEN this asset record was last modified.                    │
     * │                                                                     │
     * │ Same as createdAt, plus:                                            │
     * │                                                                     │
     * │ .$onUpdate(() => new Date())                                        │
     * │   AUTOMATICALLY updates this timestamp whenever the row is modified.│
     * │   Drizzle handles this in application code - not the database.      │
     * │                                                                     │
     * │   Example: You update the asset's name from "Main St" to            │
     * │   "123 Main St Property":                                           │
     * │     → updatedAt automatically changes to the current time           │
     * │     → createdAt stays the same (it never changes)                   │
     * │                                                                     │
     * │ See clients.ts for a full explanation of .$onUpdate().              │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

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
   * This is a function that receives the table and returns an array of INDEXES.
   *
   * See clients.ts for a full explanation of what indexes are and why we need them.
   *
   * QUICK SUMMARY:
   *   An index is like the index at the back of a book.
   *   Without an index: To find something, scan every row (SLOW).
   *   With an index: Look up the value in a "lookup table" (FAST).
   *
   * TRADEOFF:
   *   - Indexes make READS faster (SELECT queries)
   *   - Indexes make WRITES slower (INSERT/UPDATE must update the index too)
   *   - Only add indexes for columns you frequently search/filter by
   */
  (table) => [
    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("assets_entity_id_idx").on(table.entityId)                    │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index named "assets_entity_id_idx" on the entity_id      │
     * │ column.                                                             │
     * │                                                                     │
     * │ WHY: The most common query for assets is "get all assets for an     │
     * │ entity." Every time you view an entity's holdings page, this fires: │
     * │                                                                     │
     * │   SELECT * FROM assets WHERE entity_id = 'ghi-789'                  │
     * │                                                                     │
     * │ Without this index: Database scans every asset row to find matches  │
     * │   → With 100,000 assets across all clients, this is SLOW            │
     * │ With this index: Database looks up entity_id in the index, jumps    │
     * │   directly to matching rows                                         │
     * │   → Instant, even with millions of assets                           │
     * │                                                                     │
     * │ NAMING CONVENTION: tablename_columnname_idx                         │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("assets_entity_id_idx").on(table.entityId),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("assets_entity_class_idx").on(table.entityId, table.assetClass)│
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on TWO columns: entity_id AND asset_class.        │
     * │                                                                     │
     * │ See entities.ts for a full explanation of composite indexes.        │
     * │                                                                     │
     * │ WHY: For queries like "Get all real estate assets for this entity": │
     * │   SELECT * FROM assets                                              │
     * │     WHERE entity_id = 'ghi-789' AND asset_class = 'real_estate'     │
     * │                                                                     │
     * │ Also supports portfolio allocation reports:                          │
     * │   "How much of this entity's value is in equities vs real estate?"  │
     * │                                                                     │
     * │ COLUMN ORDER MATTERS (leftmost-prefix rule):                        │
     * │   This index can be used for:                                       │
     * │   ✓ WHERE entity_id = 'x'                       (first col alone)  │
     * │   ✓ WHERE entity_id = 'x' AND asset_class = 'y' (both cols)        │
     * │   ✗ WHERE asset_class = 'y'                      (second col alone) │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("assets_entity_class_idx").on(table.entityId, table.assetClass),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("assets_entity_status_idx").on(table.entityId, table.status)  │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ A COMPOSITE INDEX on TWO columns: entity_id AND status.             │
     * │                                                                     │
     * │ WHY: For queries like "Show only ACTIVE assets for this entity":    │
     * │   SELECT * FROM assets                                              │
     * │     WHERE entity_id = 'ghi-789' AND status = 'active'               │
     * │                                                                     │
     * │ This is extremely common because most views HIDE sold/transferred   │
     * │ assets by default:                                                  │
     * │   - Dashboard: "Show active assets only"                            │
     * │   - Portfolio summary: "Only include active assets in totals"       │
     * │   - Reporting: "Show me sold assets for tax purposes"               │
     * │     (status = 'sold')                                               │
     * │                                                                     │
     * │ COLUMN ORDER: Same leftmost-prefix rule as above.                   │
     * │   ✓ WHERE entity_id = 'x'                  (uses index)             │
     * │   ✓ WHERE entity_id = 'x' AND status = 'y' (uses index)            │
     * │   ✗ WHERE status = 'y'                      (can't use index)       │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("assets_entity_status_idx").on(table.entityId, table.status),

    /**
     * ┌─────────────────────────────────────────────────────────────────────┐
     * │ index("assets_external_id_idx").on(table.externalId)                │
     * ├─────────────────────────────────────────────────────────────────────┤
     * │ Creates an index on the external_id column alone.                   │
     * │                                                                     │
     * │ WHY: For integration/sync lookups. When an external system (like    │
     * │ Plaid or a brokerage API) sends us updated data, we need to find    │
     * │ our matching asset record FAST:                                     │
     * │                                                                     │
     * │   SELECT * FROM assets WHERE external_id = 'PLD-ACC-12345'          │
     * │                                                                     │
     * │ Without this index: Scan every asset to find the match (SLOW).      │
     * │ With this index: Direct lookup by external_id (FAST).               │
     * │                                                                     │
     * │ NOTE: Unlike the entity-based indexes above, this index is NOT      │
     * │ scoped to an entity. External IDs are globally unique (they come    │
     * │ from outside our system), so we search across ALL assets.           │
     * └─────────────────────────────────────────────────────────────────────┘
     */
    index("assets_external_id_idx").on(table.externalId),
  ]
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ AssetMetadata interface                                                 │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ This defines the SHAPE of the JSON stored in the "metadata" column.     │
 * │ TypeScript uses this for autocomplete and error checking.               │
 * │                                                                         │
 * │ The "?" after each property means it's OPTIONAL (can be undefined).     │
 * │ Different asset classes will have different fields populated.            │
 * │                                                                         │
 * │ WHAT IS AN INTERFACE?                                                   │
 * │   A TypeScript interface is a "blueprint" that describes what           │
 * │   properties an object can have and what type each property is.         │
 * │   It doesn't create anything in the database - it's purely for         │
 * │   TypeScript to give you autocomplete and catch mistakes.               │
 * │                                                                         │
 * │ WHY ONE BIG INTERFACE INSTEAD OF SEPARATE ONES PER ASSET CLASS?         │
 * │   The JSONB column stores data as a single blob. TypeScript can't       │
 * │   know at compile time which asset class a row belongs to, so we        │
 * │   make all fields optional. In practice, only relevant fields are set:  │
 * │                                                                         │
 * │   Real estate asset: { propertyAddress: {...}, squareFeet: 2500 }       │
 * │     → ticker, shares, walletAddress are all undefined                   │
 * │                                                                         │
 * │   Stock asset: { ticker: "AAPL", shares: 1000 }                         │
 * │     → propertyAddress, squareFeet are all undefined                     │
 * │                                                                         │
 * │ See clients.ts (ClientProfile) for a similar pattern.                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export interface AssetMetadata {
  // ==================== REAL ESTATE ====================
  /**
   * propertyAddress: The physical address of the property.
   * Uses a nested object with standard address fields.
   * Example: { street: "123 Main St", city: "New York", state: "NY", postalCode: "10001", country: "US" }
   *
   * Each sub-field is optional (?) because you might not have the full address.
   */
  propertyAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  /**
   * propertyType: What kind of real estate this is.
   * Uses a TypeScript union type: only "residential", "commercial", "land", or "industrial" allowed.
   * Example: "residential" (a house or apartment building)
   */
  propertyType?: "residential" | "commercial" | "land" | "industrial";

  /**
   * squareFeet: The size of the property in square feet.
   * Example: 2500 (a 2,500 sq ft home)
   */
  squareFeet?: number;

  /**
   * yearBuilt: The year the building was constructed.
   * Example: 1998
   */
  yearBuilt?: number;

  /**
   * mortgageBalance: How much is still owed on the mortgage.
   * Example: 350000 ($350,000 remaining on the loan)
   * Note: This is stored as a number here (not numeric like the column)
   * because JSONB stores JavaScript numbers, not SQL numeric types.
   */
  mortgageBalance?: number;

  // ==================== EQUITIES / SECURITIES ====================
  /**
   * ticker: The stock ticker symbol (used on stock exchanges).
   * Example: "AAPL" (Apple), "GOOGL" (Google), "MSFT" (Microsoft)
   */
  ticker?: string;

  /**
   * cusip: A unique 9-character ID for securities (like a Social Security Number for stocks).
   * CUSIP = Committee on Uniform Securities Identification Procedures.
   * Example: "037833100" (Apple Inc.)
   * Used for regulatory reporting and institutional trading.
   */
  cusip?: string;

  /**
   * shares: The number of shares owned.
   * Example: 1000 (you own 1,000 shares of AAPL)
   */
  shares?: number;

  /**
   * brokerageAccount: The account number at the brokerage firm.
   * Example: "VGD-9876543" (a Vanguard account number)
   */
  brokerageAccount?: string;

  // ==================== PRIVATE EQUITY / VENTURE ====================
  /**
   * fundName: The name of the private equity or venture capital fund.
   * Example: "Sequoia Capital Fund XIV"
   */
  fundName?: string;

  /**
   * vintageYear: The year the fund was established/started investing.
   * Example: 2022 (a 2022-vintage fund)
   * Used for performance benchmarking against other funds from the same year.
   */
  vintageYear?: number;

  /**
   * commitmentAmount: Total amount committed (promised) to the fund.
   * Example: 250000 ($250,000 committed - not all called yet)
   * In PE/VC, you commit a total amount but the fund "calls" it over time.
   */
  commitmentAmount?: number;

  /**
   * calledCapital: How much of your commitment has been "called" (actually paid).
   * Example: 150000 ($150,000 called out of $250,000 committed)
   */
  calledCapital?: number;

  /**
   * distributions: Money returned to you from the fund (profits, return of capital).
   * Example: 75000 ($75,000 distributed back to you so far)
   */
  distributions?: number;

  // ==================== CRYPTO ====================
  /**
   * walletAddress: The blockchain wallet address where the crypto is stored.
   * Example: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" (a Bitcoin address)
   */
  walletAddress?: string;

  /**
   * blockchain: Which blockchain network this crypto is on.
   * Example: "bitcoin", "ethereum", "solana"
   */
  blockchain?: string;

  /**
   * tokenSymbol: The symbol for the cryptocurrency.
   * Example: "BTC" (Bitcoin), "ETH" (Ethereum), "SOL" (Solana)
   */
  tokenSymbol?: string;

  /**
   * quantity: How many tokens/coins are held.
   * Example: 2.5 (you own 2.5 Bitcoin)
   */
  quantity?: number;

  // ==================== INSURANCE ====================
  /**
   * policyNumber: The insurance policy identification number.
   * Example: "NWM-2024-ABC123"
   */
  policyNumber?: string;

  /**
   * carrier: The insurance company providing the policy.
   * Example: "Northwestern Mutual", "New York Life"
   */
  carrier?: string;

  /**
   * beneficiaries: People/entities who receive the insurance payout.
   * Example: ["Jane Smith", "Smith Family Trust"]
   */
  beneficiaries?: string[];

  /**
   * premiumAmount: How much is paid periodically for the insurance.
   * Example: 12000 ($12,000/year in premiums)
   */
  premiumAmount?: number;

  /**
   * deathBenefit: The amount paid out upon the insured person's death.
   * Example: 1000000 ($1,000,000 death benefit)
   */
  deathBenefit?: number;

  // ==================== GENERAL ====================
  /**
   * notes: Free-form notes about this asset.
   * Example: "Tenant lease expires June 2025. Property manager: ABC Realty."
   */
  notes?: string;

  /**
   * tags: Labels/categories for organizing and filtering assets.
   * Example: ["high-priority", "needs-review", "tax-loss-harvest-candidate"]
   */
  tags?: string[];

  /**
   * customFields: Flexible key-value pairs for any additional data.
   * Record<string, unknown> means: any string key, any value type.
   * Example: { "insurancePolicyLinked": true, "lastInspectionDate": "2024-03-15" }
   *
   * See entities.ts (EntityMetadata) for a similar pattern.
   */
  customFields?: Record<string, unknown>;
}

/**
 * Asset Relations
 *
 * Kevin, assets are near the bottom of the ownership hierarchy:
 *
 * COMPLETE HIERARCHY (4 levels deep):
 *   Org ──► Client ──► Entity ──► Asset ──► Valuation
 *                                   ▲
 *                              (you are here)
 *
 * TRAVERSING THE FULL CHAIN (from asset to org):
 *   asset.entity.client.org
 *
 * PSEUDOCODE:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ SQL REFRESHER (see org_members.ts for full breakdown):              │
 *   │                                                                     │
 *   │ SELECT * FROM [table] WHERE [column] = [value]                      │
 *   │   "Fetch all columns from [table] where [column] matches [value]"   │
 *   │                                                                     │
 *   │ DESC = "descending order" (newest first, highest first)             │
 *   │ LIMIT 10 = "only give me the first 10 results"                     │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   For each asset:
 *     asset.entity       → "Find the ONE entity that holds this asset" (go UP)
 *                          SELECT * FROM entities WHERE id = asset.entity_id
 *     asset.valuations   → "Find ALL valuations for this asset" (go DOWN)
 *                          SELECT * FROM valuations WHERE asset_id = asset.id
 *     asset.documents    → "Find ALL documents for this asset"
 *                          SELECT * FROM documents WHERE asset_id = asset.id
 *
 * QUERY EXAMPLE - Get full context for an asset:
 *   const asset = await db.query.assets.findFirst({
 *     where: eq(assets.id, assetId),
 *     with: {
 *       entity: {              // ONE - go up to entity
 *         with: {
 *           client: {          // ONE - go up to client
 *             with: {
 *               org: true,     // ONE - go up to org
 *             },
 *           },
 *         },
 *       },
 *       valuations: {          // MANY - go down to valuations
 *         orderBy: desc(valuations.asOfDate),
 *         limit: 10,
 *       },
 *     },
 *   });
 *
 *   // Now you have: asset.entity.client.org.name
 */
export const assetsRelations = relations(assets, ({ one, many }) => ({
  /**
   * ONE relationship: Asset belongs to ONE Entity (going UP)
   *
   * one(entities, { ... }) means:
   *   - "An asset is held by exactly ONE entity"
   *   - fields: FK on this table (assets.entity_id)
   *   - references: PK on parent table (entities.id)
   *
   * SQL: SELECT * FROM entities WHERE id = asset.entity_id
   */
  entity: one(entities, {
    fields: [assets.entityId],   // FK on THIS table
    references: [entities.id],   // PK on PARENT table
  }),

  /**
   * MANY relationship: Asset has MANY Valuations (going DOWN)
   *
   * many(valuations) means:
   *   - "An asset has a time-series of valuations"
   *   - FK (asset_id) is on valuations table
   *   - This is how we track value over time
   *
   * SQL: SELECT * FROM valuations WHERE asset_id = asset.id
   */
  valuations: many(valuations),

  /**
   * MANY relationship: Asset has MANY Documents
   *
   * Documents like deeds, appraisals, purchase agreements
   */
  documents: many(documents),

  /**
   * MANY relationship: Asset has MANY DocumentRequests
   */
  documentRequests: many(documentRequests),

  /**
   * MANY relationship: Asset has MANY Tasks
   */
  tasks: many(tasks),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ export type Asset = typeof assets.$inferSelect                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Creates a TypeScript type representing an ASSET ROW from the database.  │
 * │ Used when you SELECT (read) data FROM the database.                     │
 * │                                                                         │
 * │ $inferSelect = "Infer the type for selecting data"                      │
 * │                                                                         │
 * │ See clients.ts for a full explanation of $inferSelect.                 │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const asset: Asset = await db.query.assets.findFirst();               │
 * │   asset.name           // TypeScript knows: string                      │
 * │   asset.description    // TypeScript knows: string | null               │
 * │   asset.assetClass     // TypeScript knows: "real_estate" | "equities" | ...│
 * │   asset.status         // TypeScript knows: "active" | "pending" | ...  │
 * │   asset.currentValue   // TypeScript knows: string | null (numeric = string!)│
 * │   asset.acquisitionCost // TypeScript knows: string | null              │
 * │   asset.metadata       // TypeScript knows: AssetMetadata               │
 * │   asset.createdAt      // TypeScript knows: Date                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export type Asset = typeof assets.$inferSelect;

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ export type NewAsset = typeof assets.$inferInsert                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Creates a TypeScript type for INSERTING a new asset.                     │
 * │ Some fields are optional (have defaults), so this type reflects that.   │
 * │                                                                         │
 * │ $inferInsert = "Infer the type for inserting data"                      │
 * │                                                                         │
 * │ See clients.ts for a full explanation of $inferInsert.                 │
 * │                                                                         │
 * │ USAGE:                                                                  │
 * │   const newAsset: NewAsset = {                                          │
 * │     entityId: "ghi-789",            // Required (FK to entity)          │
 * │     name: "123 Main St Property",   // Required                         │
 * │     assetClass: "real_estate",      // Required (must be valid enum)    │
 * │     // status defaults to "active"                                      │
 * │     // currency defaults to "USD"                                       │
 * │     // metadata defaults to {}                                          │
 * │     // createdAt defaults to now                                        │
 * │     // updatedAt defaults to now                                        │
 * │     // id auto-generates a UUID                                         │
 * │     // description, acquisitionDate, acquisitionCost, currentValue,     │
 * │     //   valuedAt, externalId are all optional (nullable)               │
 * │   };                                                                    │
 * │   await db.insert(assets).values(newAsset);                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export type NewAsset = typeof assets.$inferInsert;
