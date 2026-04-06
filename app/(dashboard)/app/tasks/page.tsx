/**
 * ============================================================================
 * FILE: /app/(dashboard)/app/tasks/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   The advisor-facing Tasks dashboard. Displays a list of tasks with full
 *   CRUD operations (create, edit, delete, mark complete) backed by the
 *   GraphQL API.
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ TasksPage (this file)                                           │
 *   │   ├── useTasks()       → fetch task list from DB                │
 *   │   ├── useCreateTask()  → insert new task                        │
 *   │   ├── useUpdateTask()  → edit task / mark complete / reopen     │
 *   │   ├── useDeleteTask()  → remove task (admin only)               │
 *   │   ├── TaskFormDialog   → create/edit modal form                 │
 *   │   └── AlertDialog      → delete confirmation                    │
 *   │         ↓                                                       │
 *   │ Apollo Client → POST /api/graphql → resolvers → PostgreSQL      │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * FILTER TABS:
 *   All | Pending | In Progress | Completed — filters the task list by status.
 *
 * DB ENUMS (app/db/schema/00_enums.ts):
 *   taskStatus:   pending | in_progress | completed | cancelled
 *   taskPriority: low | medium | high | urgent
 *
 * AUTO-COMPLETION:
 *   When a task's status is set to "completed", the resolver automatically
 *   sets completedAt and completedBy. No client-side logic needed.
 *
 * CONSUMERS: Rendered at /app/tasks for admin/assistant users.
 *
 * RELATED FILES:
 *   - lib/hooks/crud/use-tasks.ts              — data hooks
 *   - components/forms/task-form-dialog.tsx     — form dialog
 *   - lib/graphql/operations/task.ts            — GraphQL operations
 *   - lib/graphql/resolvers/task.ts             — server-side resolvers
 *   - app/(dashboard)/app/reports/page.tsx      — same pattern for reports
 */

"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Plus,
  CheckSquare,
  Clock,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Calendar,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/lib/hooks/crud/use-tasks"
import type { TaskRecord } from "@/lib/hooks/crud/use-tasks"
import { TaskFormDialog } from "@/components/forms/task-form-dialog"

// ─── PRIORITY CONFIGURATION ──────────────────────────────────────────────────
//
// Maps DB priority enum values to display labels, icons, and colors.
// Used for priority badges on each task card.

const priorityConfig = {
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
  },
  high: {
    label: "High",
    icon: ArrowUp,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
  },
  medium: {
    label: "Medium",
    icon: Minus,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
  },
  low: {
    label: "Low",
    icon: ArrowDown,
    color: "text-zinc-500",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/30",
  },
}

// ─── STATUS CONFIGURATION ───────────────────────────────────────────────────
//
// Maps DB status enum to display labels, icons, and colors.

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-amber-400",
  },
  in_progress: {
    label: "In Progress",
    icon: Loader2,
    color: "text-blue-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-zinc-500",
  },
}

// ─── PAGE COMPONENT ─────────────────────────────────────────────────────────

export default function TasksPage() {
  // ── Data hooks ──────────────────────────────────────────────────────────
  const { tasks, isLoading, stats } = useTasks()
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<TaskRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const reducedMotion = useReducedMotion()

  // ── Animation ───────────────────────────────────────────────────────────
  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  // ── Filtered tasks based on active tab ──────────────────────────────────
  const filteredTasks = React.useMemo(() => {
    if (activeTab === "all") return tasks
    return tasks.filter((t) => t.status === activeTab)
  }, [tasks, activeTab])

  // ── Handlers ────────────────────────────────────────────────────────────

  /** Confirm delete — calls the deleteTask mutation. */
  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <animated.div style={spring}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Tasks</h1>
          <p className="text-zinc-400 mt-1">
            Manage and track your team&apos;s tasks
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* ── Create / Edit Dialog ───────────────────────────────────────── */}
      <TaskFormDialog
        mode={createOpen ? "create" : "edit"}
        open={createOpen || !!editTarget}
        initialData={createOpen ? undefined : (editTarget ?? undefined)}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setEditTarget(null)
          }
        }}
        onSubmit={(data) => {
          if (createOpen) {
            createMutation.mutate({
              title: data.title!,
              description: data.description,
              dueDate: data.dueDate,
              priority: data.priority ?? "medium",
              status: data.status ?? "pending",
            })
          } else if (editTarget) {
            updateMutation.mutate({ id: editTarget.id, input: data })
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this task.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Two-panel layout ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:grid lg:grid-cols-[220px_1fr] rounded-xl border border-zinc-800/60 overflow-hidden">

        {/* ── Left sticky sidebar ────────────────────────────────────────── */}
        <aside className="flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-zinc-800/60 lg:sticky lg:top-14 lg:h-[calc(100vh-80px)] lg:overflow-y-auto bg-zinc-900/40">

          {/* Stats */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Overview</p>
            {[
              { label: "Total",       value: stats.total,      color: "text-zinc-300",    icon: CheckSquare },
              { label: "Pending",     value: stats.pending,    color: "text-amber-400",   icon: Clock },
              { label: "In Progress", value: stats.inProgress, color: "text-blue-400",    icon: Loader2 },
              { label: "Completed",   value: stats.completed,  color: "text-emerald-400", icon: CheckCircle2 },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
                <div className="flex items-center gap-2">
                  {React.createElement(s.icon, { className: cn("h-3.5 w-3.5", s.color) })}
                  <span className="text-sm text-zinc-400">{s.label}</span>
                </div>
                <span className={cn("text-sm font-bold tabular-nums", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800/60" />

          {/* Filter */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Filter</p>
            {[
              { id: "all",         label: "All Tasks",    count: stats.total },
              { id: "pending",     label: "Pending",      count: stats.pending },
              { id: "in_progress", label: "In Progress",  count: stats.inProgress },
              { id: "completed",   label: "Completed",    count: stats.completed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-tiffany-500/10 text-tiffany-500"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn("text-xs font-mono", activeTab === tab.id ? "text-tiffany-400" : "text-zinc-600")}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div className="p-5 lg:p-6 min-w-0">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-zinc-500">
                Loading tasks…
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-zinc-500">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  {activeTab === "all"
                    ? "No tasks yet. Click \"Add Task\" to create one."
                    : `No ${statusConfig[activeTab as keyof typeof statusConfig]?.label.toLowerCase() ?? ""} tasks.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const priority = priorityConfig[task.priority]
                const status = statusConfig[task.status]
                const PriorityIcon = priority.icon
                const StatusIcon = status.icon

                return (
                  <Card key={task.id} className="hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn("p-2 rounded-lg shrink-0", priority.bg)}>
                            <PriorityIcon className={cn("h-4 w-4", priority.color)} />
                          </div>

                          <div className="min-w-0">
                            <p className={cn(
                              "font-medium text-zinc-100",
                              task.status === "completed" && "line-through text-zinc-500"
                            )}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500 flex-wrap">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border",
                                priority.color, priority.border, priority.bg
                              )}>
                                {priority.label}
                              </span>
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.dueDate), "MMM d, yyyy")}
                                </span>
                              )}
                              {task.description && (
                                <span className="truncate max-w-[200px]">{task.description}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={cn("h-4 w-4", status.color)} />
                            <span className={cn("text-sm hidden sm:inline", status.color)}>{status.label}</span>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditTarget(task); setCreateOpen(false) }}>
                                Edit
                              </DropdownMenuItem>
                              {task.status !== "completed" && (
                                <DropdownMenuItem
                                  onClick={() => updateMutation.mutate({ id: task.id, input: { status: "completed" } })}
                                >
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              {task.status === "completed" && (
                                <DropdownMenuItem
                                  onClick={() => updateMutation.mutate({ id: task.id, input: { status: "pending" } })}
                                >
                                  Reopen
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-400" onClick={() => setDeleteTarget(task.id)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </animated.div>
  )
}
