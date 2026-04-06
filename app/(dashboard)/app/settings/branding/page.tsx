"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Palette,
  Eye,
  Check,
  AlertTriangle,
  Globe,
  Image as ImageIcon,
  Type,
  Paintbrush,
  Building2,
  FileText,
} from "lucide-react"
import NextImage from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getOrgBranding, updateOrgBranding } from "@/lib/actions/branding.actions"
import { generateBrandingCss, getBrandingDisplay, brandingVarsToStyle } from "@/lib/branding"
import type { OrgSettings } from "@/app/db/schema/orgs"

export default function BrandingSettingsPage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")
  const [saved, setSaved] = React.useState(false)
  const [orgName, setOrgName] = React.useState("")

  // Form state
  const [logoUrl, setLogoUrl] = React.useState("")
  const [primaryColor, setPrimaryColor] = React.useState("#0FBFBF")
  const [accentColor, setAccentColor] = React.useState("#06b6d4")
  const [customDomain, setCustomDomain] = React.useState("")
  const [displayName, setDisplayName] = React.useState("")

  const pageSpring = useSpring({
    from: { opacity: 0, y: 12 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  })

  React.useEffect(() => {
    async function load() {
      const result = await getOrgBranding()
      if ("error" in result) {
        setError(result.error as string)
        setLoading(false)
        return
      }
      setOrgName(result.orgName)
      const b = result.branding
      if (b.logoUrl) setLogoUrl(b.logoUrl)
      if (b.primaryColor) setPrimaryColor(b.primaryColor)
      if (b.accentColor) setAccentColor(b.accentColor)
      if (b.customDomain) setCustomDomain(b.customDomain)
      if (b.orgDisplayName) setDisplayName(b.orgDisplayName)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSaved(false)

    const result = await updateOrgBranding({
      logoUrl: logoUrl || null,
      primaryColor,
      accentColor,
      customDomain: customDomain || undefined,
      orgDisplayName: displayName || undefined,
    })

    if ("error" in result) {
      setError(result.error)
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  // Preview branding
  const previewSettings: OrgSettings = {
    branding: {
      logoUrl: logoUrl || undefined,
      primaryColor,
      accentColor,
      orgDisplayName: displayName || undefined,
      customDomain: customDomain || undefined,
    },
  }
  const brandingVars = generateBrandingCss(previewSettings)
  const branding = getBrandingDisplay(previewSettings, orgName)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center text-zinc-500 py-12">Loading branding settings...</div>
      </div>
    )
  }

  return (
    <animated.div style={pageSpring} className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Palette className="h-6 w-6 text-teal-400" />
            Branding
          </h1>
          <p className="text-zinc-400 mt-1">
            Customize your organization&apos;s appearance across portals and reports.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-500 text-white"
        >
          {saving ? "Saving..." : saved ? (
            <><Check className="h-4 w-4 mr-2" />Saved</>
          ) : "Save Changes"}
        </Button>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-[1fr_340px] gap-8">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-4 w-4 text-teal-400" />
              <h3 className="font-medium text-white">Logo</h3>
            </div>
            <div>
              <Label className="text-zinc-300">Logo URL</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://your-cdn.com/logo.png"
                className="mt-1 bg-zinc-950 border-zinc-700 text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Recommended: SVG or PNG with transparent background, max height 48px.
                Leave empty for a text-only header.
              </p>
              {logoUrl && (
                <div className="mt-3 bg-zinc-950 border border-zinc-800 rounded-md p-4 flex items-center justify-center">
                  <NextImage
                    src={logoUrl}
                    alt="Logo preview"
                    width={200}
                    height={40}
                    className="h-10 object-contain"
                    unoptimized
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Colors */}
          <div className="border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Paintbrush className="h-4 w-4 text-teal-400" />
              <h3 className="font-medium text-white">Colors</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Primary Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-10 rounded border border-zinc-700 bg-zinc-950 cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-white font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-300">Accent Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-10 rounded border border-zinc-700 bg-zinc-950 cursor-pointer"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-white font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Type className="h-4 w-4 text-teal-400" />
              <h3 className="font-medium text-white">Display Name</h3>
            </div>
            <div>
              <Label className="text-zinc-300">Portal Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={orgName}
                className="mt-1 bg-zinc-950 border-zinc-700 text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Override the organization name shown in portal headers and reports.
                Leave empty to use &ldquo;{orgName}&rdquo;.
              </p>
            </div>
          </div>

          {/* Custom Domain */}
          <div className="border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-teal-400" />
              <h3 className="font-medium text-white">Custom Domain</h3>
            </div>
            <div>
              <Label className="text-zinc-300">Portal Domain (Optional)</Label>
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="portal.yourdomain.com"
                className="mt-1 bg-zinc-950 border-zinc-700 text-white"
              />
              <div className="mt-3 bg-zinc-950 border border-zinc-800 rounded-md p-3">
                <p className="text-xs text-zinc-400 font-medium mb-2">CNAME Setup Instructions</p>
                <p className="text-xs text-zinc-500">
                  1. Go to your DNS provider (Cloudflare, Route 53, etc.)
                </p>
                <p className="text-xs text-zinc-500">
                  2. Add a CNAME record:
                </p>
                <div className="bg-zinc-900 rounded p-2 mt-1 mb-1">
                  <code className="text-xs text-teal-400">
                    {customDomain || "portal.yourdomain.com"} → cname.lacoda.capital
                  </code>
                </div>
                <p className="text-xs text-zinc-500">
                  3. SSL certificate will be provisioned automatically within 24 hours.
                </p>
                {!customDomain && (
                  <p className="text-xs text-amber-400 mt-2">
                    No custom domain configured — portals work on the default URL.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-4 sticky top-8 self-start">
          <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
            <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
              <Eye className="h-4 w-4 text-teal-400" />
              <span className="font-medium text-white text-sm">Portal Preview</span>
            </div>
            <div
              className="bg-zinc-950 p-4"
              style={brandingVarsToStyle(brandingVars)}
            >
              {/* Mini portal preview */}
              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `2px solid ${primaryColor}` }}>
                  {logoUrl ? (
                    <NextImage
                      src={logoUrl}
                      alt="Preview"
                      width={120}
                      height={24}
                      className="h-6 object-contain"
                      unoptimized
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  ) : (
                    <Building2 className="h-5 w-5" style={{ color: primaryColor }} />
                  )}
                  <span className="text-sm font-medium text-white truncate">
                    {branding.displayName}
                  </span>
                </div>

                {/* Content preview */}
                <div className="p-3 space-y-2">
                  <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: primaryColor, opacity: 0.3 }} />
                  <div className="h-3 bg-zinc-800 rounded-full w-1/2" />
                  <div className="h-3 bg-zinc-800 rounded-full w-2/3" />

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-md p-2 border border-zinc-800">
                      <div className="h-2 rounded-full w-full mb-1" style={{ backgroundColor: primaryColor, opacity: 0.2 }} />
                      <div className="h-2 bg-zinc-800 rounded-full w-3/4" />
                    </div>
                    <div className="rounded-md p-2 border border-zinc-800">
                      <div className="h-2 rounded-full w-full mb-1" style={{ backgroundColor: accentColor, opacity: 0.2 }} />
                      <div className="h-2 bg-zinc-800 rounded-full w-2/3" />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-zinc-800 text-center">
                  <div className="h-2 bg-zinc-800 rounded-full w-1/3 mx-auto" />
                </div>
              </div>
            </div>
          </div>

          {/* PDF preview card */}
          <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
            <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-400" />
              <span className="font-medium text-white text-sm">PDF Reports</span>
            </div>
            <div className="p-4 text-sm text-zinc-400">
              <p>Generated PDF reports will inherit your branding:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                  Logo in header
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                  Primary color accents
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                  Organization name in footer
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </animated.div>
  )
}
