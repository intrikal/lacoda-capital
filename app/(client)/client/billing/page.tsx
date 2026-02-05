"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import { format } from "date-fns"
import {
  Download,
  FileText,
  CreditCard,
  DollarSign,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// Fee structure
const feeStructure = {
  advisoryFee: {
    rate: 0.85,
    description: "Annual advisory fee based on assets under management",
    billingFrequency: "Quarterly",
  },
  performanceFee: {
    rate: 0,
    description: "No performance fee on standard accounts",
    billingFrequency: "N/A",
  },
  custodyFee: {
    rate: 0.05,
    description: "Custody and account maintenance fee",
    billingFrequency: "Annually",
  },
}

// Current period details
const currentPeriod = {
  period: "Q1 2024",
  startDate: "2024-01-01",
  endDate: "2024-03-31",
  averageAUM: 2450000,
  calculatedFee: 5206.25,
  dueDate: "2024-04-15",
  status: "upcoming",
}

// Billing history
const billingHistory = [
  { id: "1", period: "Q4 2023", amount: 5102.50, aum: 2420000, date: "2024-01-10", status: "paid", invoiceUrl: "#" },
  { id: "2", period: "Q3 2023", amount: 4975.00, aum: 2350000, date: "2023-10-12", status: "paid", invoiceUrl: "#" },
  { id: "3", period: "Q2 2023", amount: 4850.00, aum: 2280000, date: "2023-07-11", status: "paid", invoiceUrl: "#" },
  { id: "4", period: "Q1 2023", amount: 4712.50, aum: 2220000, date: "2023-04-10", status: "paid", invoiceUrl: "#" },
  { id: "5", period: "Q4 2022", amount: 4575.00, aum: 2150000, date: "2023-01-09", status: "paid", invoiceUrl: "#" },
  { id: "6", period: "Q3 2022", amount: 4437.50, aum: 2090000, date: "2022-10-10", status: "paid", invoiceUrl: "#" },
]

// Fee breakdown for current period
const feeBreakdown = [
  { category: "Advisory Fee", amount: 5206.25, rate: "0.85%", calculation: "$2,450,000 × 0.85% ÷ 4" },
  { category: "Custody Fee", amount: 306.25, rate: "0.05%", calculation: "$2,450,000 × 0.05% ÷ 4" },
  { category: "Trading Costs", amount: 0, rate: "N/A", calculation: "Included in advisory" },
  { category: "Account Maintenance", amount: 0, rate: "N/A", calculation: "Included in custody" },
]

// Annual summary
const annualSummary = {
  year: 2023,
  totalFees: 19640.00,
  averageAUM: 2320000,
  effectiveRate: 0.847,
  savingsVsIndustry: 4820,
}

const statusConfig = {
  paid: { label: "Paid", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  upcoming: { label: "Upcoming", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
  due: { label: "Due", icon: Calendar, color: "text-rose-400", bg: "bg-rose-400/10" },
}

export default function ClientBillingPage() {
  const reducedMotion = useReducedMotion()

  const totalYTDFees = billingHistory
    .filter((b) => b.date.startsWith("2024"))
    .reduce((sum, b) => sum + b.amount, 0)

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
          <h1 className="text-2xl font-bold text-zinc-100">Billing & Fees</h1>
          <p className="text-zinc-400 mt-1">
            View your fee structure and billing history
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Annual Statement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Annual Fee Rate</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">0.85%</p>
                <p className="text-xs text-zinc-500 mt-1">All-in advisory fee</p>
              </div>
              <div className="p-3 rounded-lg bg-tiffany-500/10">
                <DollarSign className="h-6 w-6 text-tiffany-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">YTD Fees Paid</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(totalYTDFees)}</p>
                <p className="text-xs text-zinc-500 mt-1">January - December 2024</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-400/10">
                <CreditCard className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Next Payment</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{formatCurrency(currentPeriod.calculatedFee)}</p>
                <p className="text-xs text-amber-400 mt-1">Due {format(new Date(currentPeriod.dueDate), "MMM d, yyyy")}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-400/10">
                <Calendar className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Fee Structure</CardTitle>
          <CardDescription>Transparent breakdown of all fees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(feeStructure).map(([key, fee]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-zinc-800">
                    <DollarSign className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-100">
                        {key === "advisoryFee" && "Advisory Fee"}
                        {key === "performanceFee" && "Performance Fee"}
                        {key === "custodyFee" && "Custody Fee"}
                      </p>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-zinc-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{fee.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-zinc-500">Billed {fee.billingFrequency}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-zinc-100">
                    {fee.rate > 0 ? `${fee.rate}%` : "—"}
                  </p>
                  <p className="text-xs text-zinc-500">per year</p>
                </div>
              </div>
            ))}
          </div>

          {/* Savings comparison */}
          <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="font-medium text-zinc-100">You're saving money</p>
                  <p className="text-sm text-zinc-400">
                    Your effective rate is 15% below industry average
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-400">
                  {formatCurrency(annualSummary.savingsVsIndustry)}/year
                </p>
                <p className="text-xs text-zinc-500">estimated savings</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Period Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{currentPeriod.period} Fee Breakdown</CardTitle>
              <CardDescription>
                {format(new Date(currentPeriod.startDate), "MMM d")} - {format(new Date(currentPeriod.endDate), "MMM d, yyyy")}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-amber-400">
              Due {format(new Date(currentPeriod.dueDate), "MMM d")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 rounded-lg bg-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Average AUM this period</span>
              <span className="font-semibold text-zinc-100">{formatCurrency(currentPeriod.averageAUM)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {feeBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                <div>
                  <p className="font-medium text-zinc-100">{item.category}</p>
                  <p className="text-xs text-zinc-500">{item.calculation}</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-semibold", item.amount > 0 ? "text-zinc-100" : "text-zinc-500")}>
                    {item.amount > 0 ? formatCurrency(item.amount) : "Included"}
                  </p>
                  <p className="text-xs text-zinc-500">{item.rate}</p>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-3 border-t border-zinc-700">
              <p className="font-semibold text-zinc-100">Total Due</p>
              <p className="text-xl font-bold text-tiffany-500">
                {formatCurrency(feeBreakdown.reduce((sum, f) => sum + f.amount, 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
          <CardDescription>Your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {billingHistory.map((bill) => {
              const status = statusConfig[bill.status as keyof typeof statusConfig]
              const StatusIcon = status.icon

              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-lg", status.bg)}>
                      <StatusIcon className={cn("h-5 w-5", status.color)} />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">{bill.period}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                        <span>AUM: {formatCurrency(bill.aum)}</span>
                        <span>•</span>
                        <span>Processed {format(new Date(bill.date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-zinc-100">{formatCurrency(bill.amount)}</p>
                      <Badge variant="outline" className={cn("text-xs", status.color)}>
                        {status.label}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      Invoice
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Payment Method</CardTitle>
              <CardDescription>How fees are collected</CardDescription>
            </div>
            <Button variant="outline" size="sm">Change Method</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-lg border border-zinc-800">
            <div className="p-3 rounded-lg bg-blue-400/10">
              <CreditCard className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-100">Direct Debit from Brokerage Account</p>
              <p className="text-sm text-zinc-500">
                Fees are automatically deducted from your available cash balance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  )
}
