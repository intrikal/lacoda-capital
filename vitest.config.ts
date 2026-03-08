import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    projects: [
      // ── 1. Unit + Integration (jsdom) ─────────────────────────────────────
      {
        plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./tests/setup.ts"],
          include: [
            "tests/**/*.test.{ts,tsx}",
            "**/__tests__/**/*.test.{ts,tsx}",
          ],
          exclude: ["tests/e2e/**", "**/node_modules/**"],
          alias: {
            "@": path.resolve(dirname, "."),
          },
        },
      },
      // ── 2. Storybook stories (browser via Playwright) ─────────────────────
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
})
