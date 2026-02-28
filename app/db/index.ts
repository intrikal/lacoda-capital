/**
 * ============================================================================
 * FILE: /app/db/index.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   The database connection setup. This file creates and exports the `db`
 *   object that the entire application uses to talk to PostgreSQL.
 *
 * WHAT IS A DATABASE CONNECTION?
 *   Your app and PostgreSQL are two separate programs (often on separate servers).
 *   To communicate, the app must open a "connection" — a network link to the
 *   database. Connections are expensive to create (~50-100ms each) because they
 *   involve TCP handshakes, TLS negotiation, and authentication.
 *
 * WHAT IS A CONNECTION POOL?
 *   Instead of creating a new connection for every request (slow), we create
 *   a POOL of persistent connections that are REUSED.
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Without a pool (bad):                                            │
 *   │   Request 1 → Create connection → Query → Close connection       │
 *   │   Request 2 → Create connection → Query → Close connection       │
 *   │   Request 3 → Create connection → Query → Close connection       │
 *   │   Each request pays the ~100ms connection cost.                   │
 *   │                                                                  │
 *   │ With a pool (good):                                              │
 *   │   Startup  → Create 10 connections (keep them alive)             │
 *   │   Request 1 → Borrow connection → Query → Return to pool         │
 *   │   Request 2 → Borrow connection → Query → Return to pool         │
 *   │   Request 3 → Borrow connection → Query → Return to pool         │
 *   │   Connections are reused — no creation overhead per request.      │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * WHAT IS DRIZZLE ORM?
 *   ORM = Object-Relational Mapper
 *
 *   It translates between:
 *     JavaScript objects ←→ Database rows (SQL)
 *
 *   Without ORM: you write raw SQL strings (error-prone, no type safety)
 *     db.query("SELECT * FROM clients WHERE org_id = $1", [orgId])
 *
 *   With Drizzle: you write type-safe JavaScript
 *     db.select().from(clients).where(eq(clients.orgId, orgId))
 *     → TypeScript catches typos, gives autocomplete, prevents SQL injection
 *
 * WHAT IS pg (node-postgres)?
 *   The underlying PostgreSQL driver for Node.js. It handles the raw TCP
 *   connection to PostgreSQL. Drizzle sits on TOP of pg.
 *
 *   Stack: Your code → Drizzle ORM → pg driver → TCP → PostgreSQL
 *
 * DATABASE_URL FORMAT:
 *   postgresql://username:password@host:port/database_name?sslmode=require
 *
 *   Example: postgresql://admin:secret123@db.supabase.co:5432/postgres
 *     username = admin
 *     password = secret123
 *     host     = db.supabase.co (Supabase's database server)
 *     port     = 5432 (PostgreSQL's default port)
 *     database = postgres (the database name)
 *
 * WHY TWO DATABASE URLs?
 *   In the environment, you'll find two URLs:
 *   - DATABASE_URL = Goes through PgBouncer (a connection pooler)
 *     → Used for application queries (SELECT, INSERT, UPDATE, DELETE)
 *     → PgBouncer manages many app connections → few database connections
 *
 *   - DIRECT_URL = Goes directly to PostgreSQL (no pooler)
 *     → Used for migrations/DDL (CREATE TABLE, ALTER TABLE, etc.)
 *     → PgBouncer doesn't support some DDL commands properly
 *     → See drizzle.config.ts
 */

// ─── IMPORTS ────────────────────────────────────────────────────────────────────

/**
 * drizzle — The function that creates a Drizzle ORM client.
 * It wraps a raw database connection (Pool) and adds type-safe query building.
 *
 * "drizzle-orm/node-postgres" specifies the adapter for the `pg` package.
 * Drizzle supports multiple databases (MySQL, SQLite, etc.) — this tells it
 * we're using PostgreSQL via the `pg` driver.
 */
import { drizzle } from "drizzle-orm/node-postgres";

/**
 * Pool — A connection pool from the `pg` (node-postgres) package.
 * Manages multiple persistent connections to PostgreSQL.
 */
import { Pool } from "pg";

/**
 * schema — ALL database table definitions and relations.
 * import * as schema = "import everything from schema/index.ts"
 *
 * Passing schema to drizzle() enables:
 *   1. Type-safe queries: db.select().from(schema.clients) has autocomplete
 *   2. Relational queries: db.query.clients.findFirst({ with: { entities: true } })
 *
 * Without schema, Drizzle doesn't know your table structure.
 */
import * as schema from "./schema";


// ─── CONNECTION POOL SETUP ──────────────────────────────────────────────────────

/**
 * Create a connection pool.
 *
 * This code runs ONCE when the file is first imported.
 * In Next.js serverless (Vercel), the pool persists across "warm" invocations
 * (requests that reuse the same server process). On a "cold start" (new process),
 * a new pool is created.
 *
 * process.env.DATABASE_URL!
 *   process.env = an object containing all environment variables.
 *   DATABASE_URL = the variable name (set in .env.local or hosting platform).
 *   ! = TypeScript non-null assertion ("I guarantee this exists").
 *       If it's actually missing, the Pool constructor will throw an error.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,

  /**
   * max: 10 — Maximum 10 simultaneous connections in the pool.
   *
   * WHY 10? Balances performance vs. resource usage.
   * Each connection uses ~10MB of memory on the database server.
   * Supabase free tier allows ~60 connections total.
   * If you have 6 serverless functions, 10 each = 60 (the limit).
   *
   * TOO LOW (1-2): Requests queue up waiting for a connection → slow.
   * TOO HIGH (50+): You might exhaust database connection limits.
   */
  max: 10,

  /**
   * idleTimeoutMillis: 30000 — Close idle connections after 30 seconds.
   *
   * If a connection sits unused for 30s, it's closed and removed from the pool.
   * This frees resources when traffic is low.
   *
   * Milliseconds: 30000ms = 30 seconds.
   */
  idleTimeoutMillis: 30000,

  /**
   * connectionTimeoutMillis: 10000 — Give up if can't connect within 10 seconds.
   *
   * If the database is unreachable (network issue, overloaded, etc.),
   * fail fast rather than hang indefinitely.
   * The error will propagate to the API route as a 500 Internal Server Error.
   */
  connectionTimeoutMillis: 10000,
});


// ─── DRIZZLE CLIENT ─────────────────────────────────────────────────────────────

/**
 * Create the Drizzle ORM client.
 *
 * drizzle(pool, { schema }) creates a client that:
 *   1. Uses our connection pool for all database communication
 *   2. Knows our schema for type-safe queries and relational queries
 *
 * This is the SINGLE database client used throughout the entire application.
 * Every import { db } from "@/app/db" gets the SAME instance.
 */
export const db = drizzle(pool, { schema });

/**
 * TYPE: Database
 *
 * typeof db = the TypeScript type of the db object.
 * This type can be used to type function parameters:
 *
 *   function findClients(database: Database) {
 *     return database.query.clients.findMany()
 *   }
 *
 * Useful for dependency injection (passing db to utility functions).
 */
export type Database = typeof db;
