/**
 * ============================================================================
 * FILE: app/(client)/client/calendar/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Client portal calendar page. Displays a monthly calendar grid with
 *   event indicators, upcoming events sidebar, and a quick schedule dialog.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ ClientCalendarPage                                                │
 *   │   ├── useCalendarEvents()          → fetches all events           │
 *   │   ├── useCreateCalendarEvent()     → creates a new event          │
 *   │         ↓                                                          │
 *   │ Server Actions (lib/actions/calendar-event.actions.ts)             │
 *   │         ↓                                                          │
 *   │ Drizzle ORM → PostgreSQL                                           │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * CONSUMERS:
 *   This page is rendered at /client/calendar for client portal users.
 */
"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  Bell,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn, formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useCalendarEvents, useCreateCalendarEvent } from "@/lib/hooks/crud/use-calendar-events"

// ─────────────────────────────────────────────────────────────────────────────
// Display config (static, not data)
// ─────────────────────────────────────────────────────────────────────────────

const eventTypeConfig = {
  meeting: { icon: Video, color: "text-blue-400", bg: "bg-blue-400/10", label: "Meeting" },
  payment: { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Payment" },
  deadline: { icon: Bell, color: "text-rose-400", bg: "bg-rose-400/10", label: "Deadline" },
  report: { icon: FileText, color: "text-purple-400", bg: "bg-purple-400/10", label: "Report" },
  dividend: { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Dividend" },
  document: { icon: FileText, color: "text-purple-400", bg: "bg-purple-400/10", label: "Document" },
  call: { icon: Phone, color: "text-blue-400", bg: "bg-blue-400/10", label: "Call" },
}

const locationIcons = {
  "Video Call": Video,
  "Phone Call": Phone,
  "In Person": MapPin,
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientCalendarPage() {
  const reducedMotion = useReducedMotion()
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [scheduleOpen, setScheduleOpen] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState("")
  const [newDate, setNewDate] = React.useState("")

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { events } = useCalendarEvents()
  const { mutate: createEvent } = useCreateCalendarEvent()

  // Convert ISO date strings → Date objects once per render cycle
  const eventsWithDates = React.useMemo(
    () => events.map((e) => ({ ...e, date: new Date(e.date) })),
    [events]
  )

  // ── Spring animation ───────────────────────────────────────────────────────
  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  // ── Calendar grid helpers ──────────────────────────────────────────────────
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = monthStart.getDay()
  const paddingDays = Array(startDay).fill(null)

  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  // ── Event helpers ──────────────────────────────────────────────────────────
  const getEventsForDate = (date: Date) =>
    eventsWithDates.filter((event) => isSameDay(event.date, date))

  const upcomingEvents = eventsWithDates
    .filter((event) => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5)

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // ── Schedule meeting submit ────────────────────────────────────────────────
  function handleScheduleSubmit() {
    if (!newTitle.trim() || !newDate) return
    createEvent({
      title: newTitle.trim(),
      date: newDate,
      type: "meeting",
    })
    setNewTitle("")
    setNewDate("")
    setScheduleOpen(false)
  }

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Calendar</h1>
          <p className="text-zinc-400 mt-1">
            View upcoming meetings, payments, and deadlines
          </p>
        </div>
        <Button onClick={() => setScheduleOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {format(currentDate, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-zinc-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, index) => (
                <div key={`padding-${index}`} className="h-20" />
              ))}
              {daysInMonth.map((day) => {
                const dayEvents = getEventsForDate(day)
                const hasEvents = dayEvents.length > 0
                const isSelected = selectedDate && isSameDay(day, selectedDate)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "h-20 p-1 rounded-lg border text-left transition-colors",
                      isToday(day)
                        ? "border-tiffany-500/50 bg-tiffany-500/10"
                        : isSelected
                        ? "border-zinc-600 bg-zinc-800"
                        : "border-transparent hover:border-zinc-700 hover:bg-zinc-800/50",
                      !isSameMonth(day, currentDate) && "opacity-40"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isToday(day) ? "text-tiffany-500" : "text-zinc-300"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {hasEvents && (
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map((event) => {
                          const typeConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig]
                          if (!typeConfig) return null
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate",
                                typeConfig.bg,
                                typeConfig.color
                              )}
                            >
                              {event.title}
                            </div>
                          )
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-zinc-500 pl-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Event Type Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
              {Object.entries(eventTypeConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", cfg.bg)} />
                  <span className="text-xs text-zinc-400">{cfg.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Event Details / Upcoming */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          {selectedDate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {format(selectedDate, "EEEE, MMMM d")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-zinc-500">No events scheduled</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => {
                      const typeConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig]
                      if (!typeConfig) return null
                      const Icon = typeConfig.icon

                      return (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                              <Icon className={cn("h-4 w-4", typeConfig.color)} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-zinc-100">{event.title}</p>
                              {event.time && (
                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {event.time}
                                </p>
                              )}
                              {event.location && (
                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                  {React.createElement(
                                    locationIcons[event.location as keyof typeof locationIcons] || MapPin,
                                    { className: "h-3 w-3" }
                                  )}
                                  {event.location}
                                </p>
                              )}
                              {event.amount && (
                                <p className="text-sm font-medium text-emerald-400 mt-1">
                                  +{formatCurrency(event.amount)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const typeConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig]
                  if (!typeConfig) return null
                  const Icon = typeConfig.icon

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                      onClick={() => setSelectedDate(event.date)}
                    >
                      <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                        <Icon className={cn("h-4 w-4", typeConfig.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{event.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {format(event.date, "MMM d")}
                          {event.time && ` at ${event.time}`}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs shrink-0", typeConfig.color)}>
                        {typeConfig.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Schedule */}
          <Card className="border-tiffany-500/20 bg-tiffany-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-tiffany-500/20">
                  <CalendarIcon className="h-4 w-4 text-tiffany-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">Need to meet?</p>
                  <p className="text-xs text-zinc-400">Schedule time with your advisor</p>
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={() => setScheduleOpen(true)}>
                Schedule Meeting
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Meeting Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Add a new meeting or event to your calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                placeholder="e.g., Quarterly Portfolio Review"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSubmit} disabled={!newTitle.trim() || !newDate}>
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </animated.div>
  )
}
