"use client"

import * as React from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/dashboard/notification-bell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  const mainMargin = sidebarCollapsed ? "ml-[68px]" : "ml-[240px]"

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-zinc-950">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className={cn("min-h-screen transition-all duration-200", mainMargin)}>
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm px-6">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
              <Search className="h-4 w-4" />
            </Button>
            <NotificationBell />
          </div>

          {/* Page content */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  )
}
