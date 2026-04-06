"use client"

import { CalendarDays, Clock, Video, MapPin, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoMutationTooltip } from "@/lib/demo/mutation-tooltip"
import { cn } from "@/lib/utils"

const EVENTS = [
  {
    id: "e1",
    title: "Q1 Portfolio Review",
    type: "meeting",
    date: "Thu, Jan 30, 2025",
    time: "10:00 AM – 11:00 AM PST",
    location: "Zoom",
    with: "Sarah Anderson",
    description: "Quarterly review of portfolio performance, allocation adjustments, and Q1 outlook.",
    upcoming: true,
  },
  {
    id: "e2",
    title: "Tax Document Review",
    type: "deadline",
    date: "Fri, Feb 14, 2025",
    time: "All day",
    location: null,
    with: null,
    description: "Deadline to review 2024 tax documents with advisor before filing.",
    upcoming: true,
  },
  {
    id: "e3",
    title: "Dividend Payment — VOO",
    type: "payment",
    date: "Thu, Feb 6, 2025",
    time: "Market close",
    location: null,
    with: null,
    description: "Scheduled dividend distribution from Vanguard S&P 500 ETF.",
    upcoming: true,
  },
  {
    id: "e4",
    title: "Annual Strategy Session",
    type: "meeting",
    date: "Wed, Mar 12, 2025",
    time: "9:00 AM – 12:00 PM PST",
    location: "Lacoda Capital Office",
    with: "Sarah Anderson",
    description: "Full annual strategy session covering long-term goals, estate planning, and tax strategy.",
    upcoming: true,
  },
  {
    id: "e5",
    title: "Q4 2024 Portfolio Review",
    type: "meeting",
    date: "Thu, Jan 16, 2025",
    time: "10:00 AM – 11:00 AM PST",
    location: "Zoom",
    with: "Sarah Anderson",
    description: "Year-end portfolio review and 2025 planning.",
    upcoming: false,
  },
]

const TYPE_CONFIG = {
  meeting: { label: "Meeting", color: "bg-tiffany-500/10 text-tiffany-500 border-tiffany-500/20", icon: <Video className="h-3.5 w-3.5" /> },
  deadline: { label: "Deadline", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: <Clock className="h-3.5 w-3.5" /> },
  payment: { label: "Payment", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CalendarDays className="h-3.5 w-3.5" /> },
}

export default function DemoClientCalendarPage() {
  const upcoming = EVENTS.filter((e) => e.upcoming)
  const past = EVENTS.filter((e) => !e.upcoming)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Calendar</h1>
          <p className="text-zinc-400 mt-1 text-sm">Meetings, reviews, and key dates</p>
        </div>
        <DemoMutationTooltip>
          <button className="text-sm px-4 py-2 bg-tiffany-500/10 text-tiffany-500 border border-tiffany-500/20 rounded-lg hover:bg-tiffany-500/20 transition-colors">
            Request Meeting
          </button>
        </DemoMutationTooltip>
      </div>

      {/* Upcoming */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.map((event) => {
            const cfg = TYPE_CONFIG[event.type as keyof typeof TYPE_CONFIG]
            return (
              <div key={event.id} className="flex gap-4 p-4 rounded-xl border border-zinc-700/60 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-zinc-800 text-center">
                  <CalendarDays className="h-5 w-5 text-tiffany-500 mb-1" />
                  <span className="text-[10px] text-zinc-400 leading-tight text-center">{event.date.split(",")[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-zinc-100">{event.title}</p>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0 flex items-center gap-1", cfg.color)}>
                      {cfg.icon}{cfg.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 mb-2">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}</span>
                    {event.date && <span>{event.date}</span>}
                    {event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>}
                    {event.with && <span className="flex items-center gap-1"><User className="h-3 w-3" />{event.with}</span>}
                  </div>
                  <p className="text-xs text-zinc-500">{event.description}</p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Past */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base text-zinc-500">Past Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {past.map((event) => {
            const cfg = TYPE_CONFIG[event.type as keyof typeof TYPE_CONFIG]
            return (
              <div key={event.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-800/40 opacity-60">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-zinc-600" />
                  <div>
                    <p className="text-sm text-zinc-300">{event.title}</p>
                    <p className="text-xs text-zinc-600">{event.date}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
