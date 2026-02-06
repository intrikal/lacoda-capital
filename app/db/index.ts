import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Database Client Setup
 *
 * Kevin, we use a connection pool for production workloads.
 * The pool maintains persistent connections to reduce latency.
 *
 * Key points:
 * - DATABASE_URL uses connection pooling (PgBouncer on Supabase)
 * - Pool is created once and reused across requests
 * - Schema is passed to enable type-safe relational queries
 */

// Create a connection pool
// In serverless environments, this gets reused across warm function invocations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  // Reasonable defaults for serverless - adjust based on your needs
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout if can't connect in 10s
});

// Create the drizzle client with our schema for type-safe queries
export const db = drizzle(pool, { schema });

// Export types for use throughout the application
export type Database = typeof db;
