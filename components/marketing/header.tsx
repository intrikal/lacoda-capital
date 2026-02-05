"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { useSpring, animated, config } from "@react-spring/web"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Logo } from "./logo"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

const navigation = [
  { name: "Platform", href: "/platform" },
  { name: "Security", href: "/security" },
  { name: "Pricing", href: "/pricing" },
  { name: "Events", href: "/events" },
  { name: "About", href: "/about" },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const prefersReducedMotion = useReducedMotion()

  const mobileMenuSpring = useSpring({
    opacity: mobileMenuOpen ? 1 : 0,
    transform: mobileMenuOpen ? "translateY(0%)" : "translateY(-100%)",
    config: config.stiff,
    immediate: prefersReducedMotion,
  })

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-zinc-950 border-b border-zinc-800/50">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex lg:flex-1">
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:gap-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-teal-400"
                    : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
            <Button variant="ghost" asChild>
              <Link href="/app">Sign in</Link>
            </Button>
            <Button variant="glow" asChild>
              <Link href="/demo">Get a Demo</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2.5 text-zinc-400 hover:text-zinc-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      <animated.div
        style={{
          ...mobileMenuSpring,
          pointerEvents: mobileMenuOpen ? "auto" : "none",
          visibility: mobileMenuOpen ? "visible" : "hidden",
        }}
        className="lg:hidden fixed inset-x-0 top-[73px] bottom-0 z-50 glass border-b border-zinc-800/50"
      >
        <div className="px-6 py-6 space-y-6">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-base font-medium transition-colors",
                  pathname === item.href
                    ? "bg-zinc-800 text-teal-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/app" onClick={() => setMobileMenuOpen(false)}>
                Sign in
              </Link>
            </Button>
            <Button variant="glow" className="w-full" asChild>
              <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
                Get a Demo
              </Link>
            </Button>
          </div>
        </div>
      </animated.div>
    </header>
  )
}
