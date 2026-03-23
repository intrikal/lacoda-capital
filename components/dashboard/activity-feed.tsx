"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import {
  FileText,
  TrendingUp,
  UserPlus,
  FileCheck,
  Shield,
  Upload,
  Briefcase,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LedgerActionType, ActivityItem } from "@/lib/types/mock"
import type { LucideIcon } from "lucide-react"

const actionIcons: Record<LedgerActionType, LucideIcon> = {
  asset_created: Briefcase,
  asset_updated: TrendingUp,
  asset_sold: Briefcase,
  document_uploaded: Upload,
  document_verified: FileCheck,
  document_expired: FileText,
  valuation_updated: TrendingUp,
  user_login: Shield,
  user_invited: UserPlus,
  report_generated: FileText,
  permission_changed: Shield,
  client_added: UserPlus,
  compliance_check: Shield,
}

const actionColors: Record<LedgerActionType, string> = {
  asset_created: "text-emerald-400",
  asset_updated: "text-teal-400",
  asset_sold: "text-amber-400",
  document_uploaded: "text-blue-400",
  document_verified: "text-emerald-400",
  document_expired: "text-red-400",
  valuation_updated: "text-teal-400",
  user_login: "text-zinc-400",
  user_invited: "text-blue-400",
  report_generated: "text-cyan-400",
  permission_changed: "text-amber-400",
  client_added: "text-emerald-400",
  compliance_check: "text-teal-400",
}

interface ActivityFeedProps {
  activities?: ActivityItem[]
}

export function ActivityFeed({ activities = [] }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = actionIcons[activity.type] || FileText
            const color = actionColors[activity.type] || "text-zinc-400"

            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3",
                  index !== activities.length - 1 &&
                    "pb-4 border-b border-zinc-800"
                )}
              >
                <div className="p-2 rounded-lg bg-zinc-800">
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-100">
                    <span className="font-medium">{activity.user}</span>{" "}
                    <span className="text-zinc-400">{activity.description}</span>
                  </p>
                  <p className="text-sm text-teal-400 truncate">
                    {activity.entityName}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <Button variant="ghost" size="sm" className="w-full mt-4">
          View full ledger
        </Button>
      </CardContent>
    </Card>
  )
}
