"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface Tab {
  name: string
  href: string
  count?: number
}

interface PageHeaderProps {
  title: string
  description?: string
  tabs?: Tab[]
  actions?: React.ReactNode
}

export function PageHeader({ title, description, tabs, actions }: PageHeaderProps) {
  const pathname = usePathname()

  return (
    <div className="mb-6">
      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="mt-6 border-b border-zinc-800/60">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href ||
                (tab.href !== tabs[0].href && pathname.startsWith(tab.href))

              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    "relative flex items-center gap-2 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "text-tiffany-500"
                      : "text-zinc-400 hover:text-zinc-100"
                  )}
                >
                  {tab.name}
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                        isActive
                          ? "bg-tiffany-500/10 text-tiffany-500"
                          : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-tiffany-500" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}
