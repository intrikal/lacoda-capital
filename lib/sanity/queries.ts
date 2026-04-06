import { groq } from "next-sanity"

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling Queries
// ─────────────────────────────────────────────────────────────────────────────

// All slots that are currently open for booking
export const availableSlotsQuery = groq`
  *[_type == "availabilitySlot" && status == "available" && dateTime > now()]
  | order(dateTime asc) {
    _id,
    dateTime,
    duration,
    label,
    status
  }
`

// Single slot by ID (used in webhook handler to get slot details)
export const slotByIdQuery = groq`
  *[_type == "availabilitySlot" && _id == $id][0] {
    _id,
    dateTime,
    duration,
    label,
    status
  }
`

// Single booking request by ID (used in webhook handler)
export const bookingRequestByIdQuery = groq`
  *[_type == "bookingRequest" && _id == $id][0] {
    _id,
    name,
    email,
    company,
    reason,
    status,
    submittedAt,
    slot-> {
      _id,
      dateTime,
      duration,
      label
    }
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// Event Queries
// ─────────────────────────────────────────────────────────────────────────────

// Get all events
export const allEventsQuery = groq`
  *[_type == "event"] | order(date asc) {
    _id,
    title,
    slug,
    description,
    date,
    endDate,
    time,
    location {
      venue,
      city,
      country,
      isVirtual
    },
    eventType,
    role,
    topic,
    registrationUrl,
    eventUrl,
    image {
      asset->{
        _id,
        url
      },
      alt
    },
    tags,
    isFeatured
  }
`

// Get upcoming events
export const upcomingEventsQuery = groq`
  *[_type == "event" && date >= now()] | order(date asc) {
    _id,
    title,
    slug,
    description,
    date,
    endDate,
    time,
    location {
      venue,
      city,
      country,
      isVirtual
    },
    eventType,
    role,
    topic,
    registrationUrl,
    eventUrl,
    image {
      asset->{
        _id,
        url
      },
      alt
    },
    tags,
    isFeatured
  }
`

// Get past events
export const pastEventsQuery = groq`
  *[_type == "event" && date < now()] | order(date desc) {
    _id,
    title,
    slug,
    description,
    date,
    endDate,
    time,
    location {
      venue,
      city,
      country,
      isVirtual
    },
    eventType,
    role,
    topic,
    registrationUrl,
    eventUrl,
    image {
      asset->{
        _id,
        url
      },
      alt
    },
    tags,
    isFeatured
  }
`

// Get featured events
export const featuredEventsQuery = groq`
  *[_type == "event" && isFeatured == true && date >= now()] | order(date asc)[0...3] {
    _id,
    title,
    slug,
    description,
    date,
    endDate,
    time,
    location {
      venue,
      city,
      country,
      isVirtual
    },
    eventType,
    role,
    topic,
    registrationUrl,
    eventUrl,
    image {
      asset->{
        _id,
        url
      },
      alt
    },
    tags,
    isFeatured
  }
`

// Get single event by slug
export const eventBySlugQuery = groq`
  *[_type == "event" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    date,
    endDate,
    time,
    location {
      venue,
      city,
      country,
      isVirtual
    },
    eventType,
    role,
    topic,
    registrationUrl,
    eventUrl,
    image {
      asset->{
        _id,
        url
      },
      alt
    },
    tags,
    isFeatured
  }
`
