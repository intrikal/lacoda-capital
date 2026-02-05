import { sanityClient } from "./client"
import {
  allEventsQuery,
  upcomingEventsQuery,
  pastEventsQuery,
  featuredEventsQuery,
  eventBySlugQuery,
} from "./queries"
import type { SanityEvent } from "./types"

// Check if Sanity is configured
export function isSanityConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID)
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Fetching Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllEvents(): Promise<SanityEvent[]> {
  if (!isSanityConfigured()) {
    console.warn("Sanity not configured, using mock data")
    return []
  }

  try {
    return await sanityClient.fetch<SanityEvent[]>(allEventsQuery)
  } catch (error) {
    console.error("Error fetching events:", error)
    return []
  }
}

export async function getUpcomingEvents(): Promise<SanityEvent[]> {
  if (!isSanityConfigured()) {
    return []
  }

  try {
    return await sanityClient.fetch<SanityEvent[]>(upcomingEventsQuery)
  } catch (error) {
    console.error("Error fetching upcoming events:", error)
    return []
  }
}

export async function getPastEvents(): Promise<SanityEvent[]> {
  if (!isSanityConfigured()) {
    return []
  }

  try {
    return await sanityClient.fetch<SanityEvent[]>(pastEventsQuery)
  } catch (error) {
    console.error("Error fetching past events:", error)
    return []
  }
}

export async function getFeaturedEvents(): Promise<SanityEvent[]> {
  if (!isSanityConfigured()) {
    return []
  }

  try {
    return await sanityClient.fetch<SanityEvent[]>(featuredEventsQuery)
  } catch (error) {
    console.error("Error fetching featured events:", error)
    return []
  }
}

export async function getEventBySlug(slug: string): Promise<SanityEvent | null> {
  if (!isSanityConfigured()) {
    return null
  }

  try {
    return await sanityClient.fetch<SanityEvent>(eventBySlugQuery, { slug })
  } catch (error) {
    console.error("Error fetching event:", error)
    return null
  }
}
