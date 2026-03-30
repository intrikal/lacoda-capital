"use client"

import * as React from "react"
import * as Sentry from "@sentry/nextjs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Sidebar } from "@/components/dashboard/sidebar"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { CommandSearch } from "@/components/dashboard/command-search"
import { FirstLoginWizard } from "@/components/dashboard/first-login-wizard"
import { UsageLimitBanner } from "@/components/dashboard/usage-limit-banner"
import { getSessionUserId } from "@/lib/actions/auth.actions"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  React.useEffect(() => {
    getSessionUserId().then((userId) => {
      if (userId) Sentry.setUser({ id: userId })
    })
    return () => { Sentry.setUser(null) }
  }, [])

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
            <CommandSearch />
            <NotificationBell />
          </div>

          {/* First-login onboarding wizard */}
          <FirstLoginWizard />

          {/* Page content */}
          <div className="p-6">
            <UsageLimitBanner />
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
