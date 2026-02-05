"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/marketing/logo"
import {
  LayoutDashboard,
  Briefcase,
  FolderLock,
  Settings,
  HelpCircle,
  MessageSquare,
  ArrowRightLeft,
  PanelLeft,
  PanelLeftClose,
  LogOut,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "Dashboard",
    href: "/client",
    icon: LayoutDashboard,
    description: "Overview & goals"
  },
  {
    name: "Portfolio",
    href: "/client/portfolio",
    icon: Briefcase,
    description: "Holdings & performance"
  },
  {
    name: "Activity",
    href: "/client/activity",
    icon: ArrowRightLeft,
    description: "Transactions & transfers"
  },
  {
    name: "Documents",
    href: "/client/documents",
    icon: FolderLock,
    description: "Statements & reports"
  },
  {
    name: "Messages",
    href: "/client/messages",
    icon: MessageSquare,
    description: "Advisor communication"
  },
]

const bottomNavigation = [
  { name: "Settings", href: "/client/settings", icon: Settings },
  { name: "Help", href: "/client/help", icon: HelpCircle },
]

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(false)
  const pathname = usePathname()

  const sidebarWidth = collapsed ? "w-[68px]" : "w-[240px]"
  const mainMargin = collapsed ? "ml-[68px]" : "ml-[240px]"

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-zinc-950">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-zinc-800/60 bg-zinc-950 transition-all duration-200",
            sidebarWidth
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex h-14 items-center border-b border-zinc-800/60 shrink-0",
            collapsed ? "justify-between px-3" : "justify-between px-4"
          )}>
            <Link href="/" className="flex items-center">
              <Logo showText={!collapsed} size="sm" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/60"
            >
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/client"
                    ? pathname === "/client"
                    : pathname.startsWith(item.href)

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-tiffany-500/10 text-tiffany-500"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                    )}
                  >
                    <item.icon className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive ? "text-tiffany-500" : "text-zinc-500 group-hover:text-zinc-300"
                    )} />
                    {!collapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                )

                if (collapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="bg-zinc-900 border-zinc-800 text-zinc-100 px-3 py-1.5"
                        sideOffset={8}
                      >
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-zinc-500">{item.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return <div key={item.name}>{linkContent}</div>
              })}
            </div>
          </nav>

          {/* Bottom Navigation */}
          <div className="border-t border-zinc-800/60 px-3 py-3">
            <div className="space-y-1">
              {bottomNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href)

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-tiffany-500/10 text-tiffany-500"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                    )}
                  >
                    <item.icon className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive ? "text-tiffany-500" : "text-zinc-500 group-hover:text-zinc-300"
                    )} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                )

                if (collapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="bg-zinc-900 border-zinc-800 text-zinc-100"
                        sideOffset={8}
                      >
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return <div key={item.name}>{linkContent}</div>
              })}
            </div>
          </div>

          {/* User Section */}
          <div className="border-t border-zinc-800/60 p-3">
            <div className={cn(
              "flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-zinc-800/60 cursor-pointer",
              collapsed && "justify-center p-2"
            )}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tiffany-500/20 to-tiffany-600/20 flex items-center justify-center shrink-0 ring-1 ring-tiffany-500/20">
                <span className="text-xs font-semibold text-tiffany-500">JD</span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">John Doe</p>
                  <p className="text-xs text-zinc-500 truncate">Premium Client</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className={cn("min-h-screen transition-all duration-200", mainMargin)}>
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm px-6">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
              <Bell className="h-4 w-4" />
            </Button>
          </div>

          {/* Page content */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  )
}
