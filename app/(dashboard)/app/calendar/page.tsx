/**
 * ============================================================================
 * FILE: app/(dashboard)/app/calendar/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Advisor-facing calendar page with monthly grid, event details,
 *   summary stats, and upcoming events sidebar.
 *
 * ARCHITECTURE:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ CalendarPage                                                      │
 *   │   ├── useCalendarEvents()          → fetches all events           │
 *   │   ├── useCreateCalendarEvent()     → creates a new event          │
 *   │         ↓                                                          │
 *   │ Apollo Client (useQuery / useMutation)                             │
 *   │         ↓                                                          │
 *   │ POST /api/graphql                                                  │
 *   │         ↓                                                          │
 *   │ calendarEventResolvers → Drizzle ORM → PostgreSQL                 │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * CONSUMERS:
 *   This page is rendered at /app/calendar for advisors/admins.
 */
"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Bell,
  DollarSign,
  FileText,
  AlertCircle,
  Phone,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useCalendarEvents, useCreateCalendarEvent } from "@/lib/hooks/crud/use-calendar-events"
import { EventFormDialog } from "@/components/forms/event-form-dialog"
import type { CalendarEventType } from "@/lib/hooks/crud/use-calendar-events"

// Event types and their configurations
const eventTypeConfig = {
  meeting: {
    label: "Meeting",
    icon: Users,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
  },
  payment: {
    label: "Payment Due",
    icon: DollarSign,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  dividend: {
    label: "Dividend",
    icon: DollarSign,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
  },
  deadline: {
    label: "Deadline",
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
  },
  document: {
    label: "Document",
    icon: FileText,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
  },
  call: {
    label: "Call",
    icon: Phone,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
    border: "border-tiffany-500/30",
  },
}

interface CalendarEventWithDate {
  id: string
  title: string
  type: CalendarEventType
  date: Date
  time?: string | null
  endTime?: string | null
  location?: string | null
  amount?: number | null
  description?: string | null
  attendees?: string[] | null
  reminder?: boolean
}

function EventCard({ event }: { event: CalendarEventWithDate }) {
  const cfg = eventTypeConfig[event.type]
  const EventIcon = cfg.icon

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors hover:border-zinc-600",
      cfg.bg,
      cfg.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", cfg.bg)}>
          <EventIcon className={cn("h-4 w-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-zinc-100 truncate">{event.title}</p>
            {event.reminder && (
              <Bell className="h-3 w-3 text-zinc-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            {event.time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {event.time}{event.endTime && ` - ${event.endTime}`}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
          </div>
          {event.amount && (
            <p className={cn("text-sm font-medium mt-1", cfg.color)}>
              {event.type === "payment" ? "-" : "+"}{formatCurrency(event.amount)}
            </p>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <p className="text-xs text-zinc-500 mt-1">
              {event.attendees.slice(0, 2).join(", ")}
              {event.attendees.length > 2 && ` +${event.attendees.length - 2} more`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { events } = useCalendarEvents()
  const { mutate: createEvent, isPending } = useCreateCalendarEvent()
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())
  const [addEventOpen, setAddEventOpen] = React.useState(false)
  const reducedMotion = useReducedMotion()

  // Convert ISO date strings from API to Date objects for calendar rendering
  const eventsWithDates: CalendarEventWithDate[] = React.useMemo(
    () => events.map((e) => ({ ...e, date: new Date(e.date) })),
    [events]
  )

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get day of week for first day (0 = Sunday)
  const startDayOfWeek = monthStart.getDay()

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? eventsWithDates.filter(event => isSameDay(event.date, selectedDate))
    : []

  // Get upcoming events (next 7 days)
  const upcomingEvents = eventsWithDates
    .filter(event => event.date >= new Date() && event.date <= addDays(new Date(), 7))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  // Check if a day has events
  const getEventsForDay = (day: Date) => eventsWithDates.filter(event => isSameDay(event.date, day))

  // Summary stats derived from hook data
  const summaryStats = React.useMemo(() => {
    const upcoming7 = eventsWithDates.filter(
      (e) => e.date >= new Date() && e.date <= addDays(new Date(), 7)
    )
    return {
      meetings: upcoming7.filter((e) => e.type === "meeting").length,
      paymentsDue: upcoming7.filter((e) => e.type === "payment").reduce((sum, e) => sum + (e.amount ?? 0), 0),
      dividends: upcoming7.filter((e) => e.type === "dividend").reduce((sum, e) => sum + (e.amount ?? 0), 0),
      deadlines: upcoming7.filter((e) => e.type === "deadline").length,
    }
  }, [eventsWithDates])

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Calendar</h1>
          <p className="text-zinc-400 mt-1">
            Manage meetings, deadlines, and important dates
          </p>
        </div>
        <Button onClick={() => setAddEventOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-400/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Meetings This Week</p>
                <p className="text-2xl font-bold text-zinc-100">{summaryStats.meetings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-400/10">
                <DollarSign className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Payments Due</p>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(summaryStats.paymentsDue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-400/10">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Expected Dividends</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(summaryStats.dividends)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-400/10">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Deadlines</p>
                <p className="text-2xl font-bold text-zinc-100">{summaryStats.deadlines}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {format(currentDate, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentDate(addDays(monthStart, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentDate(addDays(monthEnd, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month start */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Month days */}
              {daysInMonth.map((day) => {
                const dayEvents = getEventsForDay(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square p-1 rounded-lg text-sm transition-colors relative",
                      "hover:bg-zinc-800",
                      isToday(day) && "ring-1 ring-tiffany-500",
                      isSelected && "bg-tiffany-500/20 text-tiffany-500",
                      !isSameMonth(day, currentDate) && "text-zinc-600"
                    )}
                  >
                    <span className={cn(
                      "block",
                      isToday(day) && "font-bold text-tiffany-500"
                    )}>
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              eventTypeConfig[event.type].bg.replace("/10", "")
                            )}
                            style={{
                              backgroundColor: eventTypeConfig[event.type].color.replace("text-", "").includes("400")
                                ? `var(--${eventTypeConfig[event.type].color.replace("text-", "").replace("-400", "")})`
                                : undefined
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
              </CardTitle>
              <CardDescription>
                {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No events scheduled
                </p>
              ) : (
                selectedDateEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming Events</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <div className={cn(
                    "p-1.5 rounded",
                    eventTypeConfig[event.type].bg
                  )}>
                    {React.createElement(eventTypeConfig[event.type].icon, {
                      className: cn("h-3.5 w-3.5", eventTypeConfig[event.type].color)
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {format(event.date, "EEE, MMM d")}
                      {event.time && ` at ${event.time}`}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <EventFormDialog
        mode="create"
        initialData={selectedDate ? { date: format(selectedDate, "yyyy-MM-dd") } : undefined}
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        onSubmit={(data) => createEvent(data)}
        isPending={isPending}
      />
    </animated.div>
  )
}
