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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// Transfer request types
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

// Mock transfer requests
const transferRequests = [
  { id: "1", type: "deposit", amount: 5000, fromAccount: "Chase Bank ****4532", toAccount: "Brokerage", status: "completed", date: "2024-01-10", completedDate: "2024-01-12" },
  { id: "2", type: "withdrawal", amount: 8500, fromAccount: "Retirement IRA", toAccount: "Chase Bank ****4532", status: "completed", date: "2023-12-20", completedDate: "2023-12-22" },
  { id: "3", type: "deposit", amount: 25000, fromAccount: "Chase Bank ****4532", toAccount: "Brokerage", status: "completed", date: "2023-12-10", completedDate: "2023-12-12" },
  { id: "4", type: "transfer", amount: 10000, fromAccount: "Brokerage", toAccount: "Retirement IRA", status: "processing", date: "2024-01-22", completedDate: null },
  { id: "5", type: "deposit", amount: 2500, fromAccount: "Bank of America ****7891", toAccount: "Brokerage", status: "pending", date: "2024-01-25", completedDate: null },
]

// Linked accounts for transfers
const linkedAccounts = [
  { id: "1", name: "Chase Bank ****4532", type: "checking", institution: "Chase" },
  { id: "2", name: "Bank of America ****7891", type: "savings", institution: "Bank of America" },
]

const investmentAccounts = [
  { id: "1", name: "Brokerage Account", balance: 1850000 },
  { id: "2", name: "Retirement IRA", balance: 485000 },
  { id: "3", name: "Roth IRA", balance: 125000 },
]

function NewTransferDialog() {
  const [open, setOpen] = React.useState(false)
  const [transferType, setTransferType] = React.useState<string>("")
  const [amount, setAmount] = React.useState("")
  const [fromAccount, setFromAccount] = React.useState("")
  const [toAccount, setToAccount] = React.useState("")
  const [frequency, setFrequency] = React.useState("one-time")

  const handleSubmit = () => {
    // In a real app, this would submit the transfer request
    setOpen(false)
    // Reset form
    setTransferType("")
    setAmount("")
    setFromAccount("")
    setToAccount("")
    setFrequency("one-time")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Transfer Request</DialogTitle>
          <DialogDescription>
            Request a deposit, withdrawal, or internal transfer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transfer Type */}
          <div className="space-y-2">
            <Label>Request Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(requestTypes).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setTransferType(key)}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-colors",
                    transferType === key
                      ? "border-tiffany-500 bg-tiffany-500/10"
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <config.icon className={cn("h-5 w-5 mx-auto mb-1", config.color)} />
                  <span className="text-xs font-medium text-zinc-100">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {/* From Account */}
          <div className="space-y-2">
            <Label>From Account</Label>
            <Select value={fromAccount} onValueChange={setFromAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {transferType === "deposit" ? (
                  linkedAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))
                ) : (
                  investmentAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* To Account */}
          <div className="space-y-2">
            <Label>To Account</Label>
            <Select value={toAccount} onValueChange={setToAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {transferType === "withdrawal" ? (
                  linkedAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))
                ) : (
                  investmentAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-time">One-time</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!transferType || !amount || !fromAccount || !toAccount}>
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ClientTransfersPage() {
  const [activeTab, setActiveTab] = React.useState("all")
  const reducedMotion = useReducedMotion()

  const filteredRequests = activeTab === "all"
    ? transferRequests
    : transferRequests.filter((req) => req.status === activeTab)

  // Summary calculations
  const pendingCount = transferRequests.filter(r => r.status === "pending" || r.status === "processing").length
  const pendingAmount = transferRequests
    .filter(r => r.status === "pending" || r.status === "processing")
    .reduce((sum, r) => sum + r.amount, 0)
  const completedThisMonth = transferRequests
    .filter(r => r.status === "completed" && new Date(r.date).getMonth() === new Date().getMonth())
    .reduce((sum, r) => sum + r.amount, 0)

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
        <NewTransferDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Pending Requests</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{pendingCount}</p>
                <p className="text-sm text-amber-400 mt-1">{formatCurrency(pendingAmount)} total</p>
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
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(completedThisMonth)}</p>
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
                <p className="text-2xl font-bold text-zinc-100 mt-1">{linkedAccounts.length}</p>
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
                            <span>Requested {format(new Date(request.date), "MMM d, yyyy")}</span>
                            {request.completedDate && (
                              <>
                                <span>•</span>
                                <span>Completed {format(new Date(request.completedDate), "MMM d, yyyy")}</span>
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
    </animated.div>
  )
}
