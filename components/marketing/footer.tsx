import Link from "next/link"
import { Logo } from "./logo"

const footerNavigation = {
  product: [
    { name: "Platform", href: "/platform" },
    { name: "Security", href: "/security" },
    { name: "Pricing", href: "/pricing" },
    { name: "Demo", href: "/demo" },
  ],
  resources: [
    { name: "Learn", href: "/learn" },
    { name: "Contact", href: "/contact" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Events", href: "/events" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Security", href: "/security" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Logo />
            <p className="text-sm leading-6 text-zinc-400 max-w-xs">
              The operating system for asset management and holdings firms.
              One source of truth for your entire portfolio.
            </p>
          </div>

          {/* Navigation */}
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-zinc-100">
                  Product
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {footerNavigation.product.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-zinc-400 hover:text-zinc-300 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-zinc-100">
                  Resources
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {footerNavigation.resources.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-zinc-400 hover:text-zinc-300 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-zinc-100">
                  Company
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {footerNavigation.company.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-zinc-400 hover:text-zinc-300 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-zinc-100">
                  Legal
                </h3>
                <ul role="list" className="mt-4 space-y-3">
                  {footerNavigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-zinc-400 hover:text-zinc-300 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-zinc-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs leading-5 text-zinc-500">
            &copy; {new Date().getFullYear()} Lacoda Capital Holdings. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
