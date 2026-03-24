import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PostHogProvider } from "@/lib/analytics/posthog-provider"
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        <PostHogProvider>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
