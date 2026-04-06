/**
 * Plan limits configuration and usage checking utilities.
 *
 * Defines per-plan limits for AUM, team members, and storage.
 * Provides pure functions used by server actions and the billing UI
 * to check whether an org is approaching or exceeding its plan limits.
 *
 * Tiers (Option A — 4 paid tiers):
 *   Starter      $299/mo   $500K AUM    2 seats   10 GB
 *   Growth       $599/mo   $1.5M AUM    3 seats   25 GB
 *   Professional $999/mo   $3M   AUM    5 seats   50 GB
 *   Elite        $1,499/mo $5M   AUM   10 seats  100 GB
 *   Enterprise   Custom    Unlimited   Unlimited  Unlimited
 */

export type PlanTier = "free" | "starter" | "growth" | "professional" | "elite" | "enterprise";

export interface PlanLimits {
  /** Maximum AUM in dollars. Infinity for unlimited. */
  maxAum: number;
  /** Maximum team members (admin + assistant, not clients). */
  maxTeamMembers: number;
  /** Maximum document storage in bytes. */
  maxStorageBytes: number;
  /** Whether API access is included. */
  apiAccess: boolean;
  /** Whether custom integrations are included. */
  customIntegrations: boolean;
  /** Monthly price in USD (0 = free, -1 = custom/contact sales). */
  monthlyPrice: number;
  /** Annual price per month in USD (20% discount). */
  annualPricePerMonth: number;
  /** Display name for UI. */
  displayName: string;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxAum: 0,
    maxTeamMembers: 1,
    maxStorageBytes: 0,
    apiAccess: false,
    customIntegrations: false,
    monthlyPrice: 0,
    annualPricePerMonth: 0,
    displayName: "Free",
  },
  starter: {
    maxAum: 500_000,            // $500K
    maxTeamMembers: 2,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    apiAccess: false,
    customIntegrations: false,
    monthlyPrice: 299,
    annualPricePerMonth: 239,   // 20% off
    displayName: "Starter",
  },
  growth: {
    maxAum: 1_500_000,          // $1.5M
    maxTeamMembers: 3,
    maxStorageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
    apiAccess: false,
    customIntegrations: false,
    monthlyPrice: 599,
    annualPricePerMonth: 479,   // 20% off
    displayName: "Growth",
  },
  professional: {
    maxAum: 3_000_000,          // $3M
    maxTeamMembers: 5,
    maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    apiAccess: true,
    customIntegrations: false,
    monthlyPrice: 999,
    annualPricePerMonth: 799,   // 20% off
    displayName: "Professional",
  },
  elite: {
    maxAum: 5_000_000,          // $5M
    maxTeamMembers: 10,
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    apiAccess: true,
    customIntegrations: true,
    monthlyPrice: 1499,
    annualPricePerMonth: 1199,  // 20% off
    displayName: "Elite",
  },
  enterprise: {
    maxAum: Infinity,
    maxTeamMembers: Infinity,
    maxStorageBytes: Infinity,
    apiAccess: true,
    customIntegrations: true,
    monthlyPrice: -1,           // Custom
    annualPricePerMonth: -1,
    displayName: "Enterprise",
  },
};

/** Ordered tier progression for upgrade logic. */
export const PLAN_ORDER: PlanTier[] = [
  "free",
  "starter",
  "growth",
  "professional",
  "elite",
  "enterprise",
];

/** Returns true if targetPlan is higher than currentPlan. */
export function isUpgrade(currentPlan: PlanTier, targetPlan: PlanTier): boolean {
  return PLAN_ORDER.indexOf(targetPlan) > PLAN_ORDER.indexOf(currentPlan);
}

/** Stripe Price ID mapping — maps plan + interval to env var. */
export const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  starter_monthly:      process.env.STRIPE_PRICE_STARTER_MONTHLY,
  starter_annual:       process.env.STRIPE_PRICE_STARTER_ANNUAL,
  growth_monthly:       process.env.STRIPE_PRICE_GROWTH_MONTHLY,
  growth_annual:        process.env.STRIPE_PRICE_GROWTH_ANNUAL,
  professional_monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
  professional_annual:  process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
  elite_monthly:        process.env.STRIPE_PRICE_ELITE_MONTHLY,
  elite_annual:         process.env.STRIPE_PRICE_ELITE_ANNUAL,
};

export type PaidPlanTier = "starter" | "growth" | "professional" | "elite";

export type BillingInterval = "monthly" | "annual";

export interface UsageSnapshot {
  currentAum: number;
  teamMemberCount: number;
  storageUsedBytes: number;
}

export interface UsageStatus {
  resource: "aum" | "team_members" | "storage";
  current: number;
  limit: number;
  /** 0-1 ratio. >1 means over limit. */
  ratio: number;
  /** "ok" | "warning" (>= 80%) | "exceeded" (> 100%) */
  level: "ok" | "warning" | "exceeded";
  /** Human-readable message for banners. */
  message: string | null;
}

/**
 * Check a single resource against plan limits.
 */
function checkResource(
  resource: UsageStatus["resource"],
  current: number,
  limit: number,
  label: string,
  unit: string
): UsageStatus {
  if (limit === Infinity || limit === 0) {
    return { resource, current, limit, ratio: 0, level: "ok", message: null };
  }

  const ratio = current / limit;

  if (ratio > 1) {
    return {
      resource,
      current,
      limit,
      ratio,
      level: "exceeded",
      message: `You've exceeded your ${label} limit. Current: ${formatUsage(current, unit)}, Limit: ${formatUsage(limit, unit)}.`,
    };
  }

  if (ratio >= 0.8) {
    const pct = Math.round(ratio * 100);
    return {
      resource,
      current,
      limit,
      ratio,
      level: "warning",
      message: `You're using ${pct}% of your ${label}.`,
    };
  }

  return { resource, current, limit, ratio, level: "ok", message: null };
}

function formatUsage(value: number, unit: string): string {
  if (unit === "dollars") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  if (unit === "bytes") {
    const gb = value / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  }
  return `${value}`;
}

/**
 * checkPlanUsage — Returns usage status for all resources.
 *
 * Used by the billing page and usage banner to show warnings.
 * Pure function — does not query the database.
 */
export function checkPlanUsage(
  plan: PlanTier,
  usage: UsageSnapshot
): UsageStatus[] {
  const limits = PLAN_LIMITS[plan];

  return [
    checkResource("aum", usage.currentAum, limits.maxAum, "AUM", "dollars"),
    checkResource("team_members", usage.teamMemberCount, limits.maxTeamMembers, "team member", "count"),
    checkResource("storage", usage.storageUsedBytes, limits.maxStorageBytes, "storage", "bytes"),
  ];
}

/**
 * hasExceededLimit — Quick check if any resource is over limit.
 */
export function hasExceededLimit(plan: PlanTier, usage: UsageSnapshot): boolean {
  return checkPlanUsage(plan, usage).some((s) => s.level === "exceeded");
}

/**
 * hasWarning — Quick check if any resource is at warning threshold.
 */
export function hasWarning(plan: PlanTier, usage: UsageSnapshot): boolean {
  return checkPlanUsage(plan, usage).some((s) => s.level === "warning" || s.level === "exceeded");
}

/**
 * canAddTeamMember — Check if org can add another team member under plan.
 */
export function canAddTeamMember(plan: PlanTier, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].maxTeamMembers;
  if (limit === Infinity) return true;
  return currentCount < limit;
}

/**
 * nextUpgradeTier — Returns the next tier above the current plan, or null if already at top.
 */
export function nextUpgradeTier(current: PlanTier): PaidPlanTier | null {
  const paidTiers: PaidPlanTier[] = ["starter", "growth", "professional", "elite"];
  const idx = paidTiers.indexOf(current as PaidPlanTier);
  if (idx === -1 || idx === paidTiers.length - 1) return null;
  return paidTiers[idx + 1];
}
