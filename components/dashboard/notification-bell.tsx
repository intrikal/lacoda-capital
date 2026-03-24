"use client"

import * as React from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/crud/use-notifications"
import type { NotificationRecord } from "@/lib/types"

const typeColors: Record<string, string> = {
  task_assigned: "bg-blue-400",
  task_due: "bg-amber-400",
  document_uploaded: "bg-emerald-400",
  document_expiring: "bg-red-400",
  document_requested: "bg-purple-400",
  report_ready: "bg-tiffany-500",
  compliance_alert: "bg-orange-400",
  system: "bg-zinc-400",
}

export function NotificationBell() {
  const { notifications, stats, refetch } = useNotifications()
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead, isPending: markAllPending } = useMarkAllNotificationsRead()
  const [open, setOpen] = React.useState(false)

  const recent = notifications.slice(0, 8)

  const handleMarkRead = async (id: string) => {
    await markRead(id)
    refetch()
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
    refetch()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-zinc-400 hover:text-zinc-100">
          <Bell className="h-4 w-4" />
          {stats.unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center px-1">
              {stats.unread > 99 ? "99+" : stats.unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">Notifications</h3>
            <p className="text-xs text-zinc-500">
              {stats.unread} unread
            </p>
          </div>
          {stats.unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-zinc-400 hover:text-zinc-100"
              onClick={handleMarkAllRead}
              disabled={markAllPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              {markAllPending ? "..." : "Mark all read"}
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {recent.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No notifications yet</p>
            </div>
          ) : (
            recent.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))
          )}
        </div>

        <div className="p-2 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href="/app/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationRecord
  onMarkRead: (id: string) => void
}) {
  const isUnread = !notification.readAt
  const dotColor = typeColors[notification.type] ?? "bg-zinc-400"

  return (
    <button
      className={cn(
        "w-full text-left p-3 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors",
        isUnread && "bg-zinc-900/50"
      )}
      onClick={() => isUnread && onMarkRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", isUnread ? dotColor : "bg-transparent")} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm truncate",
            isUnread ? "font-medium text-zinc-100" : "text-zinc-400"
          )}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-zinc-600 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  )
}
