// ─────────────────────────────────────────────────────────────────────────────
// Sanity Types
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling Types
// ─────────────────────────────────────────────────────────────────────────────

export type SlotStatus = "available" | "pending" | "booked"
export type BookingStatus = "pending" | "approved" | "denied"

export interface SanitySlot {
  _id: string
  dateTime: string // ISO 8601
  duration: number // minutes
  label?: string
  status: SlotStatus
}

export interface SanityBookingRequest {
  _id: string
  name: string
  email: string
  company?: string
  reason: string
  status: BookingStatus
  submittedAt: string
  slot: SanitySlot
}



export interface SanityImage {
  asset: {
    _id: string
    url: string
  }
  alt?: string
}

export interface SanitySlug {
  _type: "slug"
  current: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export type EventType = "speaking" | "panel" | "workshop" | "conference" | "webinar"
export type EventRole = "speaker" | "panelist" | "host" | "attendee"

export interface SanityEvent {
  _id: string
  title: string
  slug: SanitySlug
  description: string
  date: string // ISO date string
  endDate?: string
  time: string
  location: {
    venue: string
    city: string
    country: string
    isVirtual?: boolean
  }
  eventType: EventType
  role: EventRole
  topic?: string
  registrationUrl?: string
  eventUrl?: string
  image?: SanityImage
  tags: string[]
  isFeatured?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Maps
// ─────────────────────────────────────────────────────────────────────────────

export const eventTypeLabels: Record<EventType, string> = {
  speaking: "Speaking Engagement",
  panel: "Panel Discussion",
  workshop: "Workshop",
  conference: "Conference",
  webinar: "Webinar",
}

export const eventTypeColors: Record<EventType, string> = {
  speaking: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  panel: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  workshop: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  conference: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  webinar: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}
