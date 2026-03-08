import "@testing-library/jest-dom"
import { afterAll, afterEach, beforeAll } from "vitest"
import { cleanup } from "@testing-library/react"
import { server } from "./msw/server"

// Start MSW before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

// Reset handlers after each test to avoid cross-test pollution
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Clean up after all tests
afterAll(() => server.close())
