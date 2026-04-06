import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PostHogProvider } from "@/lib/analytics/posthog-provider"
import { GoogleTagManager, GoogleTagManagerNoscript } from "@/lib/analytics/gtm"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://lacodacapital.com"),
  title: "Lacoda Capital Holdings | Asset Management OS",
  description:
    "The operating system for asset management and holdings firms. One unified platform for portfolio tracking, document management, compliance, and reporting.",
  keywords: [
    "asset management",
    "portfolio management",
    "holdings",
    "wealth management",
    "enterprise",
    "compliance",
    "document vault",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
openGraph: {
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Lacoda Capital Holdings",
  url: "https://lacodacapital.com",
  logo: "https://lacodacapital.com/opengraph-image",
  sameAs: [],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <GoogleTagManager />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        <GoogleTagManagerNoscript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <PostHogProvider>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
