"use client"

import * as React from "react"
import {
  Book,
  Key,
  Shield,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Play,
  Code2,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ─── OpenAPI spec data ───────────────────────────────────────────────────────

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/assets",
    summary: "List assets",
    description: "Returns all assets for your organization. Supports filtering by entity_id, asset_class, and status.",
    params: [
      { name: "entity_id", type: "uuid", required: false, description: "Filter by entity" },
      { name: "asset_class", type: "string", required: false, description: "Filter by class (real_estate, equities, etc.)" },
      { name: "status", type: "string", required: false, description: "Filter by status (active, pending, sold, transferred)" },
      { name: "limit", type: "integer", required: false, description: "Max results (default 100, max 500)" },
      { name: "offset", type: "integer", required: false, description: "Pagination offset" },
    ],
    response: '{\n  "data": [{\n    "id": "uuid",\n    "entity_id": "uuid",\n    "name": "123 Main St",\n    "asset_class": "real_estate",\n    "status": "active",\n    "current_value": "500000.00",\n    "created_at": "2024-01-15T10:30:00Z"\n  }],\n  "total": 42,\n  "limit": 100,\n  "offset": 0\n}',
  },
  {
    method: "POST",
    path: "/api/v1/assets",
    summary: "Create asset",
    description: "Create a new asset under an entity. The entity must belong to your organization.",
    params: [],
    body: '{\n  "entity_id": "uuid (required)",\n  "name": "string (required)",\n  "asset_class": "real_estate | equities | ... (required)",\n  "status": "active (default)",\n  "description": "string",\n  "current_value": "500000.00",\n  "metadata": {}\n}',
    response: '{\n  "data": {\n    "id": "uuid",\n    "name": "New Asset",\n    ...\n  }\n}',
  },
  {
    method: "GET",
    path: "/api/v1/clients",
    summary: "List clients",
    description: "Returns all clients for your organization.",
    params: [
      { name: "limit", type: "integer", required: false, description: "Max results (default 100, max 500)" },
      { name: "offset", type: "integer", required: false, description: "Pagination offset" },
    ],
    response: '{\n  "data": [{\n    "id": "uuid",\n    "display_name": "John Smith",\n    "email": "john@example.com",\n    "profile": { "clientType": "individual" }\n  }],\n  "total": 15\n}',
  },
  {
    method: "GET",
    path: "/api/v1/entities",
    summary: "List entities",
    description: "Returns all legal entities for your organization. Supports filtering by client_id and entity_type.",
    params: [
      { name: "client_id", type: "uuid", required: false, description: "Filter by client" },
      { name: "entity_type", type: "string", required: false, description: "Filter by type (personal, llc, trust, etc.)" },
    ],
    response: '{\n  "data": [{\n    "id": "uuid",\n    "client_id": "uuid",\n    "name": "Smith Family Trust",\n    "entity_type": "trust"\n  }]\n}',
  },
  {
    method: "GET",
    path: "/api/v1/documents",
    summary: "List documents",
    description: "Returns all documents for your organization. Supports filtering by status and client_id.",
    params: [
      { name: "status", type: "string", required: false, description: "Filter by status (pending, verified, expired, rejected)" },
      { name: "client_id", type: "uuid", required: false, description: "Filter by client" },
    ],
    response: '{\n  "data": [{\n    "id": "uuid",\n    "name": "Trust_Document.pdf",\n    "file_type": "application/pdf",\n    "status": "verified"\n  }]\n}',
  },
  {
    method: "GET",
    path: "/api/v1/ledger",
    summary: "List audit events",
    description: "Returns audit trail events for your organization (read-only). Supports filtering by action, target_type, and date range.",
    params: [
      { name: "action", type: "string", required: false, description: "Filter by action (created, updated, deleted, etc.)" },
      { name: "target_type", type: "string", required: false, description: "Filter by target (asset, document, client, etc.)" },
      { name: "after", type: "ISO 8601", required: false, description: "Events after this date" },
      { name: "before", type: "ISO 8601", required: false, description: "Events before this date" },
    ],
    response: '{\n  "data": [{\n    "id": "uuid",\n    "action": "created",\n    "target_type": "asset",\n    "target_id": "uuid",\n    "actor_user_id": null,\n    "payload": { "source": "api_key:Production" },\n    "created_at": "2024-01-15T10:30:00Z"\n  }]\n}',
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function ApiDocsPage() {
  const [expandedEndpoint, setExpandedEndpoint] = React.useState<number | null>(0)
  const [tryItKey, setTryItKey] = React.useState("")
  const [tryItEndpoint, setTryItEndpoint] = React.useState(0)
  const [tryItResult, setTryItResult] = React.useState("")
  const [tryItLoading, setTryItLoading] = React.useState(false)
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null)

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const handleTryIt = async () => {
    if (!tryItKey) {
      setTryItResult('{ "error": "Please enter your API key above" }')
      return
    }
    setTryItLoading(true)
    const endpoint = ENDPOINTS[tryItEndpoint]
    try {
      const res = await fetch(endpoint.path, {
        headers: { Authorization: `Bearer ${tryItKey}` },
      })
      const data = await res.json()
      setTryItResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setTryItResult(`{ "error": "Request failed: ${err}" }`)
    }
    setTryItLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <Book className="h-8 w-8 text-teal-400" />
            <h1 className="text-3xl font-bold">API Reference</h1>
            <span className="text-xs bg-teal-900/50 text-teal-300 px-2 py-1 rounded-full ml-2">v1</span>
          </div>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Programmatic access to your organization&apos;s assets, documents, clients, entities, and audit trail.
          </p>

          {/* Quick cards */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <Key className="h-5 w-5 text-teal-400 mb-2" />
              <h3 className="font-medium text-white text-sm">Authentication</h3>
              <p className="text-xs text-zinc-400 mt-1">API key via Authorization header</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <Zap className="h-5 w-5 text-amber-400 mb-2" />
              <h3 className="font-medium text-white text-sm">Rate Limits</h3>
              <p className="text-xs text-zinc-400 mt-1">100 requests/min per key</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <Shield className="h-5 w-5 text-green-400 mb-2" />
              <h3 className="font-medium text-white text-sm">Audit Trail</h3>
              <p className="text-xs text-zinc-400 mt-1">All actions logged automatically</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-[1fr_380px] gap-8">
          {/* Left: Endpoints */}
          <div className="space-y-6">
            {/* Auth section */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-teal-400" />
                  Authentication
                </h2>
              </div>
              <div className="p-4 text-sm text-zinc-400 space-y-3">
                <p>
                  All API requests require an API key passed in the <code className="text-teal-400">Authorization</code> header:
                </p>
                <pre className="bg-zinc-950 rounded-md p-3 text-xs text-zinc-300">
                  Authorization: Bearer lch_your_api_key_here
                </pre>
                <p>
                  Generate API keys in <strong className="text-zinc-300">Settings → API Keys</strong>.
                  Keys are shown once at creation and stored as hashes — they cannot be recovered.
                </p>
              </div>
            </div>

            {/* Endpoints */}
            <h2 className="text-xl font-semibold text-white">Endpoints</h2>

            {ENDPOINTS.map((endpoint, idx) => (
              <div key={idx} className="border border-zinc-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedEndpoint(expandedEndpoint === idx ? null : idx)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-900/50 transition-colors"
                >
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    endpoint.method === "GET" ? "bg-blue-900/50 text-blue-300" : "bg-green-900/50 text-green-300"
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm text-zinc-300 font-mono">{endpoint.path}</code>
                  <span className="text-sm text-zinc-500 ml-2">{endpoint.summary}</span>
                  <div className="flex-1" />
                  {expandedEndpoint === idx ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  )}
                </button>

                {expandedEndpoint === idx && (
                  <div className="border-t border-zinc-800 p-4 space-y-4">
                    <p className="text-sm text-zinc-400">{endpoint.description}</p>

                    {endpoint.params.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Query Parameters</h4>
                        <div className="bg-zinc-950 rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-800">
                                <th className="text-left px-3 py-2 text-zinc-500 font-medium">Name</th>
                                <th className="text-left px-3 py-2 text-zinc-500 font-medium">Type</th>
                                <th className="text-left px-3 py-2 text-zinc-500 font-medium">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {endpoint.params.map((p) => (
                                <tr key={p.name} className="border-b border-zinc-800/50">
                                  <td className="px-3 py-2">
                                    <code className="text-teal-400">{p.name}</code>
                                  </td>
                                  <td className="px-3 py-2 text-zinc-500">{p.type}</td>
                                  <td className="px-3 py-2 text-zinc-400">{p.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {"body" in endpoint && endpoint.body && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Request Body</h4>
                        <pre className="bg-zinc-950 rounded-md p-3 text-xs text-zinc-300 overflow-x-auto">
                          {endpoint.body}
                        </pre>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase">Response</h4>
                        <button
                          onClick={() => handleCopy(endpoint.response, idx)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                        >
                          {copiedIdx === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedIdx === idx ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="bg-zinc-950 rounded-md p-3 text-xs text-zinc-300 overflow-x-auto">
                        {endpoint.response}
                      </pre>
                    </div>

                    {/* cURL example */}
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">cURL Example</h4>
                      <pre className="bg-zinc-950 rounded-md p-3 text-xs text-zinc-300 overflow-x-auto">
{endpoint.method === "GET"
  ? `curl -H "Authorization: Bearer lch_YOUR_KEY" \\\n  https://your-domain.com${endpoint.path}`
  : `curl -X POST -H "Authorization: Bearer lch_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${endpoint.body?.split("\n")[0]}...' \\\n  https://your-domain.com${endpoint.path}`
}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Error codes */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
                <h2 className="font-semibold text-white">Error Codes</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 text-zinc-500 font-medium">Status</th>
                      <th className="text-left py-2 text-zinc-500 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-400">
                    <tr className="border-b border-zinc-800/50">
                      <td className="py-2"><code className="text-amber-400">400</code></td>
                      <td className="py-2">Bad Request — Invalid JSON or missing required fields</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                      <td className="py-2"><code className="text-red-400">401</code></td>
                      <td className="py-2">Unauthorized — Missing, invalid, or revoked API key</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                      <td className="py-2"><code className="text-red-400">404</code></td>
                      <td className="py-2">Not Found — Resource not found or not in your org</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                      <td className="py-2"><code className="text-red-400">413</code></td>
                      <td className="py-2">Payload Too Large — Request body exceeds 1MB</td>
                    </tr>
                    <tr>
                      <td className="py-2"><code className="text-red-400">429</code></td>
                      <td className="py-2">Too Many Requests — Rate limit exceeded (100 req/min)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Try It panel */}
          <div className="space-y-4 sticky top-8 self-start">
            <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
              <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
                <Play className="h-4 w-4 text-teal-400" />
                <span className="font-medium text-white text-sm">Try It</span>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-zinc-500">API Key</label>
                  <Input
                    type="password"
                    value={tryItKey}
                    onChange={(e) => setTryItKey(e.target.value)}
                    placeholder="lch_..."
                    className="mt-1 bg-zinc-950 border-zinc-700 text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500">Endpoint</label>
                  <select
                    value={tryItEndpoint}
                    onChange={(e) => setTryItEndpoint(Number(e.target.value))}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-md p-2 text-sm text-white"
                  >
                    {ENDPOINTS.filter((e) => e.method === "GET").map((e, idx) => (
                      <option key={idx} value={idx}>
                        {e.method} {e.path}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleTryIt}
                  disabled={tryItLoading}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white"
                >
                  {tryItLoading ? "Loading..." : "Send Request"}
                </Button>

                {tryItResult && (
                  <div>
                    <label className="text-xs text-zinc-500">Response</label>
                    <pre className="mt-1 bg-zinc-950 border border-zinc-800 rounded-md p-3 text-xs text-zinc-300 max-h-80 overflow-auto">
                      {tryItResult}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Code examples */}
            <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
              <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-teal-400" />
                <span className="font-medium text-white text-sm">Code Examples</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Python</p>
                  <pre className="bg-zinc-950 rounded-md p-2 text-xs text-zinc-300">
{`import requests

r = requests.get(
  "https://your-domain.com/api/v1/assets",
  headers={"Authorization": "Bearer lch_..."}
)
assets = r.json()["data"]`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Node.js</p>
                  <pre className="bg-zinc-950 rounded-md p-2 text-xs text-zinc-300">
{`const res = await fetch(
  "https://your-domain.com/api/v1/assets",
  { headers: { Authorization: "Bearer lch_..." } }
);
const { data } = await res.json();`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">cURL</p>
                  <pre className="bg-zinc-950 rounded-md p-2 text-xs text-zinc-300">
{`curl -H "Authorization: Bearer lch_..." \\
  https://your-domain.com/api/v1/assets`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
