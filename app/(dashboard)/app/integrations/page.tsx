"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
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
  ExternalLink,
  Settings,
  ArrowRight,
  Zap,
  Lock,
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

import type { LucideIcon } from "lucide-react"

interface Integration {
  id: string
  name: string
  description: string
  icon: LucideIcon
  category: string
  status: "connected" | "not_connected" | "coming_soon"
  connectedAt?: string
  features: string[]
}

const integrations: Integration[] = [
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
    features: [
      "Meeting scheduling",
      "Deadline reminders",
      "Task due dates",
      "Team availability",
    ],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Sync client data with your CRM",
    icon: Users,
    category: "CRM",
    status: "not_connected",
    features: [
      "Contact sync",
      "Activity logging",
      "Pipeline tracking",
      "Custom fields",
    ],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Import and sync documents from Dropbox",
    icon: Cloud,
    category: "Storage",
    status: "not_connected",
    features: [
      "Document import",
      "Automatic sync",
      "Folder mapping",
      "Version tracking",
    ],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Connect your Google Drive for document storage",
    icon: Cloud,
    category: "Storage",
    status: "connected",
    connectedAt: "2024-01-08",
    features: [
      "Document import",
      "Folder sync",
      "Shared drives",
      "Real-time updates",
    ],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Sync financial data and transactions",
    icon: FileSpreadsheet,
    category: "Accounting",
    status: "not_connected",
    features: [
      "Transaction import",
      "Account balances",
      "Report generation",
      "Reconciliation",
    ],
  },
  {
    id: "okta",
    name: "Okta",
    description: "Enterprise SSO and identity management",
    icon: Key,
    category: "Security",
    status: "coming_soon",
    features: [
      "Single Sign-On",
      "User provisioning",
      "MFA integration",
      "Access policies",
    ],
  },
]

const categories = Array.from(new Set(integrations.map((i) => i.category)))

function IntegrationCard({
  integration,
  onConnect,
  onConfigure,
}: {
  integration: Integration
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

export default function IntegrationsPage() {
  const [connectDialogOpen, setConnectDialogOpen] = React.useState(false)
  const [selectedIntegration, setSelectedIntegration] = React.useState<Integration | null>(null)
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const reducedMotion = useReducedMotion()

  const filteredIntegrations =
    categoryFilter === "all"
      ? integrations
      : integrations.filter((i) => i.category === categoryFilter)

  const connectedCount = integrations.filter((i) => i.status === "connected").length

  const handleConnect = (id: string) => {
    const integration = integrations.find((i) => i.id === id)
    if (integration) {
      setSelectedIntegration(integration)
      setConnectDialogOpen(true)
    }
  }

  const handleConfigure = (id: string) => {
    const integration = integrations.find((i) => i.id === id)
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
          {connectedCount} of {integrations.length} connected
        </Badge>
      </div>

      {/* OAuth Disclaimer */}
      <Card className="border-tiffany-500/20 bg-tiffany-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-tiffany-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-100">
              Secure OAuth Connections
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              All integrations use industry-standard OAuth 2.0 authentication. We
              never store your third-party credentials. You can revoke access at
              any time from your connected service&apos;s settings.
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

      {/* Integrations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={handleConnect}
            onConfigure={handleConfigure}
          />
        ))}
      </div>

      {/* Connect Dialog */}
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
                    {new Date(selectedIntegration.connectedAt!).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
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
