"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  Banknote,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// Transaction types
const transactionTypes = {
  buy: { label: "Buy", icon: ArrowDownRight, color: "text-blue-400", bg: "bg-blue-400/10" },
  sell: { label: "Sell", icon: ArrowUpRight, color: "text-amber-400", bg: "bg-amber-400/10" },
  dividend: { label: "Dividend", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  deposit: { label: "Deposit", icon: ArrowDownRight, color: "text-tiffany-500", bg: "bg-tiffany-500/10" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, color: "text-rose-400", bg: "bg-rose-400/10" },
  transfer: { label: "Transfer", icon: RefreshCw, color: "text-purple-400", bg: "bg-purple-400/10" },
  fee: { label: "Fee", icon: CreditCard, color: "text-zinc-400", bg: "bg-zinc-400/10" },
  interest: { label: "Interest", icon: Banknote, color: "text-emerald-400", bg: "bg-emerald-400/10" },
}

// Mock transactions
const transactions = [
  { id: "1", type: "dividend", description: "Quarterly Dividend - VTI", amount: 1250, date: "2024-01-15", account: "Brokerage", status: "completed" },
  { id: "2", type: "buy", description: "Purchase - Apple Inc. (AAPL)", amount: -15000, shares: 80, price: 187.50, date: "2024-01-12", account: "Brokerage", status: "completed" },
  { id: "3", type: "deposit", description: "Monthly Contribution", amount: 5000, date: "2024-01-10", account: "Retirement IRA", status: "completed" },
  { id: "4", type: "sell", description: "Sale - Tech Growth Fund (TGFX)", amount: 8500, shares: 25, price: 340.00, date: "2024-01-08", account: "Brokerage", status: "completed" },
  { id: "5", type: "fee", description: "Advisory Fee - Q4 2023", amount: -2450, date: "2024-01-05", account: "Brokerage", status: "completed" },
  { id: "6", type: "dividend", description: "Dividend - High-Yield Bond Fund (HYG)", amount: 890, date: "2024-01-03", account: "Brokerage", status: "completed" },
  { id: "7", type: "transfer", description: "Transfer to Savings", amount: -10000, date: "2024-01-02", account: "Brokerage", status: "completed" },
  { id: "8", type: "interest", description: "Interest Payment - Treasury Bills", amount: 425, date: "2023-12-29", account: "Brokerage", status: "completed" },
  { id: "9", type: "buy", description: "Purchase - Vanguard Total Bond (BND)", amount: -25000, shares: 325, price: 76.92, date: "2023-12-28", account: "Retirement IRA", status: "completed" },
  { id: "10", type: "dividend", description: "Year-End Distribution - Private Equity Fund III", amount: 12500, date: "2023-12-22", account: "Brokerage", status: "completed" },
  { id: "11", type: "withdrawal", description: "RMD Distribution", amount: -8500, date: "2023-12-20", account: "Retirement IRA", status: "completed" },
  { id: "12", type: "buy", description: "Purchase - SPDR Gold Trust (GLD)", amount: -12000, shares: 60, price: 200.00, date: "2023-12-15", account: "Brokerage", status: "completed" },
  { id: "13", type: "deposit", description: "Year-End Bonus Contribution", amount: 25000, date: "2023-12-10", account: "Brokerage", status: "completed" },
  { id: "14", type: "sell", description: "Tax Loss Harvesting - Bond Fund", amount: 18000, shares: 200, price: 90.00, date: "2023-12-05", account: "Brokerage", status: "completed" },
  { id: "15", type: "transfer", description: "Rebalancing Transfer", amount: 0, date: "2023-12-01", account: "Multiple", status: "completed" },
]

export default function ClientTransactionsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [accountFilter, setAccountFilter] = React.useState("all")
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10
  const reducedMotion = useReducedMotion()

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || tx.type === typeFilter
    const matchesAccount = accountFilter === "all" || tx.account === accountFilter
    return matchesSearch && matchesType && matchesAccount
  })

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Summary calculations
  const summary = React.useMemo(() => {
    const deposits = transactions.filter(t => t.type === "deposit").reduce((sum, t) => sum + t.amount, 0)
    const withdrawals = Math.abs(transactions.filter(t => t.type === "withdrawal").reduce((sum, t) => sum + t.amount, 0))
    const dividends = transactions.filter(t => t.type === "dividend" || t.type === "interest").reduce((sum, t) => sum + t.amount, 0)
    const fees = Math.abs(transactions.filter(t => t.type === "fee").reduce((sum, t) => sum + t.amount, 0))
    return { deposits, withdrawals, dividends, fees }
  }, [])

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
          <h1 className="text-2xl font-bold text-zinc-100">Transaction History</h1>
          <p className="text-zinc-400 mt-1">
            View all your account activity and transactions
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-tiffany-500/10">
                <ArrowDownRight className="h-5 w-5 text-tiffany-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Deposits (YTD)</p>
                <p className="text-xl font-bold text-zinc-100">{formatCurrency(summary.deposits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-400/10">
                <ArrowUpRight className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Withdrawals (YTD)</p>
                <p className="text-xl font-bold text-zinc-100">{formatCurrency(summary.withdrawals)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-400/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Dividends (YTD)</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.dividends)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-400/10">
                <CreditCard className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Fees (YTD)</p>
                <p className="text-xl font-bold text-zinc-100">{formatCurrency(summary.fees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(transactionTypes).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="Brokerage">Brokerage</SelectItem>
                <SelectItem value="Retirement IRA">Retirement IRA</SelectItem>
                <SelectItem value="Multiple">Multiple</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
          <CardDescription>
            Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paginatedTransactions.map((tx) => {
              const typeConfig = transactionTypes[tx.type as keyof typeof transactionTypes]
              const TypeIcon = typeConfig.icon
              const isPositive = tx.amount > 0

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                      <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">{tx.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>{format(new Date(tx.date), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span>{tx.account}</span>
                        {tx.shares && (
                          <>
                            <span>•</span>
                            <span>{tx.shares} shares @ {formatCurrency(tx.price!)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={cn(
                      "font-semibold",
                      tx.amount === 0 ? "text-zinc-400" : isPositive ? "text-emerald-400" : "text-zinc-100"
                    )}>
                      {tx.amount === 0 ? "—" : (isPositive ? "+" : "") + formatCurrency(tx.amount)}
                    </p>
                    <Badge variant="outline" className={cn("text-xs mt-1", typeConfig.color)}>
                      {typeConfig.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </animated.div>
  )
}
