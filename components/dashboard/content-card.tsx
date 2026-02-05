"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  noPadding?: boolean
}

export function ContentCard({
  children,
  className,
  noPadding,
  ...props
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800/60 bg-zinc-900/30",
        !noPadding && "p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ContentCardHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function ContentCardHeader({ title, description, action }: ContentCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  trend?: {
    value: string
    positive?: boolean
  }
}

export function StatCard({ label, value, subtext, icon, trend }: StatCardProps) {
  return (
    <ContentCard>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
          {subtext && (
            <p className="mt-0.5 text-xs text-zinc-500">{subtext}</p>
          )}
          {trend && (
            <p className={cn(
              "mt-1 text-xs font-medium",
              trend.positive ? "text-emerald-400" : "text-rose-400"
            )}>
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-zinc-800/60">
            {icon}
          </div>
        )}
      </div>
    </ContentCard>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  stats?: React.ReactNode
}

export function PageHeader({ title, description, actions, stats }: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {stats}
    </div>
  )
}

interface TabItem {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (id: string) => void
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="border-b border-zinc-800/60">
      <nav className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 py-3 text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "text-tiffany-500"
                : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs",
                  activeTab === tab.id
                    ? "bg-tiffany-500/10 text-tiffany-500"
                    : "bg-zinc-800 text-zinc-400"
                )}
              >
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-tiffany-500" />
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-3 rounded-lg bg-zinc-800/60 mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-zinc-100">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface ListItemProps {
  icon?: React.ReactNode
  iconBg?: string
  title: string
  subtitle?: string
  meta?: React.ReactNode
  action?: React.ReactNode
  onClick?: () => void
}

export function ListItem({ icon, iconBg, title, subtitle, meta, action, onClick }: ListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3 px-4",
        "transition-colors hover:bg-zinc-800/30",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 min-w-0">
        {icon && (
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            iconBg || "bg-zinc-800/60"
          )}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{title}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {meta}
        {action}
      </div>
    </div>
  )
}
