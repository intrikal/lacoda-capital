"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Users,
  Plus,
  Copy,
  Trash2,
  Settings,
  ExternalLink,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Link2,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getPortals,
  createPortal,
  updatePortal,
  deletePortal,
} from "@/lib/actions/portal.actions"
import type { StakeholderPortal, PortalVisibility } from "@/app/db/schema/stakeholder_portals"

export default function StakeholdersPage() {
  const [portals, setPortals] = React.useState<(StakeholderPortal & { client?: { displayName: string } })[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreate, setShowCreate] = React.useState(false)
  const [error, setError] = React.useState("")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState<string | null>(null)

  // Create form
  const [formName, setFormName] = React.useState("")
  const [formClientId, setFormClientId] = React.useState("")
  const [formVisibility, setFormVisibility] = React.useState<PortalVisibility>({
    assets: true, documents: false, reports: false, entities: true, valuations: true,
  })
  const [creating, setCreating] = React.useState(false)
  const [createdUrl, setCreatedUrl] = React.useState<string | null>(null)

  const pageSpring = useSpring({
    from: { opacity: 0, y: 12 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  })

  const loadPortals = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPortals()
      setPortals(data as typeof portals)
    } catch {
      setError("Failed to load portals")
    }
    setLoading(false)
  }, [])

  React.useEffect(() => { loadPortals() }, [loadPortals])

  const handleCreate = async () => {
    if (!formName.trim() || !formClientId.trim()) return
    setCreating(true)
    setError("")

    const result = await createPortal({
      clientId: formClientId,
      name: formName,
      visibility: formVisibility,
    })

    if ("error" in result) {
      setError(result.error)
      setCreating(false)
      return
    }

    const url = `${window.location.origin}/portal/${result.token}`
    setCreatedUrl(url)
    setCreating(false)
    loadPortals()
  }

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    const result = await updatePortal(id, { enabled: !enabled })
    if ("error" in result) setError(result.error)
    else loadPortals()
  }

  const handleDelete = async (id: string) => {
    const result = await deletePortal(id)
    if ("error" in result) setError(result.error)
    else loadPortals()
  }

  const handleToggleVisibility = async (id: string, currentVis: PortalVisibility, field: keyof PortalVisibility) => {
    const updated = { ...currentVis, [field]: !currentVis[field] }
    const result = await updatePortal(id, { visibility: updated })
    if ("error" in result) setError(result.error)
    else loadPortals()
  }

  const VISIBILITY_FIELDS: { key: keyof PortalVisibility; label: string }[] = [
    { key: "assets", label: "Assets" },
    { key: "entities", label: "Entities" },
    { key: "documents", label: "Documents" },
    { key: "reports", label: "Reports" },
    { key: "valuations", label: "Valuations" },
  ]

  return (
    <animated.div style={pageSpring} className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="h-6 w-6 text-teal-400" />
            Stakeholder Portals
          </h1>
          <p className="text-zinc-400 mt-1">
            Create branded read-only portals for external stakeholders — advisors, attorneys, family members.
          </p>
        </div>
        <Button
          onClick={() => { setShowCreate(true); setCreatedUrl(null); setError("") }}
          className="bg-teal-600 hover:bg-teal-500 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Portal
        </Button>
      </div>

      {/* Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Globe className="h-5 w-5 text-teal-400 mt-0.5 shrink-0" />
        <div className="text-sm text-zinc-400">
          <p>
            Each portal generates a unique URL with magic-link authentication.
            Configure exactly what data is visible. All external access is logged in the audit trail.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
          {createdUrl ? (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                Portal Created
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Share this URL with the stakeholder. They&apos;ll authenticate via magic link.
              </p>
              <div className="bg-zinc-950 border border-zinc-700 rounded-md p-3 text-sm text-teal-300 flex items-center justify-between gap-2">
                <span className="truncate font-mono">{createdUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(createdUrl, "new")}
                  className="shrink-0"
                >
                  {copied === "new" ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-zinc-400" />}
                </Button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" onClick={() => { setShowCreate(false); setCreatedUrl(null) }}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Create Stakeholder Portal</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300">Portal Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Smith Family Advisory Portal"
                    className="mt-1 bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Client ID</Label>
                  <Input
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    placeholder="Paste the client UUID"
                    className="mt-1 bg-zinc-950 border-zinc-700 text-white font-mono"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Find the client ID in the Clients page.</p>
                </div>

                {/* Visibility toggles */}
                <div>
                  <Label className="text-zinc-300">Visible Sections</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {VISIBILITY_FIELDS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setFormVisibility((v) => ({ ...v, [key]: !v[key] }))}
                        className={`border rounded-lg p-2 text-center text-xs transition-colors ${
                          formVisibility[key]
                            ? "border-teal-500 bg-teal-950/50 text-teal-300"
                            : "border-zinc-700 bg-zinc-800/50 text-zinc-500"
                        }`}
                      >
                        {formVisibility[key] ? <Eye className="h-3 w-3 mx-auto mb-1" /> : <EyeOff className="h-3 w-3 mx-auto mb-1" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !formName.trim() || !formClientId.trim()}
                    className="bg-teal-600 hover:bg-teal-500 text-white"
                  >
                    {creating ? "Creating..." : "Create Portal"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Portals list */}
      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading portals...</div>
      ) : portals.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-lg">
          <Users className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No stakeholder portals yet.</p>
          <p className="text-zinc-500 text-sm mt-1">Create a portal to share read-only data with external stakeholders.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {portals.map((portal) => {
            const vis = portal.visibility as PortalVisibility
            const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${portal.token}`
            return (
              <div key={portal.id} className="border border-zinc-700 bg-zinc-900/50 rounded-lg overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${portal.enabled ? "bg-green-400" : "bg-zinc-600"}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{portal.name}</span>
                        {!portal.enabled && (
                          <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">Disabled</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        {portal.client?.displayName ?? "Unknown client"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(portalUrl, portal.id)}
                      className="text-zinc-400"
                    >
                      {copied === portal.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(portalUrl, "_blank")}
                      className="text-zinc-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === portal.id ? null : portal.id)}
                    >
                      {expandedId === portal.id ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    </Button>
                  </div>
                </div>

                {expandedId === portal.id && (
                  <div className="border-t border-zinc-800 p-4 space-y-4">
                    {/* Visibility toggles */}
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">Visible Sections</h4>
                      <div className="flex gap-2 flex-wrap">
                        {VISIBILITY_FIELDS.map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => handleToggleVisibility(portal.id, vis, key)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              vis[key]
                                ? "border-teal-500/50 bg-teal-950/50 text-teal-300"
                                : "border-zinc-700 text-zinc-500"
                            }`}
                          >
                            {vis[key] ? <Eye className="h-3 w-3 inline mr-1" /> : <EyeOff className="h-3 w-3 inline mr-1" />}
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* URL */}
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">Portal URL</h4>
                      <div className="bg-zinc-950 rounded-md p-2 text-xs font-mono text-zinc-400 truncate">
                        {portalUrl}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleEnabled(portal.id, portal.enabled)}
                        className={portal.enabled ? "text-amber-400" : "text-green-400"}
                      >
                        {portal.enabled ? "Disable" : "Enable"}
                      </Button>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(portal.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </animated.div>
  )
}
