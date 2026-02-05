import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "app/db/schema/**/*.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
  schemaFilter: ["public"],
  extensionsFilters: ["postgis"],
  verbose: true,
  strict: true,
});