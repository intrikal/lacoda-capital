"use client"

import * as React from "react"
import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, LogOut } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Sidebar, mainNavigation, secondaryNavigation } from "@/components/dashboard/sidebar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Logo } from "@/components/marketing/logo"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { CommandSearch } from "@/components/dashboard/command-search"
import { FirstLoginWizard } from "@/components/dashboard/first-login-wizard"
import { UsageLimitBanner } from "@/components/dashboard/usage-limit-banner"
import { getSessionUserAndOrgId, logoutAction } from "@/lib/actions/auth.actions"
import { identifyUser, resetIdentity } from "@/lib/analytics/track"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    getSessionUserAndOrgId().then((info) => {
      if (info) {
        Sentry.setUser({ id: info.userId })
        identifyUser(info.userId, info.orgId)
      } else {
        router.replace("/login")
      }
    })
    return () => {
      Sentry.setUser(null)
      resetIdentity()
    }
  }, [])

  const mainMargin = sidebarCollapsed ? "ml-0 md:ml-[68px]" : "ml-0 md:ml-[240px]"

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-zinc-950">
        {/* Desktop fixed sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Mobile sheet sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[240px] p-0 flex flex-col bg-zinc-950">
            <div className="flex h-14 items-center border-b border-zinc-800/60 shrink-0 px-4">
              <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
                <Logo showText size="sm" />
              </Link>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <ul className="space-y-0.5">
                {mainNavigation.map((item) => {
                  const active = pathname.startsWith(item.href)
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-tiffany-500/10 text-tiffany-500"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                        )}
                      >
                        {React.createElement(item.icon, { className: cn("h-[18px] w-[18px] shrink-0", active ? "text-tiffany-500" : "text-zinc-500") })}
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <div className="border-t border-zinc-800/60 px-3 py-3">
              <ul className="space-y-0.5">
                {secondaryNavigation.map((item) => {
                  const active = pathname.startsWith(item.href)
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-tiffany-500/10 text-tiffany-500"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                        )}
                      >
                        {React.createElement(item.icon, { className: cn("h-[18px] w-[18px] shrink-0", active ? "text-tiffany-500" : "text-zinc-500") })}
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="border-t border-zinc-800/60 p-3">
              <div className="flex items-center gap-2 rounded-md p-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tiffany-500/20 to-tiffany-600/20 flex items-center justify-center shrink-0 ring-1 ring-tiffany-500/20">
                  <span className="text-xs font-semibold text-tiffany-500">K</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">Kevin</p>
                  <p className="text-xs text-zinc-500 truncate">Admin</p>
                </div>
                <button
                  onClick={() => logoutAction()}
                  className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800/60 transition-colors shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <main className={cn("min-h-screen transition-all duration-200", mainMargin)}>
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm px-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
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
