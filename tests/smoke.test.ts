/**
 * tests/smoke.test.ts
 *
 * WHAT IS THIS FILE?
 * ──────────────────
 * A "smoke test" is the simplest possible test — named after the old hardware
 * engineering practice of turning a new circuit board on and checking whether
 * it literally starts smoking. If it doesn't smoke, the basics work.
 *
 * In software, a smoke test answers one question: "Is the pipeline itself
 * running at all?" It has nothing to do with application logic.
 *
 * WHY DO WE NEED IT?
 * ──────────────────
 * When you first set up CI there are no real tests yet, but you still want
 * GitHub Actions to run `npm run test` and go green — so you know the whole
 * pipeline (checkout → install → test runner → report) is wired up correctly.
 *
 * Without a file like this, `vitest run` would find zero test files and some
 * versions would exit with an error ("no tests found"), making CI fail for
 * the wrong reason.
 *
 * Once the real test suite grows (see tests/unit/, tests/integration/), this
 * file stays here harmlessly. It costs ~3ms to run and acts as a permanent
 * sanity check that Vitest itself can boot.
 *
 * HOW TESTS ARE STRUCTURED (Vitest / Jest style)
 * ───────────────────────────────────────────────
 *   describe("group name", () => { ... })   — groups related tests together
 *   it("what it should do", () => { ... })  — one individual test case
 *   expect(value).toBe(expected)            — assertion: throws if they differ
 *
 * PSEUDOCODE:
 *   Group: "smoke"
 *     Test: "pipeline is alive"
 *       Assert that true equals true
 *       → This can never fail. If it somehow does, Vitest itself is broken.
 */

import { describe, it, expect } from "vitest"

describe("smoke", () => {
  it("pipeline is alive", () => {
    expect(true).toBe(true)
  })
})
