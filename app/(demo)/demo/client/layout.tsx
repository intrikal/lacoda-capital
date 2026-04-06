"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  FolderLock,
  FileBarChart2,
  CalendarDays,
  MessageSquare,
  Settings,
  HelpCircle,
  PanelLeft,
  PanelLeftClose,
  Bell,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/marketing/logo"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { name: "Overview", href: "/demo/client", icon: LayoutDashboard, description: "Portfolio summary & recent activity" },
      { name: "Asset", href: "/demo/client/assets", icon: Briefcase, description: "Holdings, valuations & allocation" },
      { name: "Report", href: "/demo/client/reports", icon: FileBarChart2, description: "Advisor-generated performance reports" },
      { name: "Vault", href: "/demo/client/vault", icon: FolderLock, description: "Statements, tax docs & shared files" },
    ],
  },
  {
    label: "Stay in touch",
    items: [
      { name: "Calendar", href: "/demo/client/calendar", icon: CalendarDays, description: "Meetings, reviews & key dates" },
      { name: "Messages", href: "/demo/client/messages", icon: MessageSquare, description: "Direct communication with your advisor" },
    ],
  },
]

const bottomNav: NavItem[] = [
  { name: "Settings", href: "/demo/client/settings", icon: Settings, description: "Profile, security & preferences" },
  { name: "Help", href: "/demo/client/help", icon: HelpCircle, description: "FAQs, guides & support" },
]

interface NavLinkProps {
  item: NavItem
  isActive: boolean
  collapsed: boolean
}

function NavLink({ item, isActive, collapsed }: NavLinkProps) {
  const link = (
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
      <item.icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive ? "text-tiffany-500" : "text-zinc-500 group-hover:text-zinc-300"
        )}
      />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="bg-zinc-900 border-zinc-800 text-zinc-100 px-3 py-1.5">
          <p className="font-medium text-sm">{item.name}</p>
          <p className="text-xs text-zinc-500">{item.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

export default function DemoClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)
  const pathname = usePathname()

  const sidebarWidth = collapsed ? "w-[68px]" : "w-[240px]"
  const mainMargin = collapsed ? "ml-[68px]" : "ml-[240px]"

  function isActive(href: string): boolean {
    return href === "/demo/client" ? pathname === "/demo/client" : pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-zinc-950">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-zinc-800/60 bg-zinc-950 transition-all duration-200 overflow-y-auto",
            sidebarWidth
          )}
        >
          {/* Logo + collapse toggle */}
          <div
            className={cn(
              "flex h-14 items-center border-b border-zinc-800/60 shrink-0",
              collapsed ? "justify-between px-3" : "justify-between px-4"
            )}
          >
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

          {/* Grouped navigation */}
          <nav className="flex-1 px-3 py-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom nav */}
          <div className="border-t border-zinc-800/60 px-3 py-3 space-y-0.5">
            {bottomNav.map((item) => (
              <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} />
            ))}
          </div>

          {/* Demo user chip */}
          <div className="border-t border-zinc-800/60 p-3">
            {!collapsed ? (
              <div className="flex items-center gap-3 rounded-md p-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tiffany-500/20 to-tiffany-600/20 flex items-center justify-center shrink-0 ring-1 ring-tiffany-500/30">
                  <span className="text-xs font-semibold text-tiffany-500">JD</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">John Doe</p>
                  <p className="text-xs text-zinc-500 truncate">Demo Client</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tiffany-500/20 to-tiffany-600/20 flex items-center justify-center ring-1 ring-tiffany-500/30">
                  <span className="text-xs font-semibold text-tiffany-500">JD</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main content area */}
        <main className={cn("min-h-screen transition-all duration-200", mainMargin)}>
          {/* Demo banner */}
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-tiffany-500/20 bg-gradient-to-r from-tiffany-500/10 via-blue-500/10 to-violet-500/10 backdrop-blur-sm px-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-tiffany-500" />
              <span className="text-sm text-zinc-200">
                Client portal demo — <span className="text-zinc-400">sign up to access your real portfolio.</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
                <Bell className="h-4 w-4" />
              </Button>
              <Link href="/signup">
                <Button size="sm" className="bg-tiffany-500 hover:bg-tiffany-600 text-zinc-950 text-xs h-7">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>

          {/* Page content */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  )
}
