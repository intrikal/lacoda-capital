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
        "flex items-center justify-between gap-4 p-4 rounded-lg border border-zinc-800/40 bg-zinc-900/20",
        "transition-colors hover:border-zinc-700/60 hover:bg-zinc-800/20",
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
