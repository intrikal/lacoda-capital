"use client"

import * as React from "react"
import { Bell, Search, User, LogOut, Settings, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar } from "@/components/ui/avatar"

interface ClientHeaderProps {
  sidebarCollapsed: boolean
}

export function ClientHeader({ sidebarCollapsed }: ClientHeaderProps) {
  return (
    <header
      className="fixed top-0 right-0 z-30 h-16 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur"
      style={{ left: sidebarCollapsed ? 72 : 240 }}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search your portfolio..."
            className="pl-10 bg-zinc-900 border-zinc-800"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-zinc-400" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-teal-500 text-white">
              2
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar
                  size="sm"
                  fallback="John Doe"
                  className="bg-teal-500/20 text-teal-400"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-zinc-100">John Doe</p>
                  <p className="text-xs text-zinc-500">Premium Client</p>
                </div>
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-zinc-100">John Doe</p>
                <p className="text-xs text-zinc-500">john.doe@example.com</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-400">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
