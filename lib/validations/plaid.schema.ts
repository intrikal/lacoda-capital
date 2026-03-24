import { z } from "zod"

// ─── Plaid Link Token ──────────────────────────────────────────────────────

export const createLinkTokenSchema = z.object({
  orgId: z.string().uuid("Invalid org ID"),
})

export type CreateLinkTokenInput = z.infer<typeof createLinkTokenSchema>

// ─── Plaid Token Exchange ──────────────────────────────────────────────────

export const exchangePublicTokenSchema = z.object({
  publicToken: z.string().min(1, "Public token is required"),
  institutionId: z.string().optional(),
  institutionName: z.string().optional(),
  accounts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        mask: z.string().nullable().optional(),
        type: z.string(),
        subtype: z.string().nullable().optional(),
      })
    )
    .optional(),
})

export type ExchangePublicTokenInput = z.infer<typeof exchangePublicTokenSchema>

// ─── Plaid Balance Mapping ─────────────────────────────────────────────────

/** Maps Plaid account types to our asset_class enum values */
export const PLAID_ACCOUNT_TYPE_MAP: Record<string, string> = {
  depository: "cash",
  checking: "cash",
  savings: "cash",
  investment: "equities",
  brokerage: "equities",
  credit: "cash",
  loan: "cash",
  other: "other",
}

/** Map a Plaid account type/subtype to our asset_class */
export function mapPlaidAccountToAssetClass(
  type: string,
  subtype?: string | null
): string {
  // Check subtype first for more specific mapping
  if (subtype && PLAID_ACCOUNT_TYPE_MAP[subtype]) {
    return PLAID_ACCOUNT_TYPE_MAP[subtype]
  }
  return PLAID_ACCOUNT_TYPE_MAP[type] ?? "other"
}

// ─── Sync Request ──────────────────────────────────────────────────────────

export const syncBalancesSchema = z.object({
  integrationId: z.string().uuid().optional(),
  mode: z.enum(["manual", "scheduled"]).default("manual"),
})

export type SyncBalancesInput = z.infer<typeof syncBalancesSchema>
