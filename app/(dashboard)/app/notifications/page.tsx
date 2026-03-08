/**
 * ============================================================================
 * FILE: app/(dashboard)/app/notifications/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Advisor-facing notifications page. Displays a chronological list of
 *   notifications with filter tabs, mark-as-read, and mark-all-read actions.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ NotificationsPage                                                 │
 *   │   ├── useNotifications()              → fetches notification list │
 *   │   ├── useMarkNotificationRead()       → marks one as read        │
 *   │   ├── useMarkAllNotificationsRead()   → marks all as read        │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ notificationResolvers → Drizzle ORM → PostgreSQL                  │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * NOTIFICATION TYPES (DB enum):
 *   task_assigned | task_due | document_uploaded | document_expiring |
 *   document_requested | report_ready | compliance_alert | system
 *
 * CONSUMERS:
 *   This page is rendered at /app/notifications for advisors/admins.
 */
"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  CheckCircle2,
  Clock,
  FileUp,
  AlertTriangle,
  FileText,
  BarChart3,
  Shield,
  Settings,
  CheckCheck,
  Inbox,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/crud/use-notifications"
import type { NotificationType, NotificationRecord } from "@/lib/hooks/crud/use-notifications"

// ─── TYPE CONFIGURATION ─────────────────────────────────────────────────────
//
// Maps notification type enum values to display icons and colors.

const typeConfig: Record<
  NotificationType,
  { label: string; icon: typeof Bell; color: string; bg: string }
> = {
  task_assigned: {
    label: "Task Assigned",
    icon: CheckCircle2,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  task_due: {
    label: "Task Due",
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  document_uploaded: {
    label: "Document Uploaded",
    icon: FileUp,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  document_expiring: {
    label: "Document Expiring",
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  document_requested: {
    label: "Document Requested",
    icon: FileText,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  report_ready: {
    label: "Report Ready",
    icon: BarChart3,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
  },
  compliance_alert: {
    label: "Compliance Alert",
    icon: Shield,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  system: {
    label: "System",
    icon: Settings,
    color: "text-zinc-400",
    bg: "bg-zinc-400/10",
  },
}

// ─── NOTIFICATION ITEM ──────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: NotificationRecord
  onMarkRead: (id: string) => void
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const cfg = typeConfig[notification.type]
  const Icon = cfg.icon
  const isUnread = !notification.readAt

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border transition-colors",
        isUnread
          ? "bg-zinc-800/40 border-zinc-700/50"
          : "bg-transparent border-zinc-800/30 opacity-70"
      )}
    >
      <div className={cn("p-2.5 rounded-lg shrink-0", cfg.bg)}>
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-sm truncate",
                isUnread ? "font-semibold text-zinc-100" : "font-medium text-zinc-300"
              )}>
                {notification.title}
              </p>
              {isUnread && (
                <div className="h-2 w-2 rounded-full bg-tiffany-500 shrink-0" />
              )}
            </div>
            {notification.message && (
              <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className={cn("text-xs", cfg.color)}>{cfg.label}</span>
              <span className="text-xs text-zinc-500">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          {isUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-400 hover:text-zinc-100 shrink-0"
              onClick={() => onMarkRead(notification.id)}
            >
              Mark read
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE COMPONENT ─────────────────────────────────────────────────────────

type TabId = "all" | "unread" | "read"

export default function NotificationsPage() {
  const { notifications, stats } = useNotifications()
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead, isPending: markAllPending } = useMarkAllNotificationsRead()

  const [activeTab, setActiveTab] = React.useState<TabId>("all")
  const reducedMotion = useReducedMotion()

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const filteredNotifications = React.useMemo(() => {
    if (activeTab === "unread") return notifications.filter((n) => !n.readAt)
    if (activeTab === "read") return notifications.filter((n) => !!n.readAt)
    return notifications
  }, [notifications, activeTab])

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Notifications</h1>
          <p className="text-zinc-400 mt-1">
            Stay updated on tasks, documents, and system events
          </p>
        </div>
        {stats.unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead()}
            disabled={markAllPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            {markAllPending ? "Marking..." : "Mark all as read"}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Total</p>
              <Bell className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="text-2xl font-bold text-zinc-100 mt-2">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Unread</p>
              <Bell className="h-4 w-4 text-tiffany-500" />
            </div>
            <p className="text-2xl font-bold text-tiffany-500 mt-2">{stats.unread}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Read</p>
              <CheckCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-2">{stats.read}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + List */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({stats.unread})</TabsTrigger>
          <TabsTrigger value="read">Read ({stats.read})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">
                {activeTab === "unread"
                  ? "All caught up!"
                  : activeTab === "read"
                  ? "No read notifications"
                  : "No notifications yet"}
              </h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                {activeTab === "unread"
                  ? "You have no unread notifications. Check back later."
                  : "Notifications will appear here as events occur in your organization."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markRead}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </animated.div>
  )
}
