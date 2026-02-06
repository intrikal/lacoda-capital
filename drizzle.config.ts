import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit Configuration
 *
 * Kevin, this config file tells drizzle-kit how to generate and run migrations.
 * See docs/database-schema.md for detailed line-by-line explanation.
 */
export default defineConfig({
  // Glob pattern to find all schema files. We split schemas into modules for maintainability.
  schema: "./app/db/schema/*.ts",

  // Output directory for generated SQL migrations
  out: "./drizzle/migrations",

  // Database dialect - we're using PostgreSQL
  dialect: "postgresql",

  // Database connection for migrations
  // DIRECT_URL bypasses connection pooling (PgBouncer) which is required for DDL operations
  // DATABASE_URL is for runtime queries and uses pooling for performance
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },

  // Only include the 'public' schema - important for Supabase which has internal schemas
  schemaFilter: ["public"],

  // Enable verbose output during migrations for debugging
  verbose: true,

  // Strict mode catches schema inconsistencies early
  strict: true,
});