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
import { cn, formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// Calendar events
const events = [
  {
    id: "1",
    title: "Quarterly Portfolio Review",
    date: "2024-01-25",
    time: "10:00 AM",
    duration: "1 hour",
    type: "meeting",
    location: "Video Call",
    with: "Sarah Anderson",
    description: "Review Q4 performance and discuss 2024 strategy",
  },
  {
    id: "2",
    title: "Tax Planning Session",
    date: "2024-01-30",
    time: "2:00 PM",
    duration: "45 min",
    type: "meeting",
    location: "Phone Call",
    with: "Michael Chen",
    description: "Discuss tax optimization strategies for 2024",
  },
  {
    id: "3",
    title: "Dividend Payment - AAPL",
    date: "2024-02-08",
    time: "",
    type: "payment",
    amount: 1850,
    description: "Quarterly dividend from Apple Inc.",
  },
  {
    id: "4",
    title: "Tax Documents Due",
    date: "2024-02-15",
    time: "",
    type: "deadline",
    description: "Submit 2023 tax documents to accountant",
  },
  {
    id: "5",
    title: "Annual Review Meeting",
    date: "2024-02-20",
    time: "11:00 AM",
    duration: "1.5 hours",
    type: "meeting",
    location: "In Person",
    with: "Sarah Anderson",
    description: "Comprehensive annual portfolio review",
  },
  {
    id: "6",
    title: "Dividend Payment - VTI",
    date: "2024-02-22",
    time: "",
    type: "payment",
    amount: 2400,
    description: "Quarterly dividend from Vanguard Total Stock Market",
  },
  {
    id: "7",
    title: "Real Estate Closing",
    date: "2024-03-01",
    time: "9:00 AM",
    duration: "2 hours",
    type: "meeting",
    location: "In Person",
    description: "Closing on new investment property",
  },
  {
    id: "8",
    title: "Quarterly Statement",
    date: "2024-03-15",
    time: "",
    type: "report",
    description: "Q1 2024 portfolio statement available",
  },
]

const eventTypeConfig = {
  meeting: { icon: Video, color: "text-blue-400", bg: "bg-blue-400/10", label: "Meeting" },
  payment: { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Payment" },
  deadline: { icon: Bell, color: "text-rose-400", bg: "bg-rose-400/10", label: "Deadline" },
  report: { icon: FileText, color: "text-purple-400", bg: "bg-purple-400/10", label: "Report" },
}

const locationIcons = {
  "Video Call": Video,
  "Phone Call": Phone,
  "In Person": MapPin,
}

export default function ClientCalendarPage() {
  const reducedMotion = useReducedMotion()
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add padding days for the calendar grid
  const startDay = monthStart.getDay()
  const paddingDays = Array(startDay).fill(null)

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), date))
  }

  // Get upcoming events
  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

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
        <Button>
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
              {Object.entries(eventTypeConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", config.bg)} />
                  <span className="text-xs text-zinc-400">{config.label}</span>
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
                                  {event.duration && ` (${event.duration})`}
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
                  const Icon = typeConfig.icon

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                      onClick={() => setSelectedDate(new Date(event.date))}
                    >
                      <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                        <Icon className={cn("h-4 w-4", typeConfig.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{event.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {format(new Date(event.date), "MMM d")}
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
              <Button size="sm" className="w-full">
                Schedule Meeting
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </animated.div>
  )
}
