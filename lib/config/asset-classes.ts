import type { AssetClass } from "@/lib/types/mock"

export const assetClassConfig: Record<AssetClass, { label: string; color: string; icon: string }> = {
  real_estate: { label: "Real Estate", color: "#0d9488", icon: "Building2" },
  equities: { label: "Equities", color: "#0891b2", icon: "TrendingUp" },
  private_equity: { label: "Private Equity", color: "#22d3d1", icon: "Briefcase" },
  cash: { label: "Cash", color: "#5eead4", icon: "Banknote" },
  fixed_income: { label: "Fixed Income", color: "#06b6d4", icon: "PiggyBank" },
  crypto: { label: "Crypto", color: "#8b5cf6", icon: "Bitcoin" },
  intellectual_property: { label: "IP", color: "#14b8a6", icon: "Lightbulb" },
  alternatives: { label: "Alternatives", color: "#2dd4bf", icon: "Puzzle" },
}
