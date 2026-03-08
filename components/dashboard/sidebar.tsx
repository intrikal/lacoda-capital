"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Briefcase,
  FolderLock,
  BarChart3,
  Shield,
  Users,
  Settings,
  HelpCircle,
  Wallet,
  Calendar,
  GitBranch,
  PanelLeft,
  PanelLeftClose,
  MessageSquare,
  LogOut,
  DollarSign,
  Activity,
  LineChart,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Logo } from "@/components/marketing/logo"
import { createClient } from "@/utils/supabase/client"

// ─────────────────────────────────────────────────────────────────────────────
// Navigation structure
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface NavGroup {
  /** Section heading shown when sidebar is expanded. Empty string = no heading. */
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Key Metrics",
    items: [
      {
        name: "Total Portfolio Value",
        href: "/app/metrics/portfolio-value",
        icon: DollarSign,
        description: "Aggregate AUM across all clients",
      },
      {
        name: "Cash Flow Analysis",
        href: "/app/metrics/cash-flow",
        icon: Activity,
        description: "Inflows, outflows & net cash position",
      },
      {
        name: "Performance Analytics",
        href: "/app/metrics/performance",
        icon: LineChart,
        description: "Returns, benchmarks & attribution",
      },
      {
        name: "Portfolio Performance",
        href: "/app/metrics/portfolio-performance",
        icon: TrendingUp,
        description: "Client-level performance snapshots",
      },
    ],
  },
  {
    label: "",
    items: [
      {
        name: "Investment Flow",
        href: "/app/pipeline",
        icon: GitBranch,
        description: "Track investments from mandate to close",
      },
      {
        name: "Client",
        href: "/app/clients",
        icon: Users,
        description: "Client profiles & relationships",
      },
      {
        name: "Asset",
        href: "/app/assets",
        icon: Briefcase,
        description: "Asset tracking & valuations",
      },
      {
        name: "Finance",
        href: "/app/finances",
        icon: Wallet,
        description: "Financial overview & ledger",
      },
      {
        name: "Calendar",
        href: "/app/calendar",
        icon: Calendar,
        description: "Schedule & events",
      },
      {
        name: "Report",
        href: "/app/reports",
        icon: BarChart3,
        description: "Analytics & client reports",
      },
      {
        name: "Vault",
        href: "/app/vault",
        icon: FolderLock,
        description: "Document storage",
      },
      {
        name: "Compliance",
        href: "/app/compliance",
        icon: Shield,
        description: "Regulatory tracking",
      },
      {
        name: "Messages",
        href: "/app/messages",
        icon: MessageSquare,
        description: "Client & team communication",
      },
    ],
  },
]

const secondaryNavigation: NavItem[] = [
  { name: "Settings", href: "/app/settings", icon: Settings, description: "Account preferences" },
  { name: "Help", href: "/app/help", icon: HelpCircle, description: "Guides & support" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  function isActive(href: string): boolean {
    return pathname.startsWith(href)
  }

  const sidebarWidth = collapsed ? "w-[68px]" : "w-[240px]"

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-zinc-800/60 bg-zinc-950 transition-all duration-200 overflow-y-auto",
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
          onClick={onToggle}
          className="h-8 w-8 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/60"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {/* Section heading — hidden when collapsed or label is empty */}
            {!collapsed && group.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)

                const NavLink = (
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-tiffany-500/10 text-tiffany-500"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                    )}
                  >
                    <item.icon className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      active ? "text-tiffany-500" : "text-zinc-500 group-hover:text-zinc-300"
                    )} />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                )

                if (collapsed) {
                  return (
                    <li key={item.name}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>{NavLink}</TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="bg-zinc-900 border-zinc-800 text-zinc-100 px-3 py-1.5"
                          sideOffset={8}
                        >
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-zinc-500">{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  )
                }

                return <li key={item.name}>{NavLink}</li>
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-zinc-800/60 px-3 py-3">
        <ul className="space-y-0.5">
          {secondaryNavigation.map((item) => {
            const active = isActive(item.href)

            const NavLink = (
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  active
                    ? "bg-tiffany-500/10 text-tiffany-500"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                )}
              >
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active ? "text-tiffany-500" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <li key={item.name}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{NavLink}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="bg-zinc-900 border-zinc-800 text-zinc-100"
                      sideOffset={8}
                    >
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                </li>
              )
            }

            return <li key={item.name}>{NavLink}</li>
          })}
        </ul>
      </div>

      {/* User Section */}
      <div className="border-t border-zinc-800/60 p-3 space-y-1">
        {/* Avatar row */}
        <div className={cn(
          "flex items-center gap-3 rounded-md px-2 py-2",
          collapsed && "justify-center"
        )}>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tiffany-500/20 to-tiffany-600/20 flex items-center justify-center shrink-0 ring-1 ring-tiffany-500/20">
            <span className="text-xs font-semibold text-tiffany-500">AW</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">Alvin</p>
              <p className="text-xs text-zinc-500 truncate">Admin</p>
            </div>
          )}
        </div>

        {/* Sign out */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
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
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </aside>
  )
}
