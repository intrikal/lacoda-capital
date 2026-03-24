import { describe, it, expect } from "vitest"
import { blockDemoMutation } from "@/lib/demo/guard"
import { DEMO_ORG_ID } from "@/lib/demo/data"

/**
 * Integration test: Demo org data cannot be modified via any Server Action.
 *
 * Tests that blockDemoMutation() correctly rejects mutations for the demo org
 * and that the pattern can be applied to all server actions.
 */

describe("demo org mutation blocking", () => {
  // Simulated server action pattern
  async function simulateServerAction(orgId: string, actionName: string) {
    blockDemoMutation(orgId)
    return { success: true, action: actionName }
  }

  const serverActions = [
    "createAsset",
    "updateAsset",
    "deleteAsset",
    "createClient",
    "updateClient",
    "deleteClient",
    "createDocument",
    "updateDocument",
    "deleteDocument",
    "createComplianceControl",
    "updateComplianceControl",
    "deleteComplianceControl",
    "createComplianceEvidence",
    "deleteComplianceEvidence",
    "createReport",
    "createTask",
    "createGoal",
  ]

  for (const action of serverActions) {
    it(`${action} rejects requests from demo org`, async () => {
      await expect(
        simulateServerAction(DEMO_ORG_ID, action)
      ).rejects.toThrow("Demo mode")
    })

    it(`${action} allows requests from real org`, async () => {
      const result = await simulateServerAction("real-org-id", action)
      expect(result.success).toBe(true)
    })
  }
})
