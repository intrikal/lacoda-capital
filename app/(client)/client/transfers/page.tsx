/**
 * @file app/(client)/client/transfers/page.tsx
 *
 * Client portal — Transfer Requests page.
 *
 * Data source: `useClientTransfers` hook from `@/lib/hooks/crud/use-client-transfers`
 * The hook returns `{ transfers, addTransfer, stats, isLoading }`.
 *
 * Form dialog: `TransferFormDialog` from `@/components/forms/transfer-form-dialog`
 * replaces the previous inline `NewTransferDialog` component.
 *
 * Interactive wiring:
 *   - "New Request" button sets `formOpen` to true.
 *   - `TransferFormDialog.onSubmit` calls `addTransfer(data)`.
 *   - Summary cards read from `stats.pendingCount`, `stats.pendingTotal`,
 *     `stats.completedThisMonthTotal`, and `stats.linkedAccountsCount`.
 *   - `transfers` from the hook replaces the old `transferRequests` mock array.
 *
 * Preserved as-is:
 *   - `requestTypes` and `statusConfig` display config objects.
 *   - Linked bank accounts list (static display config — bank account linking
 *     is a separate advisor-side workflow).
 *   - Full tab filter and transfer history card UI.
 */

"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Building2,
  CreditCard,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { useClientTransfers } from "@/lib/hooks/crud/use-client-transfers"
import { TransferFormDialog } from "@/components/forms/transfer-form-dialog"

// ─────────────────────────────────────────────────────────────────────────────
// Display config (static, not data)
// ─────────────────────────────────────────────────────────────────────────────

const requestTypes = {
  deposit: { label: "Deposit", icon: ArrowDownRight, color: "text-tiffany-500", bg: "bg-tiffany-500/10" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, color: "text-amber-400", bg: "bg-amber-400/10" },
  transfer: { label: "Transfer", icon: RefreshCw, color: "text-purple-400", bg: "bg-purple-400/10" },
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-400" },
  processing: { label: "Processing", icon: RefreshCw, color: "text-blue-400" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-zinc-400" },
  failed: { label: "Failed", icon: AlertCircle, color: "text-rose-400" },
}

/** Static bank account display list — linking is an advisor-side workflow */
const linkedAccounts = [
  { id: "1", name: "Chase Bank ****4532", type: "checking", institution: "Chase" },
  { id: "2", name: "Bank of America ****7891", type: "savings", institution: "Bank of America" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientTransfersPage() {
  const [activeTab, setActiveTab] = React.useState("all")
  const [formOpen, setFormOpen] = React.useState(false)
  const reducedMotion = useReducedMotion()

  // ── Hook ───────────────────────────────────────────────────────────────────
  const { transfers, addTransfer, stats } = useClientTransfers()

  const filteredRequests = activeTab === "all"
    ? transfers
    : transfers.filter((req) => req.status === activeTab)

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
          <h1 className="text-2xl font-bold text-zinc-100">Transfer Requests</h1>
          <p className="text-zinc-400 mt-1">
            Manage deposits, withdrawals, and transfers
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Pending Requests</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.pendingCount}</p>
                <p className="text-sm text-amber-400 mt-1">{formatCurrency(stats.pendingTotal)} total</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-400/10">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Completed This Month</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.completedThisMonthTotal)}</p>
                <p className="text-sm text-zinc-500 mt-1">Across all accounts</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-400/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Linked Accounts</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.linkedAccountsCount}</p>
                <p className="text-sm text-zinc-500 mt-1">External accounts</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-400/10">
                <Building2 className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Linked Bank Accounts</CardTitle>
              <CardDescription>Your connected external accounts</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Link Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {linkedAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-400/10">
                    <CreditCard className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">{account.name}</p>
                    <p className="text-xs text-zinc-500">{account.institution} • {account.type}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Manage</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transfer History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer History</CardTitle>
          <CardDescription>Your recent transfer requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No transfer requests found
                </div>
              ) : (
                filteredRequests.map((request) => {
                  const typeConfig = requestTypes[request.type as keyof typeof requestTypes]
                  const status = statusConfig[request.status as keyof typeof statusConfig]
                  if (!typeConfig || !status) return null
                  const TypeIcon = typeConfig.icon
                  const StatusIcon = status.icon

                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                          <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">
                            {typeConfig.label} - {formatCurrency(request.amount)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                            <span>{request.fromAccount}</span>
                            <ChevronRight className="h-3 w-3" />
                            <span>{request.toAccount}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            <span>Requested {format(new Date(request.createdAt), "MMM d, yyyy")}</span>
                            {request.completedAt && (
                              <>
                                <span>•</span>
                                <span>Completed {format(new Date(request.completedAt), "MMM d, yyyy")}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("h-4 w-4", status.color)} />
                        <Badge variant="outline" className={cn("text-xs", status.color)}>
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transfer Form Dialog */}
      <TransferFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(data) => addTransfer(data)}
      />
    </animated.div>
  )
}
