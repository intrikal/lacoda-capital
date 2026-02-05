import { groq } from "next-sanity"

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
