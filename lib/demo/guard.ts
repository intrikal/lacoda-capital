import { DEMO_ORG_ID } from "./data"

/**
 * Throws if the current session's orgId matches the demo org.
 * Call this at the top of any Server Action that mutates data.
 */
export function blockDemoMutation(orgId: string | null | undefined) {
  if (orgId === DEMO_ORG_ID) {
    throw new Error("Demo mode: mutations are disabled. Sign up to manage your portfolio.")
  }
}
