"use client"

import * as React from "react"
import Link from "next/link"
import { format, isPast, isFuture, parseISO } from "date-fns"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Ticket,
  Video,
  Mic,
  Users,
  Presentation,
  Radio,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  type SanityEvent,
  type EventType,
  eventTypeLabels,
  eventTypeColors,
} from "@/lib/sanity/types"
import { getAllEvents } from "@/lib/sanity/fetch"
import { fallbackEvents } from "@/lib/config/events"

// ─────────────────────────────────────────────────────────────────────────────
// Convert mock data to Sanity format for fallback
// ─────────────────────────────────────────────────────────────────────────────

function convertMockToSanity(mock: typeof fallbackEvents): SanityEvent[] {
  return mock.map((event) => ({
    _id: event.id,
    title: event.title,
    slug: { _type: "slug" as const, current: event.id },
    description: event.description,
    date: event.date,
    endDate: event.endDate,
    time: event.time,
    location: event.location,
    eventType: event.type,
    role: event.role,
    topic: event.topic,
    registrationUrl: event.registrationUrl,
    eventUrl: event.eventUrl,
    tags: event.tags,
    isFeatured: event.isFeatured,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Type Icons
// ─────────────────────────────────────────────────────────────────────────────

const eventTypeIcons: Record<EventType, LucideIcon> = {
  speaking: Mic,
  panel: Users,
  workshop: Presentation,
  conference: Calendar,
  webinar: Video,
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Section Component
// ─────────────────────────────────────────────────────────────────────────────

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const spring = useSpring({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0px)" : "translateY(20px)",
    config: config.gentle,
    delay: reducedMotion ? 0 : delay,
    immediate: reducedMotion,
  })

  return (
    <animated.div ref={ref} style={spring} className={className}>
      {children}
    </animated.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: SanityEvent
  index: number
  isPastEvent?: boolean
}

function EventCard({ event, index, isPastEvent = false }: EventCardProps) {
  const Icon = eventTypeIcons[event.eventType]
  const eventDate = parseISO(event.date)
  const endDate = event.endDate ? parseISO(event.endDate) : null

  const formatDateRange = () => {
    if (endDate) {
      return `${format(eventDate, "MMM d")} - ${format(endDate, "d, yyyy")}`
    }
    return format(eventDate, "MMMM d, yyyy")
  }

  return (
    <FadeIn delay={index * 100}>
      <Card
        className={cn(
          "group h-full transition-all hover:border-teal-500/30",
          isPastEvent && "opacity-70 hover:opacity-100",
          event.isFeatured && !isPastEvent && "border-teal-500/20 bg-teal-500/5"
        )}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg border",
                  eventTypeColors[event.eventType]
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <Badge
                  variant="outline"
                  className={cn("text-xs", eventTypeColors[event.eventType])}
                >
                  {eventTypeLabels[event.eventType]}
                </Badge>
                {event.isFeatured && !isPastEvent && (
                  <Badge variant="primary" className="ml-2 text-xs">
                    Featured
                  </Badge>
                )}
              </div>
            </div>
            {event.location.isVirtual && (
              <Badge variant="secondary" className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                Virtual
              </Badge>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="text-xl font-semibold text-zinc-100 mb-2 group-hover:text-teal-400 transition-colors">
            {event.title}
          </h3>
          {event.topic && (
            <p className="text-sm text-teal-400 font-medium mb-2">
              &quot;{event.topic}&quot;
            </p>
          )}
          <p className="text-zinc-400 text-sm line-clamp-2 mb-4">
            {event.description}
          </p>

          {/* Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Calendar className="h-4 w-4 text-zinc-500" />
              <span>{formatDateRange()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="h-4 w-4 text-zinc-500" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <MapPin className="h-4 w-4 text-zinc-500" />
              <span>
                {event.location.venue}, {event.location.city}
                {event.location.country !== event.location.city &&
                  `, ${event.location.country}`}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          {!isPastEvent && (
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
              {event.registrationUrl && (
                <Button size="sm" variant="glow" asChild>
                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    Register
                  </a>
                </Button>
              )}
              {event.eventUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={event.eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Event Details
                  </a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Featured Event Component
// ─────────────────────────────────────────────────────────────────────────────

function FeaturedEvent({ event }: { event: SanityEvent }) {
  const Icon = eventTypeIcons[event.eventType]
  const eventDate = parseISO(event.date)
  const endDate = event.endDate ? parseISO(event.endDate) : null

  const formatDateRange = () => {
    if (endDate) {
      return `${format(eventDate, "MMM d")} - ${format(endDate, "d, yyyy")}`
    }
    return format(eventDate, "MMMM d, yyyy")
  }

  return (
    <FadeIn>
      <div className="relative rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-zinc-900 to-cyan-500/10 p-8 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="primary">Next Event</Badge>
              <Badge
                variant="outline"
                className={cn("text-xs", eventTypeColors[event.eventType])}
              >
                <Icon className="h-3 w-3 mr-1" />
                {eventTypeLabels[event.eventType]}
              </Badge>
            </div>

            <h2 className="text-3xl font-bold text-zinc-100 mb-3">
              {event.title}
            </h2>
            {event.topic && (
              <p className="text-lg text-teal-400 font-medium mb-4">
                &quot;{event.topic}&quot;
              </p>
            )}
            <p className="text-zinc-400 mb-6">{event.description}</p>

            <div className="flex items-center gap-3">
              {event.registrationUrl && (
                <Button variant="glow" asChild>
                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Register Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              )}
              {event.eventUrl && (
                <Button variant="outline" asChild>
                  <a
                    href={event.eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn More
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-teal-500/10">
                  <Calendar className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Date</p>
                  <p className="text-lg font-medium text-zinc-100">
                    {formatDateRange()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-teal-500/10">
                  <Clock className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Time</p>
                  <p className="text-lg font-medium text-zinc-100">
                    {event.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-teal-500/10">
                  <MapPin className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Location</p>
                  <p className="text-lg font-medium text-zinc-100">
                    {event.location.venue}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {event.location.city}, {event.location.country}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [events, setEvents] = React.useState<SanityEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const now = new Date()

  // Fetch events from Sanity or fall back to mock data
  React.useEffect(() => {
    async function fetchEvents() {
      try {
        const sanityEvents = await getAllEvents()

        if (sanityEvents && sanityEvents.length > 0) {
          setEvents(sanityEvents)
        } else {
          // Fall back to mock data
          setEvents(convertMockToSanity(fallbackEvents))
        }
      } catch (error) {
        console.error("Error fetching events:", error)
        // Fall back to mock data on error
        setEvents(convertMockToSanity(fallbackEvents))
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Sort events by date
  const sortedEvents = [...events].sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
  )

  // Split into upcoming and past
  const upcomingEvents = sortedEvents.filter(
    (e) =>
      isFuture(parseISO(e.date)) ||
      format(parseISO(e.date), "yyyy-MM-dd") === format(now, "yyyy-MM-dd")
  )
  const pastEvents = sortedEvents
    .filter(
      (e) =>
        isPast(parseISO(e.date)) &&
        format(parseISO(e.date), "yyyy-MM-dd") !== format(now, "yyyy-MM-dd")
    )
    .reverse()

  // Get next featured event
  const nextFeaturedEvent =
    upcomingEvents.find((e) => e.isFeatured) || upcomingEvents[0]

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-400/20 border-t-teal-400 rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl">
              <Badge variant="primary" className="mb-6">
                <Radio className="h-3 w-3 mr-2" />
                Speaking & Events
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100 mb-6">
                Meet us at{" "}
                <span className="text-gradient">industry events</span>
              </h1>
              <p className="text-lg text-zinc-400">
                Join our team at conferences, panels, and workshops around the
                world. We regularly speak about wealth technology, enterprise
                operations, and the future of asset management.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Featured Next Event */}
      {nextFeaturedEvent && (
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <FeaturedEvent event={nextFeaturedEvent} />
          </div>
        </section>
      )}

      {/* Events Tabs */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Tabs defaultValue="upcoming" className="space-y-8">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingEvents.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past Events ({pastEvents.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upcoming" className="space-y-6">
              {upcomingEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map((event, index) => (
                    <EventCard key={event._id} event={event} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Calendar className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">
                    No upcoming events scheduled. Check back soon!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-6">
              {pastEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map((event, index) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      index={index}
                      isPastEvent
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Calendar className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No past events to show.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold text-zinc-100 mb-4">
              Want us to speak at your event?
            </h2>
            <p className="text-zinc-400 mb-8">
              We&apos;re available for keynotes, panels, and workshops on wealth
              technology, enterprise operations, and asset management
              innovation.
            </p>
            <Button variant="glow" size="lg" asChild>
              <Link href="/demo">
                Get in Touch
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </section>
    </main>
  )
}
