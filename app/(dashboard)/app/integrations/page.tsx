"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Landmark,
  PenLine,
  CreditCard,
  Mail,
  Calendar,
  Users,
  Cloud,
  Database,
  FileSpreadsheet,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Settings,
  ArrowRight,
  Zap,
  Lock,
  RefreshCw,
  Clock,
  Loader2,
  Unplug,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  getPlaidLinkToken,
  exchangePlaidToken,
  triggerPlaidSync,
  getPlaidIntegration,
  disconnectPlaid,
} from "@/lib/actions/plaid.actions"
import {
  getDocuSignIntegration,
  disconnectDocuSign,
} from "@/lib/actions/docusign.actions"

import type { LucideIcon } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaticIntegration {
  id: string
  name: string
  description: string
  icon: LucideIcon
  category: string
  status: "connected" | "not_connected" | "coming_soon"
  connectedAt?: string
  features: string[]
}

interface LiveIntegrationData {
  id: string
  status: string
  lastSyncAt: string | null
  lastSyncStatus: string | null
  syncHistory: Array<{
    timestamp: string
    status: string
    accountsSynced?: number
    accountsCount?: number
  }>
  connectedAt: string | null
  statusMessage: string | null
}

// ─── Static Integrations (non-Plaid/DocuSign) ───────────────────────────────

const staticIntegrations: StaticIntegration[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Process payments and manage billing for your clients",
    icon: CreditCard,
    category: "Payments",
    status: "connected",
    connectedAt: "2024-01-10",
    features: [
      "Invoice generation",
      "Payment tracking",
      "Subscription management",
      "Automatic reconciliation",
    ],
  },
  {
    id: "resend",
    name: "Resend",
    description: "Send transactional emails and notifications",
    icon: Mail,
    category: "Communication",
    status: "connected",
    connectedAt: "2024-01-05",
    features: [
      "Email notifications",
      "Document delivery",
      "Client communications",
      "Custom templates",
    ],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync meetings and deadlines with your calendar",
    icon: Calendar,
    category: "Productivity",
    status: "not_connected",
    features: ["Meeting scheduling", "Deadline reminders", "Task due dates", "Team availability"],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Sync client data with your CRM",
    icon: Users,
    category: "CRM",
    status: "not_connected",
    features: ["Contact sync", "Activity logging", "Pipeline tracking", "Custom fields"],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Import and sync documents from Dropbox",
    icon: Cloud,
    category: "Storage",
    status: "not_connected",
    features: ["Document import", "Automatic sync", "Folder mapping", "Version tracking"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Connect your Google Drive for document storage",
    icon: Cloud,
    category: "Storage",
    status: "connected",
    connectedAt: "2024-01-08",
    features: ["Document import", "Folder sync", "Shared drives", "Real-time updates"],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Sync financial data and transactions",
    icon: FileSpreadsheet,
    category: "Accounting",
    status: "not_connected",
    features: ["Transaction import", "Account balances", "Report generation", "Reconciliation"],
  },
  {
    id: "okta",
    name: "Okta",
    description: "Enterprise SSO and identity management",
    icon: Key,
    category: "Security",
    status: "coming_soon",
    features: ["Single Sign-On", "User provisioning", "MFA integration", "Access policies"],
  },
]

const allCategories = [
  "Banking",
  "Signatures",
  ...Array.from(new Set(staticIntegrations.map((i) => i.category))),
]

// ─── Plaid Bank Connection Card ──────────────────────────────────────────────

function PlaidCard({
  liveData,
  onConnect,
  onSync,
  onDisconnect,
  isSyncing,
}: {
  liveData: LiveIntegrationData | null
  onConnect: () => void
  onSync: () => void
  onDisconnect: () => void
  isSyncing: boolean
}) {
  const isConnected = liveData?.status === "connected"
  const isDisconnected = liveData?.status === "disconnected"
  const isError = liveData?.status === "error"

  const statusConfig = isConnected
    ? { label: "Connected", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" }
    : isError
      ? { label: "Error", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" }
      : isDisconnected
        ? { label: "Disconnected", icon: XCircle, color: "text-amber-400", bg: "bg-amber-400/10" }
        : { label: "Not Connected", icon: XCircle, color: "text-zinc-400", bg: "bg-zinc-400/10" }

  const StatusIcon = statusConfig.icon

  return (
    <Card className="group hover:border-zinc-700 transition-colors col-span-1 md:col-span-2 lg:col-span-3">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Left: Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-zinc-800">
                  <Landmark className="h-6 w-6 text-tiffany-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100">Plaid — Bank Connections</h3>
                  <p className="text-sm text-zinc-500">Banking</p>
                </div>
              </div>
              <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full", statusConfig.bg)}>
                <StatusIcon className={cn("h-3.5 w-3.5", statusConfig.color)} />
                <span className={cn("text-xs font-medium", statusConfig.color)}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-400">
              Connect your bank accounts via Plaid to automatically sync balances daily.
              Checking and savings accounts appear as cash assets, investment accounts as equities.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">Auto-sync balances</Badge>
              <Badge variant="outline" className="text-xs">Multi-account</Badge>
              <Badge variant="outline" className="text-xs">Daily refresh</Badge>
              <Badge variant="outline" className="text-xs">Encrypted credentials</Badge>
            </div>

            {isError && liveData?.statusMessage && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{liveData.statusMessage}</p>
              </div>
            )}
          </div>

          {/* Right: Status & Actions */}
          <div className="md:w-64 space-y-4">
            {isConnected && liveData?.lastSyncAt && (
              <div className="p-3 rounded-lg bg-zinc-800/50 space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="h-3.5 w-3.5" />
                  Last synced
                </div>
                <p className="text-sm font-medium text-zinc-100">
                  {new Date(liveData.lastSyncAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {liveData.lastSyncStatus && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      liveData.lastSyncStatus === "success"
                        ? "border-emerald-500/30 text-emerald-400"
                        : "border-red-500/30 text-red-400"
                    )}
                  >
                    {liveData.lastSyncStatus}
                  </Badge>
                )}
              </div>
            )}

            {isConnected && liveData?.connectedAt && (
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500">Connected on</p>
                <p className="text-sm font-medium text-zinc-100">
                  {new Date(liveData.connectedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {isConnected ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    {isSyncing ? "Syncing..." : "Re-sync Now"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={onDisconnect}
                  >
                    <Unplug className="h-4 w-4 mr-1" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={onConnect}>
                  Connect Bank
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sync History Log */}
        {isConnected && liveData?.syncHistory && liveData.syncHistory.length > 0 && (
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <p className="text-sm font-medium text-zinc-300 mb-3">Sync History</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {liveData.syncHistory.slice(0, 10).map((entry, i) => (
                <div
                  key={`${entry.timestamp}-${i}`}
                  className="flex items-center justify-between text-xs px-3 py-2 rounded bg-zinc-800/30"
                >
                  <span className="text-zinc-400">
                    {new Date(entry.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      entry.status === "success" ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {entry.status}
                    {entry.accountsSynced !== undefined && ` (${entry.accountsSynced} accounts)`}
                    {entry.accountsCount !== undefined && ` (${entry.accountsCount} accounts)`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── DocuSign Card ───────────────────────────────────────────────────────────

function DocuSignCard({
  liveData,
  onConnect,
  onDisconnect,
}: {
  liveData: LiveIntegrationData | null
  onConnect: () => void
  onDisconnect: () => void
}) {
  const isConnected = liveData?.status === "connected"

  const statusConfig = isConnected
    ? { label: "Connected", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" }
    : { label: "Not Connected", icon: XCircle, color: "text-zinc-400", bg: "bg-zinc-400/10" }

  const StatusIcon = statusConfig.icon

  return (
    <Card className="group hover:border-zinc-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-800">
              <PenLine className="h-6 w-6 text-tiffany-500" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">DocuSign</h3>
              <p className="text-sm text-zinc-500">Signatures</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full", statusConfig.bg)}>
            <StatusIcon className={cn("h-3.5 w-3.5", statusConfig.color)} />
            <span className={cn("text-xs font-medium", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-400">
          Send documents for electronic signature. Completed documents are automatically
          filed to the vault.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">Embedded signing</Badge>
          <Badge variant="outline" className="text-xs">Auto-file to vault</Badge>
          <Badge variant="outline" className="text-xs">+2 more</Badge>
        </div>

        {isConnected && liveData?.connectedAt && (
          <div className="mt-4 p-3 rounded-lg bg-zinc-800/50">
            <p className="text-xs text-zinc-500">Connected on</p>
            <p className="text-sm font-medium text-zinc-100">
              {new Date(liveData.connectedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {isConnected ? (
            <>
              <Button variant="outline" size="sm" className="flex-1" onClick={onDisconnect}>
                <Unplug className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" className="flex-1" onClick={onConnect}>
              Connect DocuSign
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Static Integration Card ─────────────────────────────────────────────────

function IntegrationCard({
  integration,
  onConnect,
  onConfigure,
}: {
  integration: StaticIntegration
  onConnect: (id: string) => void
  onConfigure: (id: string) => void
}) {
  const statusConfig = {
    connected: {
      label: "Connected",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    not_connected: {
      label: "Not Connected",
      icon: XCircle,
      color: "text-zinc-400",
      bg: "bg-zinc-400/10",
    },
    coming_soon: {
      label: "Coming Soon",
      icon: Zap,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  }

  const status = statusConfig[integration.status]
  const StatusIcon = status.icon
  const IntegrationIcon = integration.icon

  return (
    <Card className="group hover:border-zinc-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-800 group-hover:bg-zinc-750 transition-colors">
              <IntegrationIcon className="h-6 w-6 text-tiffany-500" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">{integration.name}</h3>
              <p className="text-sm text-zinc-500">{integration.category}</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full", status.bg)}>
            <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
            <span className={cn("text-xs font-medium", status.color)}>
              {status.label}
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-400">{integration.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {integration.features.slice(0, 2).map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
          {integration.features.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{integration.features.length - 2} more
            </Badge>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          {integration.status === "connected" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onConfigure(integration.id)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          ) : integration.status === "not_connected" ? (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onConnect(integration.id)}
            >
              Connect
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              Coming Soon
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [connectDialogOpen, setConnectDialogOpen] = React.useState(false)
  const [selectedIntegration, setSelectedIntegration] = React.useState<StaticIntegration | null>(null)
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const reducedMotion = useReducedMotion()

  // Live integration data from DB
  const [plaidData, setPlaidData] = React.useState<LiveIntegrationData | null>(null)
  const [docusignData, setDocusignData] = React.useState<LiveIntegrationData | null>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isConnecting, setIsConnecting] = React.useState(false)

  // Fetch live integration data
  React.useEffect(() => {
    async function fetchIntegrations() {
      try {
        const [plaid, docusign] = await Promise.all([
          getPlaidIntegration(),
          getDocuSignIntegration(),
        ])
        if (plaid) setPlaidData(plaid as unknown as LiveIntegrationData)
        if (docusign) setDocusignData(docusign as unknown as LiveIntegrationData)
      } catch {
        // User may not have integrations yet
      }
    }
    fetchIntegrations()
  }, [])

  // Count connected (static + live)
  const staticConnected = staticIntegrations.filter((i) => i.status === "connected").length
  const liveConnected = (plaidData?.status === "connected" ? 1 : 0) + (docusignData?.status === "connected" ? 1 : 0)
  const totalConnected = staticConnected + liveConnected
  const totalIntegrations = staticIntegrations.length + 2 // +2 for Plaid and DocuSign

  // Filter
  const filteredStatic =
    categoryFilter === "all" || categoryFilter === "Banking" || categoryFilter === "Signatures"
      ? staticIntegrations
      : staticIntegrations.filter((i) => i.category === categoryFilter)

  const showPlaid = categoryFilter === "all" || categoryFilter === "Banking"
  const showDocuSign = categoryFilter === "all" || categoryFilter === "Signatures"
  const showStatic = categoryFilter !== "Banking" && categoryFilter !== "Signatures"

  // ─── Plaid Handlers ──────────────────────────────────────────────────────

  const handleConnectPlaid = React.useCallback(async () => {
    setIsConnecting(true)
    try {
      const { link_token } = await getPlaidLinkToken()

      // Open Plaid Link in a new window (in production, use @plaid/link)
      // For now, simulate the flow with a prompt for the public token
      const publicToken = window.prompt(
        `Plaid Link Token created: ${link_token}\n\nIn production, Plaid Link opens here.\nFor sandbox testing, enter a public token:`
      )

      if (!publicToken) {
        setIsConnecting(false)
        return // User cancelled
      }

      // Ask for entity to link to
      const entityId = window.prompt("Enter the entity ID to link these bank accounts to:")
      if (!entityId) {
        setIsConnecting(false)
        return
      }

      const result = await exchangePlaidToken({
        publicToken,
        entityId,
        institutionName: "Test Bank",
      })

      // Refresh integration data
      const updated = await getPlaidIntegration()
      if (updated) setPlaidData(updated as unknown as LiveIntegrationData)

      alert(`Connected! ${result.assetsCreated} bank accounts imported as assets.`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to connect bank")
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const handleSyncPlaid = React.useCallback(async () => {
    setIsSyncing(true)
    try {
      const result = await triggerPlaidSync(plaidData?.id)
      // Refresh
      const updated = await getPlaidIntegration()
      if (updated) setPlaidData(updated as unknown as LiveIntegrationData)
      alert(`Sync complete: ${result.synced} synced, ${result.failed} failed`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setIsSyncing(false)
    }
  }, [plaidData?.id])

  const handleDisconnectPlaid = React.useCallback(async () => {
    if (!confirm("Disconnect Plaid? Daily sync will stop. Existing assets will remain.")) return
    try {
      await disconnectPlaid()
      setPlaidData((prev) => prev ? { ...prev, status: "disconnected" } : null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disconnect")
    }
  }, [])

  // ─── DocuSign Handlers ───────────────────────────────────────────────────

  const handleConnectDocuSign = React.useCallback(() => {
    // In production, redirect to DocuSign OAuth consent URL
    alert("DocuSign OAuth flow would open here.\nConfigure DOCUSIGN_* environment variables to enable.")
  }, [])

  const handleDisconnectDocuSign = React.useCallback(async () => {
    if (!confirm("Disconnect DocuSign? Pending envelopes will still complete.")) return
    try {
      await disconnectDocuSign()
      setDocusignData((prev) => prev ? { ...prev, status: "disconnected" } : null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disconnect")
    }
  }, [])

  // ─── Static handlers ─────────────────────────────────────────────────────

  const handleConnect = (id: string) => {
    const integration = staticIntegrations.find((i) => i.id === id)
    if (integration) {
      setSelectedIntegration(integration)
      setConnectDialogOpen(true)
    }
  }

  const handleConfigure = (id: string) => {
    const integration = staticIntegrations.find((i) => i.id === id)
    if (integration) {
      setSelectedIntegration(integration)
      setConnectDialogOpen(true)
    }
  }

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Integrations</h1>
          <p className="text-zinc-400 mt-1">
            Connect your favorite tools and services
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {totalConnected} of {totalIntegrations} connected
        </Badge>
      </div>

      {/* OAuth Disclaimer */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-tiffany-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-100">
              Secure Connections &amp; Encrypted Credentials
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              All integrations use industry-standard OAuth 2.0 authentication. Credentials
              are encrypted at rest via Supabase Vault (AES-256-GCM). You can revoke
              access at any time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoryFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter("all")}
        >
          All
        </Button>
        {allCategories.map((category) => (
          <Button
            key={category}
            variant={categoryFilter === category ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Plaid Bank Connection (featured, full-width) */}
      {showPlaid && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PlaidCard
            liveData={plaidData}
            onConnect={handleConnectPlaid}
            onSync={handleSyncPlaid}
            onDisconnect={handleDisconnectPlaid}
            isSyncing={isSyncing}
          />
        </div>
      )}

      {/* DocuSign + Other Integrations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showDocuSign && (
          <DocuSignCard
            liveData={docusignData}
            onConnect={handleConnectDocuSign}
            onDisconnect={handleDisconnectDocuSign}
          />
        )}
        {showStatic &&
          filteredStatic.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnect={handleConnect}
              onConfigure={handleConfigure}
            />
          ))}
      </div>

      {/* Connect Dialog (static integrations) */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedIntegration && (() => {
                const SelectedIcon = selectedIntegration.icon
                return (
                  <>
                    <div className="p-2 rounded-lg bg-zinc-800">
                      <SelectedIcon className="h-5 w-5 text-tiffany-500" />
                    </div>
                    {selectedIntegration.status === "connected"
                      ? `Configure ${selectedIntegration.name}`
                      : `Connect ${selectedIntegration.name}`}
                  </>
                )
              })()}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.status === "connected"
                ? "Manage your integration settings and permissions."
                : "Securely connect your account using OAuth."}
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-zinc-400 mb-3">
                  {selectedIntegration.description}
                </p>
                <p className="text-sm font-medium text-zinc-100 mb-2">
                  Features included:
                </p>
                <ul className="space-y-2">
                  {selectedIntegration.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-zinc-400"
                    >
                      <CheckCircle2 className="h-4 w-4 text-tiffany-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedIntegration.status === "connected" && (
                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <p className="text-sm text-zinc-500">Connected on</p>
                  <p className="text-sm font-medium text-zinc-100">
                    {new Date(selectedIntegration.connectedAt!).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            {selectedIntegration?.status === "connected" ? (
              <Button
                variant="destructive"
                onClick={() => setConnectDialogOpen(false)}
              >
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => setConnectDialogOpen(false)}>
                Connect with OAuth
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-tiffany-500" />
            Custom Integrations via API
          </CardTitle>
          <CardDescription>
            Build custom integrations using our REST API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400 mb-4">
            Need to connect a tool we don&apos;t support yet? Use our comprehensive
            API to build custom integrations. Available on Professional and
            Enterprise plans.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              View API Documentation
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="ghost" size="sm">
              Request Integration
            </Button>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
