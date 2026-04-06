"use client"

import * as React from "react"
import { Plus, Upload, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const actions = [
  {
    label: "Add Asset",
    icon: Plus,
    description: "Track a new holding",
  },
  {
    label: "Upload Document",
    icon: Upload,
    description: "Add to vault",
  },
  {
    label: "Generate Report",
    icon: FileText,
    description: "Create report",
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
          >
            <div className="p-2 rounded-lg bg-teal-500/10">
              <action.icon className="h-4 w-4 text-teal-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-zinc-100">{action.label}</p>
              <p className="text-xs text-zinc-500">{action.description}</p>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
