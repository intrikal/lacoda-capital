"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Building2,
  FileText,
  PieChart,
  DollarSign,
  TrendingUp,
  Lock,
  Mail,
  AlertTriangle,
  Briefcase,
} from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getPortalByToken, logPortalAccess, sendPortalMagicLink } from "@/lib/actions/portal.actions"
import { generateBrandingCss, getBrandingDisplay, brandingVarsToStyle } from "@/lib/branding"
import type { OrgSettings } from "@/app/db/schema/orgs"
import type { PortalVisibility } from "@/app/db/schema/stakeholder_portals"

type PortalData = Awaited<ReturnType<typeof getPortalByToken>>

export default function StakeholderPortalPage() {
  const { token } = useParams<{ token: string }>()
  const [portal, setPortal] = React.useState<PortalData>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [authed, setAuthed] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [emailSent, setEmailSent] = React.useState(false)
  const [sendingEmail, setSendingEmail] = React.useState(false)
  const ASSETS_PER_PAGE = 20

  const pageSpring = useSpring({
    from: { opacity: 0, y: 16 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  })

  React.useEffect(() => {
    async function load() {
      const data = await getPortalByToken(token)
      if (!data) {
        setError("This portal link is invalid or has expired.")
        setLoading(false)
        return
      }
      setPortal(data)
      setLoading(false)
    }
    load()
  }, [token])

  const handleMagicLink = async () => {
    if (!email.trim()) return
    setSendingEmail(true)
    const result = await sendPortalMagicLink({ email, portalToken: token })
    if ("error" in result) {
      setError(result.error)
      setSendingEmail(false)
      return
    }
    setEmailSent(true)
    setSendingEmail(false)
  }

  const handleEnterPortal = async () => {
    // In a production flow, user arrives here via magic link callback.
    // For demo purposes, allow direct entry after email verification.
    if (portal) {
      await logPortalAccess({
        portalId: portal.id,
        orgId: portal.orgId,
        email: email || "anonymous",
      })
    }
    setAuthed(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500">Loading portal...</div>
      </div>
    )
  }

  if (error && !portal) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Portal Unavailable</h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!portal) return null

  const orgSettings = portal.org?.settings as OrgSettings | undefined
  const brandingVars = generateBrandingCss(orgSettings)
  const branding = getBrandingDisplay(orgSettings, portal.org?.name)
  const visibility = portal.visibility as PortalVisibility

  // Magic link auth gate
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" style={brandingVarsToStyle(brandingVars)}>
        <animated.div style={pageSpring} className="max-w-md w-full mx-4">
          <div className="border border-zinc-700 rounded-xl bg-zinc-900 p-8">
            {/* Branding header */}
            <div className="text-center mb-8">
              {branding.logoUrl ? (
                <Image
                  src={branding.logoUrl}
                  alt={branding.displayName}
                  width={240}
                  height={48}
                  className="h-12 mx-auto mb-4 object-contain"
                  unoptimized
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              ) : (
                <Building2 className="h-10 w-10 mx-auto mb-4" style={{ color: branding.primaryColor }} />
              )}
              <h1 className="text-xl font-bold text-white">{branding.displayName}</h1>
              <p className="text-zinc-400 text-sm mt-1">Stakeholder Portal</p>
            </div>

            <h2 className="text-lg font-semibold text-white mb-2">
              {portal.name}
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Enter your email to receive a secure access link.
            </p>

            {emailSent ? (
              <div className="text-center py-4">
                <Mail className="h-10 w-10 text-teal-400 mx-auto mb-3" />
                <p className="text-white font-medium">Check your email</p>
                <p className="text-zinc-400 text-sm mt-1">
                  We sent a magic link to <strong className="text-white">{email}</strong>.
                  Click it to access the portal.
                </p>
                <Button
                  onClick={handleEnterPortal}
                  className="mt-6 w-full"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  Continue to Portal (Demo)
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-zinc-950 border-zinc-700 text-white"
                  onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button
                  onClick={handleMagicLink}
                  disabled={sendingEmail || !email.trim()}
                  className="w-full text-white"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {sendingEmail ? "Sending..." : "Send Magic Link"}
                </Button>
              </div>
            )}

            <p className="text-xs text-zinc-600 text-center mt-6">
              <Lock className="h-3 w-3 inline mr-1" />
              Secure, read-only access. No password required.
            </p>
          </div>
        </animated.div>
      </div>
    )
  }

  // ─── Authenticated portal view ─────────────────────────────────────────────
  const clientName = portal.client?.displayName ?? "Client"
  const truncatedName = clientName.length > 40 ? clientName.slice(0, 40) + "…" : clientName

  return (
    <div className="min-h-screen bg-zinc-950" style={brandingVarsToStyle(brandingVars)}>
      {/* Portal Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt={branding.displayName}
                width={160}
                height={32}
                className="h-8 object-contain"
                unoptimized
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            ) : (
              <Building2 className="h-6 w-6" style={{ color: branding.primaryColor }} />
            )}
            <div>
              <h1 className="text-white font-semibold">{branding.displayName}</h1>
              <p className="text-xs text-zinc-500">Stakeholder Portal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-300" title={clientName}>{truncatedName}</p>
            <p className="text-xs text-zinc-500">{portal.name}</p>
          </div>
        </div>
      </header>

      {/* Portal Content */}
      <animated.main style={pageSpring} className="max-w-6xl mx-auto px-6 py-8">
        {/* Visibility sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibility.assets && (
            <section className="border border-zinc-800 rounded-lg bg-zinc-900/50">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <DollarSign className="h-4 w-4" style={{ color: branding.primaryColor }} />
                <h2 className="font-medium text-white">Assets</h2>
              </div>
              <div className="p-4">
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Asset data will appear here when connected to live data.
                  <br />
                  <span className="text-xs text-zinc-600">Paginated view — {ASSETS_PER_PAGE} per page</span>
                </div>
              </div>
            </section>
          )}

          {visibility.entities && (
            <section className="border border-zinc-800 rounded-lg bg-zinc-900/50">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <Briefcase className="h-4 w-4" style={{ color: branding.primaryColor }} />
                <h2 className="font-medium text-white">Entities</h2>
              </div>
              <div className="p-4">
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Legal entities will appear here.
                </div>
              </div>
            </section>
          )}

          {visibility.documents && (
            <section className="border border-zinc-800 rounded-lg bg-zinc-900/50">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <FileText className="h-4 w-4" style={{ color: branding.primaryColor }} />
                <h2 className="font-medium text-white">Documents</h2>
              </div>
              <div className="p-4">
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Shared documents will appear here.
                </div>
              </div>
            </section>
          )}

          {visibility.reports && (
            <section className="border border-zinc-800 rounded-lg bg-zinc-900/50">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <PieChart className="h-4 w-4" style={{ color: branding.primaryColor }} />
                <h2 className="font-medium text-white">Reports</h2>
              </div>
              <div className="p-4">
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Published reports will appear here.
                </div>
              </div>
            </section>
          )}

          {visibility.valuations && (
            <section className="border border-zinc-800 rounded-lg bg-zinc-900/50">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: branding.primaryColor }} />
                <h2 className="font-medium text-white">Valuations</h2>
              </div>
              <div className="p-4">
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Valuation history will appear here.
                </div>
              </div>
            </section>
          )}
        </div>

        {/* No edit/create buttons visible — read-only */}
        <div className="mt-8 text-center text-xs text-zinc-600">
          <Lock className="h-3 w-3 inline mr-1" />
          Read-only access. Contact your advisor to make changes.
        </div>
      </animated.main>
    </div>
  )
}
