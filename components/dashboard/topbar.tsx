"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Search,
  Bell,
  Calendar,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Sun,
  Moon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { alertSeverityConfig } from "@/lib/config/alerts"
import type { Alert } from "@/lib/types/mock"

interface TopbarProps {
  sidebarCollapsed: boolean
  dateRange: { from: Date; to: Date }
  onDateRangeChange: (range: { from: Date; to: Date }) => void
  userName?: string
  userEmail?: string
  userRole?: string
  alerts?: Alert[]
}

export function Topbar({
  sidebarCollapsed,
  dateRange,
  onDateRangeChange,
  userName = "User",
  userEmail = "",
  userRole = "viewer",
  alerts = [],
}: TopbarProps) {
  const unreadAlerts = alerts.filter((a) => !a.isRead)

  const dateRangePresets = [
    {
      label: "Last 7 days",
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    {
      label: "Last 30 days",
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    {
      label: "Last 90 days",
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    {
      label: "Year to date",
      from: new Date(new Date().getFullYear(), 0, 1),
      to: new Date(),
    },
  ]

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-6 transition-all",
        sidebarCollapsed ? "left-[72px]" : "left-[240px]"
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="search"
            placeholder="Search assets, documents, clients..."
            className="pl-10 bg-zinc-900 border-zinc-700"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Date Range Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">
                {format(dateRange.from, "MMM d")} -{" "}
                {format(dateRange.to, "MMM d, yyyy")}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="space-y-1">
              {dateRangePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    onDateRangeChange({ from: preset.from, to: preset.to })
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadAlerts.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-zinc-100">Notifications</h3>
              <p className="text-xs text-zinc-500">
                {unreadAlerts.length} unread alerts
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {alerts.slice(0, 5).map((alert) => {
                const config = alertSeverityConfig[alert.severity]
                return (
                  <Link
                    key={alert.id}
                    href={alert.actionUrl || "#"}
                    className={cn(
                      "block p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors",
                      !alert.isRead && "bg-zinc-900/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 h-2 w-2 rounded-full",
                          alert.severity === "critical"
                            ? "bg-red-400"
                            : alert.severity === "warning"
                            ? "bg-amber-400"
                            : "bg-blue-400"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="p-2 border-t border-zinc-800">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/app">View all notifications</Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-8" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar
                fallback={userName}
                size="sm"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-zinc-100">
                  {userName}
                </p>
                <p className="text-xs text-zinc-500 capitalize">
                  {userRole}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{userName}</p>
              <p className="text-xs text-zinc-500 font-normal">
                {userEmail}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/settings">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-400 focus:text-red-400" asChild>
              <Link href="/">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
