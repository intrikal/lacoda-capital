"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Landmark,
  PenLine,
  CreditCard,
  Mail,
  Cloud,
  Database,
  FileSpreadsheet,
  PenTool,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Settings,
  ArrowRight,
  Zap,
  Lock,
  RefreshCw,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  useIntegrations,
  useDisconnectIntegration,
  usePlaidConnect,
  useStripeConnect,
  useOAuthConnect,
} from "@/lib/hooks/crud/use-integrations"
import type { IntegrationRecord, ProviderStatus } from "@/lib/hooks/crud/use-integrations"

import type { LucideIcon } from "lucide-react"

// ─── Provider Catalog ───────────────────────────────────────────────────────
// Static metadata for each provider — icons, descriptions, features, categories.
// Live connection status comes from the useIntegrations() hook.

interface ProviderMeta {
  id: string
  name: string
  description: string
  icon: LucideIcon
  category: string
  features: string[]
  connectType: "plaid_link" | "stripe_key" | "oauth" | "env_only" | "coming_soon"
}

const PROVIDER_CATALOG: ProviderMeta[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Collect advisory fee payments, generate invoices, and manage client billing",
    icon: CreditCard,
    category: "Payments",
    features: ["Invoice generation", "Payment collection", "Subscription billing", "Automatic reconciliation"],
    connectType: "stripe_key",
  },
  {
    id: "plaid",
    name: "Plaid",
    description: "Connect bank accounts to auto-sync balances, holdings, and transactions",
    icon: Landmark,
    category: "Financial Data",
    features: ["Account balances", "Investment holdings", "Transaction history", "Multi-bank support"],
    connectType: "plaid_link",
  },
  {
    id: "docusign",
    name: "DocuSign",
    description: "Send documents for electronic signature and track signing status",
    icon: PenTool,
    category: "E-Signatures",
    features: ["Send for signature", "Status tracking", "Signed PDF download", "Webhook notifications"],
    connectType: "oauth",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Sync billing records and invoices with your accounting system",
    icon: FileSpreadsheet,
    category: "Accounting",
    features: ["Invoice sync", "Chart of accounts", "Customer matching", "Payment reconciliation"],
    connectType: "oauth",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Import and sync documents from Google Drive into your vault",
    icon: Cloud,
    category: "Storage",
    features: ["Document import", "Folder browsing", "Shared drives", "On-demand sync"],
    connectType: "oauth",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Bi-directional CRM sync — clients, deals, and activity data",
    icon: Database,
    category: "CRM",
    features: ["Client sync", "Deal pipeline", "Activity feed", "Field mapping"],
    connectType: "oauth",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Import and sync documents from Dropbox",
    icon: Cloud,
    category: "Storage",
    features: ["Document import", "Automatic sync", "Folder mapping", "Version tracking"],
    connectType: "oauth",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Transactional emails — invitations, expiration alerts, weekly digests",
    icon: Mail,
    category: "Communication",
    features: ["Email notifications", "Document expiration alerts", "Team invitations", "Weekly digests"],
    connectType: "env_only",
  },
]

const categories = Array.from(new Set(PROVIDER_CATALOG.map((p) => p.category)))

// ─── Status Helpers ─────────────────────────────────────────────────────────

function getProviderDisplayStatus(
  provider: ProviderMeta,
  providerStatus: ProviderStatus | undefined,
  liveIntegration: IntegrationRecord | undefined,
): "connected" | "available" | "not_configured" | "error" | "coming_soon" {
  if (provider.connectType === "coming_soon") return "coming_soon"
  if (provider.connectType === "env_only") {
    return providerStatus?.configured ? "connected" : "not_configured"
  }
  if (liveIntegration?.status === "error") return "error"
  if (liveIntegration?.status === "connected") return "connected"
  if (providerStatus?.configured) return "available"
  return "not_configured"
}

const STATUS_CONFIG = {
  connected: { label: "Connected", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  available: { label: "Available", icon: ArrowRight, color: "text-tiffany-400", bg: "bg-tiffany-400/10" },
  not_configured: { label: "Not Configured", icon: XCircle, color: "text-zinc-400", bg: "bg-zinc-400/10" },
  error: { label: "Error", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
  coming_soon: { label: "Coming Soon", icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10" },
}

// ─── Integration Card ───────────────────────────────────────────────────────

function IntegrationCard({
  provider,
  displayStatus,
  liveIntegration,
  onConnect,
  onManage,
}: {
  provider: ProviderMeta
  displayStatus: "connected" | "available" | "not_configured" | "error" | "coming_soon"
  liveIntegration?: IntegrationRecord
  onConnect: (provider: ProviderMeta) => void
  onManage: (provider: ProviderMeta, integration: IntegrationRecord) => void
}) {
  const status = STATUS_CONFIG[displayStatus]
  const StatusIcon = status.icon
  const ProviderIcon = provider.icon

  return (
    <Card className="group hover:border-zinc-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-800 group-hover:bg-zinc-750 transition-colors">
              <ProviderIcon className="h-6 w-6 text-tiffany-500" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">{provider.name}</h3>
              <p className="text-sm text-zinc-500">{provider.category}</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full", status.bg)}>
            <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
            <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-400">{provider.description}</p>

        {/* Error message */}
        {displayStatus === "error" && liveIntegration?.statusMessage && (
          <p className="mt-2 text-xs text-red-400">{liveIntegration.statusMessage}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {provider.features.slice(0, 2).map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
          {provider.features.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{provider.features.length - 2} more
            </Badge>
          )}
        </div>

        {/* Last sync info */}
        {liveIntegration?.lastSyncAt && (
          <p className="mt-3 text-xs text-zinc-500">
            Last synced: {new Date(liveIntegration.lastSyncAt).toLocaleString()}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          {displayStatus === "connected" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => liveIntegration && onManage(provider, liveIntegration)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Manage
              </Button>
            </>
          ) : displayStatus === "available" || displayStatus === "error" ? (
            <Button size="sm" className="flex-1" onClick={() => onConnect(provider)}>
              {displayStatus === "error" ? "Reconnect" : "Connect"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : displayStatus === "not_configured" ? (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              Not Configured
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

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { integrations: liveIntegrations, providers, isLoading, stats, refetch } = useIntegrations()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectIntegration()
  const { connect: plaidConnect, exchangeToken: plaidExchange, isPending: isPlaidPending } = usePlaidConnect()
  const { connect: stripeConnect, isPending: isStripePending } = useStripeConnect()
  const { connect: oauthConnect, isPending: isOAuthPending } = useOAuthConnect()

  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [connectDialogOpen, setConnectDialogOpen] = React.useState(false)
  const [manageDialogOpen, setManageDialogOpen] = React.useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = React.useState(false)
  const [selectedProvider, setSelectedProvider] = React.useState<ProviderMeta | null>(null)
  const [selectedIntegration, setSelectedIntegration] = React.useState<IntegrationRecord | null>(null)

  const reducedMotion = useReducedMotion()

  const filteredProviders =
    categoryFilter === "all"
      ? PROVIDER_CATALOG
      : PROVIDER_CATALOG.filter((p) => p.category === categoryFilter)

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleConnect = (provider: ProviderMeta) => {
    setSelectedProvider(provider)
    setConnectDialogOpen(true)
  }

  const handleManage = (provider: ProviderMeta, integration: IntegrationRecord) => {
    setSelectedProvider(provider)
    setSelectedIntegration(integration)
    setManageDialogOpen(true)
  }

  const executeConnect = () => {
    if (!selectedProvider) return

    switch (selectedProvider.connectType) {
      case "stripe_key":
        stripeConnect({
          onSuccess: () => {
            setConnectDialogOpen(false)
            refetch()
          },
        })
        break

      case "plaid_link":
        plaidConnect({
          onLinkToken: (token) => {
            // In production, this would open Plaid Link with the token
            // For now, close the dialog and show the token
            console.log("Plaid Link Token:", token)
            setConnectDialogOpen(false)
            // TODO: Open Plaid Link component with this token
          },
        })
        break

      case "oauth":
        oauthConnect(
          selectedProvider.id as "docusign" | "google_drive" | "quickbooks" | "salesforce" | "dropbox",
          {
            onError: (e) => console.error("OAuth connect failed:", e),
          },
        )
        break
    }
  }

  const handleDisconnect = () => {
    if (!selectedIntegration) return
    disconnect(selectedIntegration.id, {
      onSuccess: () => {
        setDisconnectDialogOpen(false)
        setManageDialogOpen(false)
        refetch()
      },
    })
  }

  // ─── Render ─────────────────────────────────────────────────────────

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  const isPending = isPlaidPending || isStripePending || isOAuthPending

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Integrations</h1>
          <p className="text-zinc-400 mt-1">
            Connect external services to automate your workflow
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="w-fit">
            {stats.connected} of {PROVIDER_CATALOG.length} connected
          </Badge>
          <Button variant="ghost" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Security Note */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-tiffany-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-100">Secure Connections</p>
            <p className="text-xs text-zinc-400 mt-1">
              All integrations use OAuth 2.0 or API key authentication. Credentials
              are encrypted and stored in Supabase Vault — never in the database.
              You can disconnect any integration at any time.
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
        {categories.map((category) => (
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      )}

      {/* Integrations Grid */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => {
            const providerStatus = providers[provider.id]
            const liveIntegration = liveIntegrations.find((i) => i.provider === provider.id)
            const displayStatus = getProviderDisplayStatus(provider, providerStatus, liveIntegration)

            return (
              <IntegrationCard
                key={provider.id}
                provider={provider}
                displayStatus={displayStatus}
                liveIntegration={liveIntegration}
                onConnect={handleConnect}
                onManage={handleManage}
              />
            )
          })}
        </div>
      )}

      {/* Connect Dialog (static integrations) */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedProvider && (() => {
                const SelectedIcon = selectedProvider.icon
                return (
                  <>
                    <div className="p-2 rounded-lg bg-zinc-800">
                      <SelectedIcon className="h-5 w-5 text-tiffany-500" />
                    </div>
                    Connect {selectedProvider.name}
                  </>
                )
              })()}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider?.connectType === "plaid_link"
                ? "Connect your bank account securely through Plaid."
                : selectedProvider?.connectType === "stripe_key"
                  ? "Activate Stripe to start collecting payments."
                  : "You'll be redirected to authorize access."}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-zinc-400">{selectedProvider.description}</p>
              <div>
                <p className="text-sm font-medium text-zinc-100 mb-2">Features included:</p>
                <ul className="space-y-2">
                  {selectedProvider.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="h-4 w-4 text-tiffany-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executeConnect} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedProvider?.connectType === "plaid_link"
                ? "Open Plaid Link"
                : selectedProvider?.connectType === "stripe_key"
                  ? "Activate Stripe"
                  : "Connect with OAuth"}
              {!isPending && <ExternalLink className="h-4 w-4 ml-2" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedProvider && (() => {
                const SelectedIcon = selectedProvider.icon
                return (
                  <>
                    <div className="p-2 rounded-lg bg-zinc-800">
                      <SelectedIcon className="h-5 w-5 text-tiffany-500" />
                    </div>
                    {selectedProvider.name}
                  </>
                )
              })()}
            </DialogTitle>
            <DialogDescription>Manage your integration connection and settings.</DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500">Status</p>
                  <p className="text-sm font-medium text-emerald-400 mt-1">Connected</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500">Connected on</p>
                  <p className="text-sm font-medium text-zinc-100 mt-1">
                    {selectedIntegration.connectedAt
                      ? new Date(selectedIntegration.connectedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              {selectedIntegration.lastSyncAt && (
                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500">Last synced</p>
                  <p className="text-sm font-medium text-zinc-100 mt-1">
                    {new Date(selectedIntegration.lastSyncAt).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedIntegration.name && (
                <div className="p-4 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500">Connection name</p>
                  <p className="text-sm font-medium text-zinc-100 mt-1">
                    {selectedIntegration.name}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setManageDialogOpen(false)
                setDisconnectDialogOpen(true)
              }}
            >
              <Unplug className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {selectedProvider?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access and stop all data syncing. You can reconnect at
              any time, but historical sync data may need to be re-fetched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDisconnecting}
            >
              {isDisconnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
