"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from "date-fns"
import {
  Calendar as CalendarIcon,
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
  Video,
  Phone,
  Building2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

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

type EventType = keyof typeof eventTypeConfig

interface CalendarEvent {
  id: string
  title: string
  type: EventType
  date: Date
  time?: string
  endTime?: string
  location?: string
  amount?: number
  description?: string
  attendees?: string[]
  reminder?: boolean
}

// Mock calendar events
const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Q1 Portfolio Review",
    type: "meeting",
    date: new Date(),
    time: "10:00 AM",
    endTime: "11:30 AM",
    location: "Conference Room A",
    attendees: ["Sarah Chen", "Michael Ross", "Investment Team"],
    reminder: true,
  },
  {
    id: "2",
    title: "Property Tax Payment - Manhattan",
    type: "payment",
    date: addDays(new Date(), 2),
    amount: 24500,
    description: "Annual property tax for 432 Park Ave unit",
    reminder: true,
  },
  {
    id: "3",
    title: "AAPL Dividend",
    type: "dividend",
    date: addDays(new Date(), 5),
    amount: 2840,
    description: "Quarterly dividend payment - 1,200 shares",
  },
  {
    id: "4",
    title: "Tax Filing Deadline",
    type: "deadline",
    date: addDays(new Date(), 12),
    description: "Q4 estimated tax payment due",
    reminder: true,
  },
  {
    id: "5",
    title: "Insurance Renewal Review",
    type: "document",
    date: addDays(new Date(), 8),
    time: "2:00 PM",
    description: "Review umbrella policy renewal terms",
  },
  {
    id: "6",
    title: "Call with Estate Attorney",
    type: "call",
    date: addDays(new Date(), 3),
    time: "3:30 PM",
    endTime: "4:00 PM",
    attendees: ["James Mitchell, Esq."],
  },
  {
    id: "7",
    title: "Board Meeting - Tech Startup",
    type: "meeting",
    date: addDays(new Date(), 7),
    time: "9:00 AM",
    endTime: "12:00 PM",
    location: "Virtual - Zoom",
    attendees: ["Board Members", "CEO", "CFO"],
  },
  {
    id: "8",
    title: "Mortgage Payment",
    type: "payment",
    date: addDays(new Date(), 1),
    amount: 8450,
    description: "Monthly mortgage - Miami Beach property",
  },
  {
    id: "9",
    title: "MSFT Dividend",
    type: "dividend",
    date: addDays(new Date(), 15),
    amount: 1560,
    description: "Quarterly dividend payment - 600 shares",
  },
  {
    id: "10",
    title: "Annual Compliance Review",
    type: "deadline",
    date: addDays(new Date(), 20),
    description: "SOC 2 compliance documentation due",
    reminder: true,
  },
]

function EventCard({ event }: { event: CalendarEvent }) {
  const config = eventTypeConfig[event.type]
  const EventIcon = config.icon

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors hover:border-zinc-600",
      config.bg,
      config.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <EventIcon className={cn("h-4 w-4", config.color)} />
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
            <p className={cn("text-sm font-medium mt-1", config.color)}>
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
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())
  const [addEventOpen, setAddEventOpen] = React.useState(false)
  const reducedMotion = useReducedMotion()

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get day of week for first day (0 = Sunday)
  const startDayOfWeek = monthStart.getDay()

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? mockEvents.filter(event => isSameDay(event.date, selectedDate))
    : []

  // Get upcoming events (next 7 days)
  const upcomingEvents = mockEvents
    .filter(event => event.date >= new Date() && event.date <= addDays(new Date(), 7))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  // Check if a day has events
  const getEventsForDay = (day: Date) => mockEvents.filter(event => isSameDay(event.date, day))

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
        <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Schedule a meeting, payment, or deadline.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Event Title</Label>
                <Input placeholder="Enter event title" />
              </div>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select defaultValue="meeting">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="Add details..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddEventOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setAddEventOpen(false)}>
                Add Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <p className="text-2xl font-bold text-zinc-100">4</p>
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
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(32950)}</p>
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
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(4400)}</p>
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
                <p className="text-2xl font-bold text-zinc-100">2</p>
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
                        {dayEvents.slice(0, 3).map((event, i) => (
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
    </animated.div>
  )
}
