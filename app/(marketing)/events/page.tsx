import type { Metadata } from "next"
import { EventsPage } from "./_content"

export const metadata: Metadata = {
  title: "Events | Lacoda Capital Holdings",
  description:
    "Webinars, conferences, and industry events hosted by and featuring Lacoda Capital. Stay connected with the asset management community.",
  keywords: [
    "Lacoda Capital events",
    "wealth management conferences",
    "fintech events",
  ],
  alternates: {
    canonical: "https://lacodacapital.com/events",
  },
  openGraph: {
    title: "Events | Lacoda Capital Holdings",
    description:
      "Webinars, conferences, and industry events hosted by and featuring Lacoda Capital. Stay connected with the asset management community.",
    url: "https://lacodacapital.com/events",
    siteName: "Lacoda Capital",
    type: "website",
  },
}

export default function Page() {
  return <EventsPage />
}
