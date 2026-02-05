// Seed events data - will be replaced with Sanity CMS
export interface Event {
  id: string
  title: string
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
  type: "speaking" | "panel" | "workshop" | "conference" | "webinar"
  role: "speaker" | "panelist" | "host" | "attendee"
  topic?: string
  registrationUrl?: string
  eventUrl?: string
  image?: string
  tags: string[]
  isFeatured?: boolean
}

export const mockEvents: Event[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Upcoming Events (2026)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "fo-summit-2026",
    title: "Enterprise Investment Summit 2026",
    description:
      "The premier gathering for institutional investors and wealth managers. Speaking on how unified platforms are transforming enterprise wealth management and reducing operational complexity.",
    date: "2026-03-15",
    endDate: "2026-03-17",
    time: "9:00 AM EST",
    location: {
      venue: "The Ritz-Carlton",
      city: "New York",
      country: "USA",
    },
    type: "speaking",
    role: "speaker",
    topic: "The Future of Unified Asset Management",
    registrationUrl: "#",
    eventUrl: "#",
    tags: ["Enterprise", "Wealth Management", "Technology"],
    isFeatured: true,
  },
  {
    id: "fintech-sf-2026",
    title: "FinTech Innovation Conference",
    description:
      "Joining industry leaders to discuss the intersection of security, compliance, and user experience in modern wealth platforms. Panel focuses on building trust through technology.",
    date: "2026-04-22",
    time: "2:00 PM PST",
    location: {
      venue: "Moscone Center",
      city: "San Francisco",
      country: "USA",
    },
    type: "panel",
    role: "panelist",
    topic: "Security & Compliance in Modern Wealth Platforms",
    registrationUrl: "#",
    tags: ["FinTech", "Security", "Compliance"],
    isFeatured: true,
  },
  {
    id: "pwm-forum-london",
    title: "Private Wealth Management Forum",
    description:
      "Exclusive forum for high-net-worth advisors and institutional executives. Hosting a workshop on portfolio consolidation strategies and the technology enabling better oversight.",
    date: "2026-05-10",
    time: "10:00 AM GMT",
    location: {
      venue: "The Savoy",
      city: "London",
      country: "UK",
    },
    type: "workshop",
    role: "host",
    topic: "Portfolio Consolidation Strategies for UHNW Clients",
    eventUrl: "#",
    tags: ["Private Wealth", "UHNW", "Strategy"],
  },
  {
    id: "digital-assets-webinar",
    title: "Digital Assets & Estate Planning",
    description:
      "Virtual session exploring how digital assets are changing estate planning for wealthy families. Covering custody solutions, inheritance workflows, and regulatory considerations.",
    date: "2026-05-28",
    time: "1:00 PM EST",
    location: {
      venue: "Virtual Event",
      city: "Online",
      country: "Global",
      isVirtual: true,
    },
    type: "webinar",
    role: "speaker",
    topic: "Digital Assets in Modern Estate Planning",
    registrationUrl: "#",
    tags: ["Digital Assets", "Estate Planning", "Webinar"],
  },
  {
    id: "gfo-singapore-2026",
    title: "Global Investment Conference",
    description:
      "Annual conference bringing together institutional investors from around the world. Keynote presentation on building a unified operating system for enterprise wealth management across organizations and geographies.",
    date: "2026-06-18",
    endDate: "2026-06-20",
    time: "8:30 AM SGT",
    location: {
      venue: "Marina Bay Sands",
      city: "Singapore",
      country: "Singapore",
    },
    type: "conference",
    role: "speaker",
    topic: "Building a Unified Operating System for Family Wealth",
    registrationUrl: "#",
    eventUrl: "#",
    tags: ["Global", "Enterprise", "Investment"],
    isFeatured: true,
  },
  {
    id: "wealthtech-summit-nyc",
    title: "WealthTech Summit",
    description:
      "Exploring the next generation of wealth technology with industry pioneers. Panel discussion on how AI and automation are reshaping portfolio management and client reporting.",
    date: "2026-07-12",
    time: "9:00 AM EST",
    location: {
      venue: "Javits Center",
      city: "New York",
      country: "USA",
    },
    type: "panel",
    role: "panelist",
    topic: "The Next Generation of Wealth Technology",
    tags: ["WealthTech", "Innovation", "AI"],
  },
  {
    id: "mfo-masterclass",
    title: "Enterprise Asset Management Masterclass",
    description:
      "Intensive workshop for MFO operators on scaling operations while maintaining service quality. Covering technology stack decisions, client onboarding, and reporting automation.",
    date: "2026-08-05",
    time: "9:00 AM EST",
    location: {
      venue: "Harvard Club",
      city: "Boston",
      country: "USA",
    },
    type: "workshop",
    role: "host",
    topic: "Scaling Enterprise Asset Operations",
    registrationUrl: "#",
    tags: ["MFO", "Operations", "Scaling"],
  },
  {
    id: "private-markets-forum",
    title: "Private Markets Investment Forum",
    description:
      "Forum focused on private equity, venture, and real assets. Speaking on how technology enables better tracking and reporting for illiquid investments.",
    date: "2026-09-22",
    time: "10:00 AM EST",
    location: {
      venue: "Four Seasons",
      city: "Miami",
      country: "USA",
    },
    type: "speaking",
    role: "speaker",
    topic: "Technology-Enabled Private Market Portfolio Management",
    eventUrl: "#",
    tags: ["Private Equity", "Alternatives", "Technology"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Past Events (2025)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "alt-invest-2025",
    title: "Alternative Investments Forum 2025",
    description:
      "Discussed the role of alternative assets in modern portfolios and how technology enables better tracking, reporting, and due diligence for complex investments.",
    date: "2025-11-08",
    time: "11:00 AM EST",
    location: {
      venue: "Four Seasons",
      city: "Miami",
      country: "USA",
    },
    type: "speaking",
    role: "speaker",
    topic: "Technology-Enabled Alternative Asset Management",
    tags: ["Alternatives", "Technology", "Reporting"],
  },
  {
    id: "pb-innovation-2025",
    title: "Private Banking Innovation Summit",
    description:
      "Keynote presentation on modernizing client reporting and communication in private banking. Focused on reducing operational friction while improving client experience.",
    date: "2025-09-22",
    time: "10:00 AM CET",
    location: {
      venue: "Grand Hotel Kempinski",
      city: "Geneva",
      country: "Switzerland",
    },
    type: "speaking",
    role: "speaker",
    topic: "Modernizing Client Communication in Private Banking",
    tags: ["Private Banking", "Innovation", "Client Experience"],
  },
  {
    id: "fo-tech-2025",
    title: "Enterprise Technology Conference",
    description:
      "Panel discussion on selecting and implementing technology solutions for enterprises. Covered build vs. buy decisions, integration challenges, and change management.",
    date: "2025-06-15",
    time: "2:00 PM EST",
    location: {
      venue: "The Pierre",
      city: "New York",
      country: "USA",
    },
    type: "panel",
    role: "panelist",
    topic: "Selecting the Right Technology Stack for Your Enterprise",
    tags: ["Enterprise", "Technology", "Implementation"],
  },
  {
    id: "wealth-transfer-webinar-2025",
    title: "Wealth Transfer in the Digital Age",
    description:
      "Webinar exploring how digital tools are transforming intergenerational wealth transfer. Covered document management, stakeholder coordination, and succession planning.",
    date: "2025-04-10",
    time: "12:00 PM EST",
    location: {
      venue: "Virtual Event",
      city: "Online",
      country: "Global",
      isVirtual: true,
    },
    type: "webinar",
    role: "speaker",
    topic: "Digital Tools for Intergenerational Wealth Transfer",
    tags: ["Wealth Transfer", "Digital", "Succession Planning"],
  },
  {
    id: "uhnw-retreat-2025",
    title: "UHNW Advisor Retreat",
    description:
      "Intimate gathering of advisors serving ultra-high-net-worth clients. Workshop on building comprehensive client views across complex asset structures.",
    date: "2025-02-20",
    endDate: "2025-02-21",
    time: "9:00 AM MST",
    location: {
      venue: "The Little Nell",
      city: "Aspen",
      country: "USA",
    },
    type: "workshop",
    role: "host",
    topic: "Building Comprehensive Views for Complex Client Portfolios",
    tags: ["UHNW", "Advisors", "Portfolio Management"],
  },
]

export const eventTypeLabels: Record<Event["type"], string> = {
  speaking: "Speaking Engagement",
  panel: "Panel Discussion",
  workshop: "Workshop",
  conference: "Conference",
  webinar: "Webinar",
}

export const eventTypeColors: Record<Event["type"], string> = {
  speaking: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  panel: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  workshop: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  conference: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  webinar: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}
