/**
 * layout.tsx — Client Portal Shell
 *
 * The top-level layout for the authenticated client portal at `/client/**`.
 * Renders a collapsible sidebar with grouped navigation and a sticky top bar.
 *
 * Sidebar nav groups:
 *   Main         — Overview, Asset, Report, Vault
 *   Stay in touch — Calendar, Messages
 *   Bottom       — Settings, Help
 *
 * Collapse behaviour:
 *   Collapsed (68 px): icons only with tooltips on hover
 *   Expanded (240 px): icons + labels + group headings
 *
 * Active state:
 *   Overview uses exact match (`pathname === "/client"`).
 *   All other items use `pathname.startsWith(item.href)`.
 */

"use client"

import * as React from "react"
import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/marketing/logo"
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
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { logoutAction, getSessionUserId } from "@/lib/actions/auth.actions"

// ─────────────────────────────────────────────────────────────────────────────
// Navigation structure — grouped for wealth management client UX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single navigable item in the sidebar.
 */
interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Shown in the collapsed tooltip for context */
  description: string
}

/**
 * A labelled group of nav items, rendered with a section heading when expanded.
 */
interface NavGroup {
  /** Section heading — hidden when sidebar is collapsed */
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      {
        name: "Overview",
        href: "/client",
        icon: LayoutDashboard,
        description: "Portfolio summary & recent activity",
      },
      {
        name: "Asset",
        href: "/client/assets",
        icon: Briefcase,
        description: "Holdings, valuations & allocation",
      },
      {
        name: "Report",
        href: "/client/reports",
        icon: FileBarChart2,
        description: "Advisor-generated performance reports",
      },
      {
        name: "Vault",
        href: "/client/vault",
        icon: FolderLock,
        description: "Statements, tax docs & shared files",
      },
    ],
  },
  {
    label: "Stay in touch",
    items: [
      {
        name: "Calendar",
        href: "/client/calendar",
        icon: CalendarDays,
        description: "Meetings, reviews & key dates",
      },
      {
        name: "Messages",
        href: "/client/messages",
        icon: MessageSquare,
        description: "Direct communication with your advisor",
      },
    ],
  },
]

/** Settings and Help always live at the bottom of the sidebar */
const bottomNav: NavItem[] = [
  {
    name: "Settings",
    href: "/client/settings",
    icon: Settings,
    description: "Profile, security & preferences",
  },
  {
    name: "Help",
    href: "/client/help",
    icon: HelpCircle,
    description: "FAQs, guides & support",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// NavLink — renders a single sidebar link with active + collapsed states
// ─────────────────────────────────────────────────────────────────────────────

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
          isActive
            ? "text-tiffany-500"
            : "text-zinc-500 group-hover:text-zinc-300"
        )}
      />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="bg-zinc-900 border-zinc-800 text-zinc-100 px-3 py-1.5"
        >
          <p className="font-medium text-sm">{item.name}</p>
          <p className="text-xs text-zinc-500">{item.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    getSessionUserId().then((userId) => {
      if (userId) Sentry.setUser({ id: userId })
    })
    return () => { Sentry.setUser(null) }
  }, [])

  const sidebarWidth = collapsed ? "w-[68px]" : "w-[240px]"
  const mainMargin = collapsed ? "ml-[68px]" : "ml-[240px]"

  /**
   * Determines whether a nav item is currently active.
   * Dashboard uses exact match to avoid "/client" matching all child routes.
   */
  function isActive(href: string): boolean {
    // Overview uses exact match to avoid "/client" matching all child routes
    return href === "/client" ? pathname === "/client" : pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-zinc-950">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
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
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* ── Grouped navigation ─────────────────────────────────────────── */}
          <nav className="flex-1 px-3 py-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                {/* Section heading — hidden in collapsed mode */}
                {!collapsed && (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      isActive={isActive(item.href)}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* ── Bottom nav (Settings, Help) ────────────────────────────────── */}
          <div className="border-t border-zinc-800/60 px-3 py-3 space-y-0.5">
            {bottomNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>

          {/* ── User identity chip ────────────────────────────────────────── */}
          <div className="border-t border-zinc-800/60 p-3">
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => logoutAction()}
                    className="w-full flex justify-center items-center rounded-md p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 text-zinc-100" sideOffset={8}>
                  Sign out
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0 rounded-md p-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tiffany-500/20 to-tiffany-600/20 flex items-center justify-center shrink-0 ring-1 ring-tiffany-500/30">
                    <span className="text-xs font-semibold text-tiffany-500">JD</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">John Doe</p>
                    <p className="text-xs text-zinc-500 truncate">Client</p>
                  </div>
                </div>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => logoutAction()}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800/60 transition-colors shrink-0"
                      aria-label="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-zinc-900 border-zinc-800 text-zinc-100" sideOffset={6}>
                    Sign out
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content area ─────────────────────────────────────────────── */}
        <main
          className={cn("min-h-screen transition-all duration-200", mainMargin)}
        >
          {/* Sticky top bar */}
          <div className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm px-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
              >
                Notifications
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Page content */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  )
}
