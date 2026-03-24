import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

/**
 * Search debounce unit tests.
 *
 * Tests that the debounce logic fires ONE query when the user types
 * multiple characters within the 300ms debounce window.
 */

describe("search debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("fires one query when typing within 300ms window", async () => {
    const searchFn = vi.fn().mockResolvedValue({ assets: [], documents: [], clients: [], entities: [], total: 0 })
    let timer: ReturnType<typeof setTimeout> | null = null

    function debouncedSearch(query: string) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => searchFn(query), 300)
    }

    // User types "Man" then "hat" quickly (within 300ms)
    debouncedSearch("M")
    vi.advanceTimersByTime(50)
    debouncedSearch("Ma")
    vi.advanceTimersByTime(50)
    debouncedSearch("Man")
    vi.advanceTimersByTime(50)
    debouncedSearch("Manh")
    vi.advanceTimersByTime(50)
    debouncedSearch("Manha")
    vi.advanceTimersByTime(50)
    debouncedSearch("Manhat")

    // Before 300ms passes from last keystroke, no call should be made
    expect(searchFn).not.toHaveBeenCalled()

    // After 300ms from last keystroke
    vi.advanceTimersByTime(300)

    // Only ONE call with the final query
    expect(searchFn).toHaveBeenCalledTimes(1)
    expect(searchFn).toHaveBeenCalledWith("Manhat")
  })

  it("fires two queries when there is a pause between typing", () => {
    const searchFn = vi.fn()
    let timer: ReturnType<typeof setTimeout> | null = null

    function debouncedSearch(query: string) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => searchFn(query), 300)
    }

    // First burst
    debouncedSearch("Man")
    vi.advanceTimersByTime(300)
    expect(searchFn).toHaveBeenCalledTimes(1)
    expect(searchFn).toHaveBeenCalledWith("Man")

    // Second burst after a pause
    debouncedSearch("Manhattan")
    vi.advanceTimersByTime(300)
    expect(searchFn).toHaveBeenCalledTimes(2)
    expect(searchFn).toHaveBeenCalledWith("Manhattan")
  })

  it("does not fire for empty queries", () => {
    const searchFn = vi.fn()
    let timer: ReturnType<typeof setTimeout> | null = null

    function debouncedSearch(query: string) {
      if (timer) clearTimeout(timer)
      if (query.trim().length === 0) return
      timer = setTimeout(() => searchFn(query), 300)
    }

    debouncedSearch("")
    debouncedSearch("   ")
    vi.advanceTimersByTime(500)

    expect(searchFn).not.toHaveBeenCalled()
  })
})
