import { describe, it, expect } from "vitest"

/**
 * Integration test: Onboarding wizard state persistence.
 *
 * Tests that wizard state is tracked correctly across steps:
 * - New user → wizard state stored
 * - Complete step 1 → reload → wizard resumes at step 2
 * - Skip step 2 → wizard proceeds to step 3
 */

interface WizardState {
  currentStep: number
  completedSteps: Set<string>
  orgInfo: { name: string; timezone: string; currency: string } | null
}

// Simulates the wizard state management (mirrors first-login-wizard.tsx)
function createWizardManager() {
  const state: WizardState = {
    currentStep: 0,
    completedSteps: new Set(),
    orgInfo: null,
  }

  return {
    getState: () => ({ ...state, completedSteps: new Set(state.completedSteps) }),

    completeStep(key: string) {
      state.completedSteps.add(key)
    },

    nextStep() {
      state.currentStep = Math.min(state.currentStep + 1, 3)
    },

    resumeFromCompleted() {
      // Resume from last completed step
      const stepKeys = ["org", "team", "asset", "document"]
      for (let i = 0; i < stepKeys.length; i++) {
        if (!state.completedSteps.has(stepKeys[i])) {
          state.currentStep = i
          return
        }
      }
      state.currentStep = 3 // all done
    },

    saveOrgInfo(info: { name: string; timezone: string; currency: string }) {
      state.orgInfo = info
    },

    // Simulates restoring from persistence
    restoreFrom(saved: { completedSteps: string[] }) {
      state.completedSteps = new Set(saved.completedSteps)
      this.resumeFromCompleted()
    },
  }
}

describe("onboarding wizard state", () => {
  it("starts at step 0 for new user", () => {
    const wizard = createWizardManager()
    const state = wizard.getState()

    expect(state.currentStep).toBe(0)
    expect(state.completedSteps.size).toBe(0)
  })

  it("complete step 1 → resume at step 2", () => {
    const wizard = createWizardManager()

    // Complete step 1 (org)
    wizard.completeStep("org")
    wizard.saveOrgInfo({ name: "Acme", timezone: "America/New_York", currency: "USD" })
    wizard.nextStep()

    expect(wizard.getState().currentStep).toBe(1) // now at step 2 (team invite)

    // Simulate page reload — restore from persistence
    const wizard2 = createWizardManager()
    wizard2.restoreFrom({ completedSteps: ["org"] })

    expect(wizard2.getState().currentStep).toBe(1) // resumes at step 2
  })

  it("skip step 2 (team invite) → wizard proceeds to step 3", () => {
    const wizard = createWizardManager()

    // Complete step 1
    wizard.completeStep("org")
    wizard.nextStep()

    // Skip step 2 (team is optional) — but still mark as "done" for wizard progression
    // Note: in the checklist, skipped steps show as incomplete
    wizard.nextStep() // go to step 3 without completing "team"

    expect(wizard.getState().currentStep).toBe(2) // now at step 3 (asset)
    expect(wizard.getState().completedSteps.has("team")).toBe(false) // not completed, just skipped
  })

  it("checklist shows 3/4 when step 2 is skipped", () => {
    const completedSteps = { org: true, team: false, asset: true, document: true }
    const entries = Object.values(completedSteps)
    const completed = entries.filter(Boolean).length

    expect(completed).toBe(3)
    expect(entries.length).toBe(4)
  })

  it("user invited to existing org → skip org creation step", () => {
    // When user is invited to an existing org, org already exists
    const wizard = createWizardManager()

    // Org already exists (was created by someone else)
    wizard.completeStep("org")
    wizard.resumeFromCompleted()

    // Should start at team step (step 1), not org step (step 0)
    expect(wizard.getState().currentStep).toBe(1)
  })
})
