"use client"

import * as React from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns"
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Building2,
  Video,
  Phone,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
import { ContentCard, StatCard } from "@/components/client/content-card"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

// ============================================================================
// DATA
// ============================================================================

const transactionTypes = {
  buy: { label: "Buy", icon: ArrowDownRight, color: "text-blue-400", bg: "bg-blue-500/10" },
  sell: { label: "Sell", icon: ArrowUpRight, color: "text-amber-400", bg: "bg-amber-500/10" },
  dividend: { label: "Dividend", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  deposit: { label: "Deposit", icon: ArrowDownRight, color: "text-tiffany-500", bg: "bg-tiffany-500/10" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, color: "text-rose-400", bg: "bg-rose-500/10" },
  transfer: { label: "Transfer", icon: RefreshCw, color: "text-purple-400", bg: "bg-purple-500/10" },
  fee: { label: "Fee", icon: CreditCard, color: "text-zinc-400", bg: "bg-zinc-500/10" },
}

const transactions = [
  { id: "1", type: "dividend", description: "Quarterly Dividend - VTI", amount: 1250, date: "2024-01-15", account: "Brokerage" },
  { id: "2", type: "buy", description: "Purchase - Apple Inc. (AAPL)", amount: -15000, date: "2024-01-12", account: "Brokerage" },
  { id: "3", type: "deposit", description: "Monthly Contribution", amount: 5000, date: "2024-01-10", account: "Retirement IRA" },
  { id: "4", type: "sell", description: "Sale - Tech Growth Fund", amount: 8500, date: "2024-01-08", account: "Brokerage" },
  { id: "5", type: "fee", description: "Advisory Fee - Q4 2023", amount: -2450, date: "2024-01-05", account: "Brokerage" },
  { id: "6", type: "dividend", description: "Dividend - Bond Fund", amount: 890, date: "2024-01-03", account: "Brokerage" },
  { id: "7", type: "transfer", description: "Transfer to Savings", amount: -10000, date: "2024-01-02", account: "Brokerage" },
  { id: "8", type: "buy", description: "Purchase - Bond ETF", amount: -25000, date: "2023-12-28", account: "Retirement IRA" },
]

const pendingTransfers = [
  { id: "1", type: "deposit", amount: 2500, from: "Bank of America ****7891", to: "Brokerage", date: "2024-01-25", status: "pending" },
  { id: "2", type: "transfer", amount: 10000, from: "Brokerage", to: "Retirement IRA", date: "2024-01-22", status: "processing" },
]

const transferHistory = [
  { id: "1", type: "deposit", amount: 5000, from: "Chase Bank ****4532", to: "Brokerage", status: "completed", date: "2024-01-10" },
  { id: "2", type: "withdrawal", amount: 8500, from: "Retirement IRA", to: "Chase Bank ****4532", status: "completed", date: "2023-12-20" },
  { id: "3", type: "deposit", amount: 25000, from: "Chase Bank ****4532", to: "Brokerage", status: "completed", date: "2023-12-10" },
]

const investmentAccounts = [
  { id: "1", name: "Brokerage Account", balance: 1850000 },
  { id: "2", name: "Retirement IRA", balance: 485000 },
]

const linkedAccounts = [
  { id: "1", name: "Chase Bank ****4532", type: "checking" },
  { id: "2", name: "Bank of America ****7891", type: "savings" },
]

const calendarEvents = [
  { id: "1", title: "Quarterly Review Meeting", date: "2024-01-25", type: "meeting", time: "2:00 PM" },
  { id: "2", title: "Dividend Payment - VTI", date: "2024-01-28", type: "payment" },
  { id: "3", title: "Tax Documents Due", date: "2024-02-15", type: "deadline" },
  { id: "4", title: "Portfolio Rebalance", date: "2024-02-01", type: "task" },
  { id: "5", title: "Advisor Call", date: "2024-01-30", type: "meeting", time: "10:00 AM" },
]

const eventTypeConfig = {
  meeting: { color: "bg-blue-500", icon: Video },
  payment: { color: "bg-emerald-500", icon: TrendingUp },
  deadline: { color: "bg-rose-500", icon: FileText },
  task: { color: "bg-amber-500", icon: CheckCircle2 },
}

// ============================================================================
// COMPONENTS
// ============================================================================

function NewTransferDialog() {
  const [open, setOpen] = React.useState(false)
  const [transferType, setTransferType] = React.useState("")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>New Transfer</DialogTitle>
          <DialogDescription>Request a deposit, withdrawal, or transfer</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "deposit", label: "Deposit", icon: ArrowDownRight, color: "text-tiffany-500" },
              { id: "withdrawal", label: "Withdraw", icon: ArrowUpRight, color: "text-amber-400" },
              { id: "transfer", label: "Transfer", icon: RefreshCw, color: "text-purple-400" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setTransferType(type.id)}
                className={cn(
                  "p-3 rounded-lg border text-center transition-colors",
                  transferType === type.id
                    ? "border-tiffany-500 bg-tiffany-500/10"
                    : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <type.icon className={cn("h-5 w-5 mx-auto mb-1", type.color)} />
                <span className="text-xs font-medium text-zinc-100">{type.label}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <Input type="number" placeholder="0.00" className="pl-7 bg-zinc-800/50 border-zinc-700" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Select>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {(transferType === "deposit" ? linkedAccounts : investmentAccounts).map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Select>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {(transferType === "withdrawal" ? linkedAccounts : investmentAccounts).map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

function TransactionsTab() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || tx.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800/60"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-zinc-900/50 border-zinc-800/60">
            <Filter className="h-4 w-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(transactionTypes).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <ContentCard noPadding>
        <div className="divide-y divide-zinc-800/60">
          {filteredTransactions.map((tx) => {
            const typeConfig = transactionTypes[tx.type as keyof typeof transactionTypes]
            const TypeIcon = typeConfig.icon
            const isPositive = tx.amount > 0

            return (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                    <TypeIcon className={cn("h-4 w-4", typeConfig.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{tx.description}</p>
                    <p className="text-xs text-zinc-500">{format(new Date(tx.date), "MMM d, yyyy")} · {tx.account}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-semibold", isPositive ? "text-emerald-400" : "text-zinc-100")}>
                    {isPositive ? "+" : ""}{formatCurrency(tx.amount)}
                  </p>
                  <Badge variant="outline" className={cn("text-xs", typeConfig.color)}>{typeConfig.label}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      </ContentCard>
    </div>
  )
}

function TransfersTab() {
  return (
    <div className="space-y-4">
      {/* Pending */}
      {pendingTransfers.length > 0 && (
        <ContentCard className="border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-zinc-100">Pending Transfers</span>
          </div>
          <div className="space-y-2">
            {pendingTransfers.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{formatCurrency(transfer.amount)}</p>
                    <p className="text-xs text-zinc-500">{transfer.from} → {transfer.to}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-amber-400 border-amber-400/30">{transfer.status}</Badge>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {/* Linked Accounts */}
      <ContentCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">Linked Bank Accounts</h3>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Link Account
          </Button>
        </div>
        <div className="space-y-2">
          {linkedAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{account.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{account.type}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">Manage</Button>
            </div>
          ))}
        </div>
      </ContentCard>

      {/* History */}
      <ContentCard>
        <h3 className="text-sm font-semibold text-zinc-100 mb-4">Transfer History</h3>
        <div className="space-y-2">
          {transferHistory.map((transfer) => (
            <div key={transfer.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", transfer.type === "deposit" ? "bg-tiffany-500/10" : "bg-amber-500/10")}>
                  {transfer.type === "deposit" ? (
                    <ArrowDownRight className="h-4 w-4 text-tiffany-500" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{formatCurrency(transfer.amount)}</p>
                  <p className="text-xs text-zinc-500">{transfer.from} → {transfer.to}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">{transfer.status}</Badge>
                <p className="text-xs text-zinc-500 mt-1">{format(new Date(transfer.date), "MMM d, yyyy")}</p>
              </div>
            </div>
          ))}
        </div>
      </ContentCard>
    </div>
  )
}

function CalendarTab() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const startDayOfWeek = monthStart.getDay()
  const paddingDays = Array(startDayOfWeek).fill(null)

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter((event) => isSameDay(new Date(event.date), date))
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <ContentCard className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">{day}</div>
          ))}
          {paddingDays.map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDate(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square p-1 rounded-lg text-sm transition-colors relative",
                  isToday(day) && "ring-1 ring-tiffany-500",
                  isSelected && "bg-tiffany-500/20",
                  !isSameMonth(day, currentMonth) && "text-zinc-600",
                  isSameMonth(day, currentMonth) && "hover:bg-zinc-800/60"
                )}
              >
                <span className={cn("block", isToday(day) && "text-tiffany-500 font-semibold")}>
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={cn("h-1 w-1 rounded-full", eventTypeConfig[event.type as keyof typeof eventTypeConfig]?.color || "bg-zinc-500")}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </ContentCard>

      {/* Events Sidebar */}
      <ContentCard>
        <h3 className="text-sm font-semibold text-zinc-100 mb-4">
          {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Upcoming Events"}
        </h3>
        <div className="space-y-3">
          {(selectedDate ? selectedDateEvents : calendarEvents.slice(0, 5)).map((event) => {
            const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig]
            const Icon = config?.icon || CalendarIcon

            return (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/60">
                <div className={cn("p-2 rounded-lg", config?.color ? `${config.color}/10` : "bg-zinc-800")}>
                  <Icon className={cn("h-4 w-4", config?.color ? config.color.replace("bg-", "text-").replace("-500", "-400") : "text-zinc-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{event.title}</p>
                  <p className="text-xs text-zinc-500">
                    {format(new Date(event.date), "MMM d")}
                    {event.time && ` · ${event.time}`}
                  </p>
                </div>
              </div>
            )
          })}
          {selectedDate && selectedDateEvents.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">No events on this day</p>
          )}
        </div>
      </ContentCard>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

type TabId = "transactions" | "transfers" | "calendar"

export default function ActivityPage() {
  const [activeTab, setActiveTab] = React.useState<TabId>("transactions")

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "transfers", label: "Transfers", count: pendingTransfers.length },
    { id: "calendar", label: "Calendar" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Activity</h1>
          <p className="mt-1 text-sm text-zinc-400">View transactions, transfers, and scheduled events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <NewTransferDialog />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Deposits (YTD)"
          value={formatCurrency(30000)}
          icon={<ArrowDownRight className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Withdrawals (YTD)"
          value={formatCurrency(8500)}
          icon={<ArrowUpRight className="h-4 w-4 text-zinc-400" />}
        />
        <StatCard
          label="Dividends (YTD)"
          value={formatCurrency(14640)}
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Fees (YTD)"
          value={formatCurrency(2450)}
          icon={<CreditCard className="h-4 w-4 text-zinc-400" />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800/60">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "text-tiffany-500"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                    activeTab === tab.id
                      ? "bg-tiffany-500/10 text-tiffany-500"
                      : "bg-zinc-800 text-zinc-400"
                  )}
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-tiffany-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "transactions" && <TransactionsTab />}
      {activeTab === "transfers" && <TransfersTab />}
      {activeTab === "calendar" && <CalendarTab />}
    </div>
  )
}
