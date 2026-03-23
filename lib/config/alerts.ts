import type { AlertSeverity } from "@/lib/types/mock"

export const alertSeverityConfig: Record<
  AlertSeverity,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  warning: { label: "Warning", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  info: { label: "Info", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
}
