"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, FileWarning, Clock, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { alertSeverityConfig } from "@/lib/config/alerts"
import type { Alert } from "@/lib/types/mock"

interface AlertsPanelProps {
  alerts?: Alert[]
}

export function AlertsPanel({ alerts = [] }: AlertsPanelProps) {
  const activeAlerts = alerts.filter((a) => !a.isRead).slice(0, 4)

  const getIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return AlertTriangle
      case "warning":
        return FileWarning
      default:
        return Clock
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Active Alerts</CardTitle>
        <Badge variant="outline" className="text-xs">
          {activeAlerts.length} unread
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeAlerts.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">
            No active alerts
          </p>
        ) : (
          activeAlerts.map((alert) => {
            const config = alertSeverityConfig[alert.severity]
            const Icon = getIcon(alert.severity)

            return (
              <Link
                key={alert.id}
                href={alert.actionUrl || "#"}
                className={cn(
                  "block p-3 rounded-lg border transition-colors hover:bg-zinc-800/50",
                  config.border,
                  config.bg
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100">
                      {alert.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                      {alert.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                </div>
              </Link>
            )
          })
        )}

        {activeAlerts.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-2">
            View all alerts
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
