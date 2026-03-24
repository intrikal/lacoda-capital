"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Ban,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  Clock,
  Activity,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
} from "@/lib/actions/api-key.actions"
import type { ApiKey } from "@/app/db/schema"

export default function ApiKeysPage() {
  const [keys, setKeys] = React.useState<ApiKey[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [newKeyName, setNewKeyName] = React.useState("")
  const [createdKey, setCreatedKey] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState("")
  const [copied, setCopied] = React.useState(false)

  const pageSpring = useSpring({
    from: { opacity: 0, y: 12 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  })

  const loadKeys = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await getApiKeys()
      setKeys(data)
    } catch {
      setError("Failed to load API keys")
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    setError("")

    const result = await createApiKey(newKeyName)
    if ("error" in result) {
      setError(result.error)
      setCreating(false)
      return
    }

    setCreatedKey(result.rawKey)
    setCreating(false)
    setNewKeyName("")
    loadKeys()
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async (id: string) => {
    const result = await revokeApiKey(id)
    if ("error" in result) {
      setError(result.error)
      return
    }
    loadKeys()
  }

  const handleDelete = async (id: string) => {
    const result = await deleteApiKey(id)
    if ("error" in result) {
      setError(result.error)
      return
    }
    loadKeys()
  }

  return (
    <animated.div style={pageSpring} className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Key className="h-6 w-6 text-teal-400" />
            API Keys
          </h1>
          <p className="text-zinc-400 mt-1">
            Manage API keys for programmatic access to your organization&apos;s data.
          </p>
        </div>
        <Button
          onClick={() => { setShowCreateDialog(true); setCreatedKey(null); setError("") }}
          className="bg-teal-600 hover:bg-teal-500 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Generate Key
        </Button>
      </div>

      {/* Info box */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Shield className="h-5 w-5 text-teal-400 mt-0.5 shrink-0" />
        <div className="text-sm text-zinc-400">
          <p>
            API keys provide read-only access to assets, documents, clients, entities, and ledger events
            at <code className="text-teal-400">/api/v1/*</code>. Assets also support create via POST.
          </p>
          <p className="mt-1">
            Rate limit: <strong className="text-zinc-300">100 requests/minute</strong> per key.
            All API actions are logged to the audit trail.
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
      {showCreateDialog && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
          {createdKey ? (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                API Key Created
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Copy this key now — it will not be shown again.
              </p>
              <div className="bg-zinc-950 border border-zinc-700 rounded-md p-3 font-mono text-sm text-teal-300 flex items-center justify-between gap-2">
                <span className="truncate">{createdKey}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(createdKey)}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-zinc-400" />
                  )}
                </Button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => { setShowCreateDialog(false); setCreatedKey(null) }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Generate New API Key</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="key-name" className="text-zinc-300">Key Name</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production, CI/CD, Partner"
                    className="mt-1 bg-zinc-950 border-zinc-700 text-white"
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !newKeyName.trim()}
                    className="bg-teal-600 hover:bg-teal-500 text-white"
                  >
                    {creating ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading API keys...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-700 rounded-lg">
          <Key className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No API keys yet.</p>
          <p className="text-zinc-500 text-sm mt-1">Generate a key to start using the REST API.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`border rounded-lg p-4 flex items-center justify-between gap-4 ${
                key.revoked
                  ? "border-zinc-800 bg-zinc-900/30 opacity-60"
                  : "border-zinc-700 bg-zinc-900/50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{key.name}</span>
                  {key.revoked && (
                    <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
                      Revoked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                  <span className="font-mono">{key.keyPrefix}...</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </span>
                  {key.lastUsedAt && (
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                  {key.requestCount > 0 && (
                    <span>{key.requestCount.toLocaleString()} requests</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!key.revoked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(key.id)}
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-950/50"
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                )}
                {key.revoked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage examples */}
      <div className="mt-10 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
          <h3 className="font-medium text-white">Quick Start</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-zinc-400 mb-2">cURL</p>
            <pre className="bg-zinc-950 rounded-md p-3 text-sm text-zinc-300 overflow-x-auto">
{`curl -H "Authorization: Bearer lch_YOUR_KEY" \\
  https://your-domain.com/api/v1/assets`}
            </pre>
          </div>
          <div>
            <p className="text-sm text-zinc-400 mb-2">Python</p>
            <pre className="bg-zinc-950 rounded-md p-3 text-sm text-zinc-300 overflow-x-auto">
{`import requests

resp = requests.get(
    "https://your-domain.com/api/v1/assets",
    headers={"Authorization": "Bearer lch_YOUR_KEY"}
)
print(resp.json())`}
            </pre>
          </div>
          <div>
            <p className="text-sm text-zinc-400 mb-2">Node.js</p>
            <pre className="bg-zinc-950 rounded-md p-3 text-sm text-zinc-300 overflow-x-auto">
{`const res = await fetch("https://your-domain.com/api/v1/assets", {
  headers: { Authorization: "Bearer lch_YOUR_KEY" }
});
const data = await res.json();`}
            </pre>
          </div>
        </div>
      </div>
    </animated.div>
  )
}
