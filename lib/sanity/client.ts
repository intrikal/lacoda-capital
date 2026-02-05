import { createClient, type SanityClient } from "@sanity/client"
import imageUrlBuilder from "@sanity/image-url"

// Sanity configuration
// Set these in your .env.local file:
// NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
// NEXT_PUBLIC_SANITY_DATASET=production
// SANITY_API_TOKEN=your-token (for write operations)

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID

export const sanityConfig = {
  projectId: projectId || "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: process.env.NODE_ENV === "production",
}

// Flag to check if Sanity is properly configured
export const isSanityConfigured = Boolean(projectId)

// Create the Sanity client (only functional when configured)
export const sanityClient: SanityClient = createClient(sanityConfig)

// Create a preview client with auth token for draft content
export const previewClient: SanityClient = createClient({
  ...sanityConfig,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// Helper to get the right client based on preview mode
export const getClient = (preview = false) =>
  preview ? previewClient : sanityClient

// Image URL builder
const builder = imageUrlBuilder(sanityClient)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: any) {
  return builder.image(source)
}
