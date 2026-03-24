"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Shield,
  Plus,
  Trash2,
  Settings,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Upload,
  Link2,
  ChevronDown,
  ChevronUp,
  Edit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getSsoProviders,
  addSsoProvider,
  updateSsoProvider,
  deleteSsoProvider,
} from "@/lib/actions/sso.actions"
import { IDP_PRESETS } from "@/lib/sso"
import type { SamlProvider } from "@/app/db/schema"

export default function SecuritySettingsPage() {
  const [providers, setProviders] = React.useState<SamlProvider[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [error, setError] = React.useState("")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  // Add form state
  const [formName, setFormName] = React.useState("")
  const [formType, setFormType] = React.useState("okta")
  const [formDomains, setFormDomains] = React.useState("")
  const [formMetadataUrl, setFormMetadataUrl] = React.useState("")
  const [formMetadataXml, setFormMetadataXml] = React.useState("")
  const [formUseUrl, setFormUseUrl] = React.useState(true)
  const [formEnforced, setFormEnforced] = React.useState(false)
  const [formDefaultRole, setFormDefaultRole] = React.useState("client")
  const [formGroupMapping, setFormGroupMapping] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const pageSpring = useSpring({
    from: { opacity: 0, y: 12 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  })

  const loadProviders = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSsoProviders()
      setProviders(data)
    } catch {
      setError("Failed to load SSO providers")
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    loadProviders()
  }, [loadProviders])

  const handleAdd = async () => {
    setSaving(true)
    setError("")

    const domains = formDomains
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)

    // Parse group mapping: "GroupName=role" per line
    const groupRoleMapping: Record<string, string> = {}
    if (formGroupMapping.trim()) {
      for (const line of formGroupMapping.split("\n")) {
        const [group, role] = line.split("=").map((s) => s.trim())
        if (group && role) groupRoleMapping[group] = role
      }
    }

    const preset = IDP_PRESETS[formType]
    const result = await addSsoProvider({
      name: formName || preset?.name || "Custom IdP",
      providerType: formType,
      domains,
      metadataUrl: formUseUrl ? formMetadataUrl : undefined,
      metadataXml: !formUseUrl ? formMetadataXml : undefined,
      attributeMapping: preset?.attributeMapping,
      groupRoleMapping,
      defaultRole: formDefaultRole,
      enforced: formEnforced,
    })

    if ("error" in result) {
      setError(result.error)
      setSaving(false)
      return
    }

    // Reset form
    setShowAddForm(false)
    setFormName("")
    setFormDomains("")
    setFormMetadataUrl("")
    setFormMetadataXml("")
    setFormGroupMapping("")
    setSaving(false)
    loadProviders()
  }

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    const result = await updateSsoProvider(id, { enabled: !enabled })
    if ("error" in result) setError(result.error)
    else loadProviders()
  }

  const handleToggleEnforced = async (id: string, enforced: boolean) => {
    const result = await updateSsoProvider(id, { enforced: !enforced })
    if ("error" in result) setError(result.error)
    else loadProviders()
  }

  const handleDeleteProvider = async (id: string) => {
    const result = await deleteSsoProvider(id)
    if ("error" in result) setError(result.error)
    else loadProviders()
  }

  return (
    <animated.div style={pageSpring} className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="h-6 w-6 text-teal-400" />
            Security & SSO
          </h1>
          <p className="text-zinc-400 mt-1">
            Configure SAML 2.0 single sign-on with your identity provider.
          </p>
        </div>
        <Button
          onClick={() => { setShowAddForm(true); setError("") }}
          className="bg-teal-600 hover:bg-teal-500 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Identity Provider
        </Button>
      </div>

      {/* Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Lock className="h-5 w-5 text-teal-400 mt-0.5 shrink-0" />
        <div className="text-sm text-zinc-400">
          <p>
            SSO enables your team to log in using your organization&apos;s identity provider
            (Okta, Azure AD, Google Workspace). When SSO is <strong className="text-zinc-300">enforced</strong> for
            a domain, password login is disabled for users with that email domain.
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

      {/* Add IdP form */}
      {showAddForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add Identity Provider</h3>
          <div className="space-y-4">
            {/* Provider type */}
            <div>
              <Label className="text-zinc-300">Identity Provider</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {Object.entries(IDP_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setFormType(key)
                      setFormName(preset.name)
                    }}
                    className={`border rounded-lg p-3 text-center text-sm transition-colors ${
                      formType === key
                        ? "border-teal-500 bg-teal-950/50 text-teal-300"
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="idp-name" className="text-zinc-300">Display Name</Label>
              <Input
                id="idp-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Acme Corp Okta"
                className="mt-1 bg-zinc-950 border-zinc-700 text-white"
              />
            </div>

            {/* Domains */}
            <div>
              <Label htmlFor="idp-domains" className="text-zinc-300">Email Domains</Label>
              <Input
                id="idp-domains"
                value={formDomains}
                onChange={(e) => setFormDomains(e.target.value)}
                placeholder="acme.com, acme.co.uk"
                className="mt-1 bg-zinc-950 border-zinc-700 text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Comma-separated list of email domains that use this IdP.</p>
            </div>

            {/* Metadata */}
            <div>
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => setFormUseUrl(true)}
                  className={`text-sm flex items-center gap-1 ${formUseUrl ? "text-teal-400" : "text-zinc-500"}`}
                >
                  <Link2 className="h-4 w-4" />
                  Metadata URL
                </button>
                <button
                  onClick={() => setFormUseUrl(false)}
                  className={`text-sm flex items-center gap-1 ${!formUseUrl ? "text-teal-400" : "text-zinc-500"}`}
                >
                  <Upload className="h-4 w-4" />
                  Upload XML
                </button>
              </div>
              {formUseUrl ? (
                <Input
                  value={formMetadataUrl}
                  onChange={(e) => setFormMetadataUrl(e.target.value)}
                  placeholder="https://your-idp.com/app/metadata"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              ) : (
                <textarea
                  value={formMetadataXml}
                  onChange={(e) => setFormMetadataXml(e.target.value)}
                  placeholder="Paste your SAML metadata XML here..."
                  className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-md p-3 text-sm text-white font-mono resize-y"
                />
              )}
            </div>

            {/* Group mapping */}
            <div>
              <Label className="text-zinc-300">Group → Role Mapping</Label>
              <textarea
                value={formGroupMapping}
                onChange={(e) => setFormGroupMapping(e.target.value)}
                placeholder={"Admins=admin\nAdvisors=assistant\nClients=client"}
                className="w-full h-20 bg-zinc-950 border border-zinc-700 rounded-md p-3 text-sm text-white font-mono resize-y mt-1"
              />
              <p className="text-xs text-zinc-500 mt-1">One mapping per line: GroupName=role</p>
            </div>

            {/* Default role */}
            <div>
              <Label className="text-zinc-300">Default Role (when no group matches)</Label>
              <select
                value={formDefaultRole}
                onChange={(e) => setFormDefaultRole(e.target.value)}
                className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-md p-2 text-sm text-white"
              >
                <option value="client">Client (read-only)</option>
                <option value="assistant">Assistant (advisor)</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Enforce SSO */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formEnforced}
                onChange={(e) => setFormEnforced(e.target.checked)}
                className="accent-teal-500"
              />
              <div>
                <span className="text-sm text-zinc-300">Enforce SSO for this domain</span>
                <p className="text-xs text-zinc-500">Password login will be disabled for users with this email domain.</p>
              </div>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button
                onClick={handleAdd}
                disabled={saving || !formDomains.trim()}
                className="bg-teal-600 hover:bg-teal-500 text-white"
              >
                {saving ? "Saving..." : "Add Provider"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Providers list */}
      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading SSO configuration...</div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-lg">
          <Shield className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No identity providers configured.</p>
          <p className="text-zinc-500 text-sm mt-1">Add an IdP to enable single sign-on for your team.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="border border-zinc-700 bg-zinc-900/50 rounded-lg overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${provider.enabled ? "bg-green-400" : "bg-zinc-600"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{provider.name}</span>
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                        {provider.providerType}
                      </span>
                      {provider.enforced && (
                        <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Enforced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                      <Globe className="h-3 w-3" />
                      {((provider.domains as string[]) ?? []).join(", ")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === provider.id ? null : provider.id)}
                  >
                    {expandedId === provider.id ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === provider.id && (
                <div className="border-t border-zinc-800 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Entity ID</span>
                      <p className="text-zinc-300 font-mono text-xs mt-1 truncate">
                        {provider.entityId || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500">SSO URL</span>
                      <p className="text-zinc-300 font-mono text-xs mt-1 truncate">
                        {provider.ssoUrl || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Default Role</span>
                      <p className="text-zinc-300 mt-1">{provider.defaultRole}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Group Mappings</span>
                      <p className="text-zinc-300 mt-1">
                        {Object.keys(provider.groupRoleMapping as Record<string, string>).length || "None"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleEnabled(provider.id, provider.enabled)}
                      className={provider.enabled ? "text-amber-400" : "text-green-400"}
                    >
                      {provider.enabled ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Enable
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleEnforced(provider.id, provider.enforced)}
                      className="text-zinc-400"
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      {provider.enforced ? "Un-enforce" : "Enforce SSO"}
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProvider(provider.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SSO Flow Explanation */}
      <div className="mt-10 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
          <h3 className="font-medium text-white">How SSO Works</h3>
        </div>
        <div className="p-4 text-sm text-zinc-400 space-y-2">
          <p>1. User enters their email on the login page.</p>
          <p>2. If their email domain matches an SSO-enabled IdP, they are redirected to the IdP for authentication.</p>
          <p>3. After successful authentication, the IdP sends a SAML assertion back to our app.</p>
          <p>4. We extract the user&apos;s email, name, and group memberships from the assertion.</p>
          <p>5. The user is created or updated in our system, assigned a role based on group mapping.</p>
          <p>6. When SSO is enforced, password login is blocked for that domain with a &ldquo;Use SSO&rdquo; message.</p>
        </div>
      </div>
    </animated.div>
  )
}
