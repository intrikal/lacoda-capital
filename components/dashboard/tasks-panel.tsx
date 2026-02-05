"use client"

import * as React from "react"
import { format } from "date-fns"
import { Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { mockTasks } from "@/lib/mock/data"

const priorityConfig = {
  high: { label: "High", color: "text-red-400", bg: "bg-red-400/10" },
  medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-400/10" },
  low: { label: "Low", color: "text-blue-400", bg: "bg-blue-400/10" },
}

export function TasksPanel() {
  const pendingTasks = mockTasks
    .filter((t) => t.status !== "completed")
    .slice(0, 4)

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Tasks & Reminders</CardTitle>
        <Badge variant="outline" className="text-xs">
          {pendingTasks.length} pending
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingTasks.map((task) => {
          const priority = priorityConfig[task.priority]
          const dueDate = new Date(task.dueDate)
          const isOverdue = dueDate < new Date()

          return (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <Checkbox id={task.id} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={task.id}
                  className="text-sm font-medium text-zinc-100 cursor-pointer"
                >
                  {task.title}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", priority.color)}
                  >
                    {priority.label}
                  </Badge>
                  <span
                    className={cn(
                      "text-xs flex items-center gap-1",
                      isOverdue ? "text-red-400" : "text-zinc-500"
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {format(dueDate, "MMM d")}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        <Button variant="ghost" size="sm" className="w-full mt-2">
          View all tasks
        </Button>
      </CardContent>
    </Card>
  )
}
