"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Shield,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const NAV_ITEMS = [
  { href: "/demo/app", icon: LayoutDashboard, label: "Overview" },
  { href: "/demo/app/clients", icon: Users, label: "Clients" },
  { href: "/demo/app/assets", icon: Briefcase, label: "Assets" },
  { href: "/demo/app/vault", icon: FileText, label: "Vault" },
  { href: "/demo/app/compliance", icon: Shield, label: "Compliance" },
  { href: "/demo/app/reports", icon: BarChart3, label: "Reports" },
]

export default function DemoAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-200",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-zinc-800">
          {!collapsed && (
            <span className="text-sm font-bold text-zinc-100 tracking-tight">
              Lacoda Capital
              <span className="text-tiffany-500 ml-1.5 text-xs font-normal">DEMO</span>
            </span>
          )}
          {collapsed && (
            <span className="text-sm font-bold text-tiffany-500 mx-auto">LC</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/demo/app" && pathname.startsWith(item.href))
            const Icon = item.icon

            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-tiffany-500/10 text-tiffany-500"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }

            return link
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-zinc-800">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Demo Banner */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-tiffany-500/10 via-blue-500/10 to-violet-500/10 border-b border-tiffany-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-tiffany-500" />
            <span className="text-sm text-zinc-200">
              Viewing demo — <span className="text-zinc-400">sign up to manage your portfolio.</span>
            </span>
          </div>
          <Link href="/signup">
            <Button size="sm" className="bg-tiffany-500 hover:bg-tiffany-600 text-zinc-950 text-xs h-7">
              Sign Up Free
            </Button>
          </Link>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
