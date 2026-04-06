"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Wallet,
  CreditCard,
  Building,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PiggyBank,
  Home,
  Car,
  GraduationCap,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Star,
  Shield,
  Zap,
  Gift,
  ShoppingBag,
  Utensils,
  Car as CarIcon,
  Smartphone,
  Wifi,
  Heart,
  Link2,
  Eye,
  EyeOff,
  Download,
  Calculator,
  Receipt,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import type { LucideIcon } from "lucide-react"
import {
  NetWorthChart,
  SpendingChart,
  CreditScoreChart,
  DebtPayoffChart,
  SpendingDonut,
  CashFlowChart,
  TaxSavingsChart,
  AllocationChart,
} from "@/components/dashboard/charts"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LinkedAccount {
  id: string
  name: string
  institution: string
  type: "checking" | "savings" | "credit" | "investment" | "loan"
  balance: number
  availableCredit?: number
  creditLimit?: number
  lastSync: string
  logo: string
  status: "connected" | "needs_attention" | "disconnected"
}

interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: "debit" | "credit"
  accountId: string
  pending?: boolean
}

interface SpendingCategory {
  name: string
  amount: number
  budget: number
  icon: LucideIcon
  color: string
}

interface CreditCardOffer {
  id: string
  name: string
  issuer: string
  apr: { low: number; high: number }
  introApr?: { rate: number; months: number }
  balanceTransferApr?: { rate: number; months: number }
  annualFee: number
  rewards: string
  signupBonus?: string
  creditScoreRequired: "excellent" | "good" | "fair"
  bestFor: string[]
  features: string[]
}

interface LoanOption {
  id: string
  type: string
  name: string
  provider: string
  apr: { low: number; high: number }
  term: string
  maxAmount: number
  minCreditScore: number
  features: string[]
  bestFor: string
  prequalified: boolean
  estimatedPayment?: number
}

interface PersonalLoan {
  id: string
  name: string
  lender: string
  originalAmount: number
  currentBalance: number
  interestRate: number
  monthlyPayment: number
  nextPaymentDate: string
  remainingPayments: number
  type: "personal" | "auto" | "mortgage" | "student" | "heloc"
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const linkedAccounts: LinkedAccount[] = [
  {
    id: "acc-001",
    name: "Premium Checking",
    institution: "Chase",
    type: "checking",
    balance: 24582.43,
    lastSync: "2024-01-15T10:30:00Z",
    logo: "chase",
    status: "connected",
  },
  {
    id: "acc-002",
    name: "High-Yield Savings",
    institution: "Marcus by Goldman Sachs",
    type: "savings",
    balance: 85000.00,
    lastSync: "2024-01-15T10:30:00Z",
    logo: "marcus",
    status: "connected",
  },
  {
    id: "acc-003",
    name: "Sapphire Reserve",
    institution: "Chase",
    type: "credit",
    balance: -4250.82,
    availableCredit: 25749.18,
    creditLimit: 30000,
    lastSync: "2024-01-15T10:30:00Z",
    logo: "chase",
    status: "connected",
  },
  {
    id: "acc-004",
    name: "Platinum Card",
    institution: "American Express",
    type: "credit",
    balance: -1892.50,
    availableCredit: 23107.50,
    creditLimit: 25000,
    lastSync: "2024-01-15T10:28:00Z",
    logo: "amex",
    status: "connected",
  },
  {
    id: "acc-005",
    name: "Investment Account",
    institution: "Fidelity",
    type: "investment",
    balance: 342580.00,
    lastSync: "2024-01-15T08:00:00Z",
    logo: "fidelity",
    status: "connected",
  },
  {
    id: "acc-006",
    name: "Auto Loan",
    institution: "Capital One",
    type: "loan",
    balance: -18450.00,
    lastSync: "2024-01-15T10:30:00Z",
    logo: "capitalone",
    status: "needs_attention",
  },
]

const recentTransactions: Transaction[] = [
  { id: "tx-001", date: "2024-01-15", description: "Whole Foods Market", category: "Groceries", amount: 127.43, type: "debit", accountId: "acc-003" },
  { id: "tx-002", date: "2024-01-15", description: "Direct Deposit - Employer", category: "Income", amount: 4250.00, type: "credit", accountId: "acc-001" },
  { id: "tx-003", date: "2024-01-14", description: "Netflix Subscription", category: "Entertainment", amount: 15.99, type: "debit", accountId: "acc-003" },
  { id: "tx-004", date: "2024-01-14", description: "Shell Gas Station", category: "Transportation", amount: 58.42, type: "debit", accountId: "acc-004" },
  { id: "tx-005", date: "2024-01-14", description: "Amazon.com", category: "Shopping", amount: 89.99, type: "debit", accountId: "acc-003", pending: true },
  { id: "tx-006", date: "2024-01-13", description: "Starbucks", category: "Dining", amount: 7.85, type: "debit", accountId: "acc-003" },
  { id: "tx-007", date: "2024-01-13", description: "Transfer to Savings", category: "Transfer", amount: 500.00, type: "debit", accountId: "acc-001" },
  { id: "tx-008", date: "2024-01-12", description: "Uber", category: "Transportation", amount: 24.50, type: "debit", accountId: "acc-004" },
  { id: "tx-009", date: "2024-01-12", description: "AT&T Wireless", category: "Utilities", amount: 142.00, type: "debit", accountId: "acc-001" },
  { id: "tx-010", date: "2024-01-11", description: "Chipotle", category: "Dining", amount: 15.45, type: "debit", accountId: "acc-003" },
]

const spendingCategories: SpendingCategory[] = [
  { name: "Housing", amount: 2800, budget: 3000, icon: Home, color: "#14b8a6" },
  { name: "Transportation", amount: 485, budget: 600, icon: CarIcon, color: "#0891b2" },
  { name: "Groceries", amount: 620, budget: 700, icon: ShoppingBag, color: "#10b981" },
  { name: "Dining", amount: 380, budget: 300, icon: Utensils, color: "#f59e0b" },
  { name: "Entertainment", amount: 145, budget: 200, icon: Smartphone, color: "#8b5cf6" },
  { name: "Utilities", amount: 285, budget: 350, icon: Wifi, color: "#06b6d4" },
  { name: "Healthcare", amount: 120, budget: 200, icon: Heart, color: "#ef4444" },
  { name: "Shopping", amount: 425, budget: 400, icon: ShoppingBag, color: "#ec4899" },
]

const personalLoans: PersonalLoan[] = [
  {
    id: "loan-001",
    name: "Home Mortgage",
    lender: "Wells Fargo",
    originalAmount: 450000,
    currentBalance: 385420,
    interestRate: 6.25,
    monthlyPayment: 2771,
    nextPaymentDate: "2024-02-01",
    remainingPayments: 312,
    type: "mortgage",
  },
  {
    id: "loan-002",
    name: "Auto Loan - BMW X5",
    lender: "Capital One",
    originalAmount: 52000,
    currentBalance: 18450,
    interestRate: 4.99,
    monthlyPayment: 892,
    nextPaymentDate: "2024-01-20",
    remainingPayments: 22,
    type: "auto",
  },
  {
    id: "loan-003",
    name: "Student Loan",
    lender: "Federal Student Aid",
    originalAmount: 65000,
    currentBalance: 28500,
    interestRate: 4.5,
    monthlyPayment: 485,
    nextPaymentDate: "2024-01-25",
    remainingPayments: 62,
    type: "student",
  },
]

const creditCardOffers: CreditCardOffer[] = [
  {
    id: "cc-001",
    name: "Chase Sapphire Preferred",
    issuer: "Chase",
    apr: { low: 21.49, high: 28.49 },
    introApr: { rate: 0, months: 12 },
    balanceTransferApr: { rate: 0, months: 12 },
    annualFee: 95,
    rewards: "3X on dining & travel, 1X on everything else",
    signupBonus: "60,000 points after $4,000 spend in 3 months",
    creditScoreRequired: "good",
    bestFor: ["Travel rewards", "Dining rewards"],
    features: ["No foreign transaction fees", "Trip cancellation insurance", "Primary rental car coverage"],
  },
  {
    id: "cc-002",
    name: "Citi Double Cash",
    issuer: "Citi",
    apr: { low: 19.24, high: 29.24 },
    balanceTransferApr: { rate: 0, months: 18 },
    annualFee: 0,
    rewards: "2% cash back (1% when you buy, 1% when you pay)",
    creditScoreRequired: "good",
    bestFor: ["Cash back", "Balance transfers"],
    features: ["No annual fee", "0% intro APR on balance transfers for 18 months", "$0 liability on unauthorized charges"],
  },
  {
    id: "cc-003",
    name: "Discover it Cash Back",
    issuer: "Discover",
    apr: { low: 17.24, high: 28.24 },
    introApr: { rate: 0, months: 15 },
    balanceTransferApr: { rate: 0, months: 15 },
    annualFee: 0,
    rewards: "5% rotating categories, 1% on everything else",
    signupBonus: "Cashback Match - all cash back earned first year doubled",
    creditScoreRequired: "fair",
    bestFor: ["Cash back", "Building credit"],
    features: ["No annual fee", "Free FICO score", "Cash back match first year"],
  },
  {
    id: "cc-004",
    name: "Capital One Venture X",
    issuer: "Capital One",
    apr: { low: 19.99, high: 29.99 },
    annualFee: 395,
    rewards: "2X miles on everything, 10X on hotels/rentals through Capital One Travel",
    signupBonus: "75,000 miles after $4,000 spend in 3 months",
    creditScoreRequired: "excellent",
    bestFor: ["Premium travel", "Lounge access"],
    features: ["$300 annual travel credit", "Priority Pass lounge access", "10,000 anniversary miles"],
  },
  {
    id: "cc-005",
    name: "Blue Cash Preferred",
    issuer: "American Express",
    apr: { low: 19.24, high: 29.99 },
    introApr: { rate: 0, months: 12 },
    balanceTransferApr: { rate: 0, months: 12 },
    annualFee: 95,
    rewards: "6% at supermarkets (up to $6K/yr), 6% streaming, 3% transit & gas",
    signupBonus: "$350 after $3,000 spend in 6 months",
    creditScoreRequired: "good",
    bestFor: ["Groceries", "Streaming services"],
    features: ["Return protection", "Purchase protection", "Extended warranty"],
  },
]

const loanOptions: LoanOption[] = [
  {
    id: "loan-opt-001",
    type: "Personal Loan",
    name: "SoFi Personal Loan",
    provider: "SoFi",
    apr: { low: 8.99, high: 25.81 },
    term: "2-7 years",
    maxAmount: 100000,
    minCreditScore: 680,
    features: ["No fees", "Unemployment protection", "Rate discount with autopay"],
    bestFor: "Debt consolidation",
    prequalified: true,
    estimatedPayment: 485,
  },
  {
    id: "loan-opt-002",
    type: "Personal Loan",
    name: "LightStream Personal Loan",
    provider: "LightStream",
    apr: { low: 7.49, high: 25.49 },
    term: "2-12 years",
    maxAmount: 100000,
    minCreditScore: 660,
    features: ["Same-day funding", "No fees", "Rate beat program"],
    bestFor: "Excellent credit borrowers",
    prequalified: true,
    estimatedPayment: 442,
  },
  {
    id: "loan-opt-003",
    type: "Home Equity Line",
    name: "HELOC",
    provider: "Multiple Lenders",
    apr: { low: 8.50, high: 11.50 },
    term: "10-20 years",
    maxAmount: 250000,
    minCreditScore: 620,
    features: ["Tax-deductible interest", "Draw period flexibility", "Lower rates than personal loans"],
    bestFor: "Home improvements, debt consolidation",
    prequalified: true,
    estimatedPayment: 875,
  },
  {
    id: "loan-opt-004",
    type: "Auto Refinance",
    name: "Auto Refi",
    provider: "Capital One",
    apr: { low: 5.99, high: 12.99 },
    term: "2-6 years",
    maxAmount: 75000,
    minCreditScore: 640,
    features: ["No application fee", "Rate discount with autopay", "Skip-a-payment option"],
    bestFor: "Lowering current auto loan rate",
    prequalified: true,
    estimatedPayment: 425,
  },
  {
    id: "loan-opt-005",
    type: "Student Loan Refi",
    name: "Student Loan Refinance",
    provider: "Earnest",
    apr: { low: 4.99, high: 14.24 },
    term: "5-20 years",
    maxAmount: 500000,
    minCreditScore: 650,
    features: ["Skip one payment per year", "No fees", "Precision pricing"],
    bestFor: "Federal and private loan refinancing",
    prequalified: false,
    estimatedPayment: 320,
  },
  {
    id: "loan-opt-006",
    type: "Business Loan",
    name: "Small Business Loan",
    provider: "Kabbage by Amex",
    apr: { low: 9.00, high: 36.00 },
    term: "6-18 months",
    maxAmount: 250000,
    minCreditScore: 640,
    features: ["Fast approval", "Flexible draws", "No prepayment penalty"],
    bestFor: "Working capital, business growth",
    prequalified: false,
  },
]

const netWorthData = {
  assets: {
    cash: 109582.43,
    investments: 342580.00,
    retirement: 185000.00,
    realEstate: 520000.00,
    vehicles: 38000.00,
    other: 25000.00,
  },
  liabilities: {
    mortgage: 385420.00,
    autoLoan: 18450.00,
    studentLoans: 28500.00,
    creditCards: 6143.32,
  },
}

// Chart data for analytics
const netWorthChartData = [
  { month: "Jan", assets: 1180000, liabilities: 445000, netWorth: 735000 },
  { month: "Feb", assets: 1195000, liabilities: 442000, netWorth: 753000 },
  { month: "Mar", assets: 1188000, liabilities: 440000, netWorth: 748000 },
  { month: "Apr", assets: 1210000, liabilities: 438000, netWorth: 772000 },
  { month: "May", assets: 1225000, liabilities: 436000, netWorth: 789000 },
  { month: "Jun", assets: 1240000, liabilities: 434000, netWorth: 806000 },
  { month: "Jul", assets: 1255000, liabilities: 432000, netWorth: 823000 },
  { month: "Aug", assets: 1248000, liabilities: 430000, netWorth: 818000 },
  { month: "Sep", assets: 1275000, liabilities: 428000, netWorth: 847000 },
  { month: "Oct", assets: 1295000, liabilities: 426000, netWorth: 869000 },
  { month: "Nov", assets: 1310000, liabilities: 424000, netWorth: 886000 },
  { month: "Dec", assets: 1320162, liabilities: 438513, netWorth: 881649 },
]

const monthlySpendingChartData = [
  { month: "Jul", spending: 4850, budget: 5750, income: 8500 },
  { month: "Aug", spending: 5120, budget: 5750, income: 8500 },
  { month: "Sep", spending: 4680, budget: 5750, income: 8500 },
  { month: "Oct", spending: 5340, budget: 5750, income: 9200 },
  { month: "Nov", spending: 5890, budget: 5750, income: 8500 },
  { month: "Dec", spending: 6250, budget: 5750, income: 12800 },
]

const creditScoreHistory = [
  { month: "Jan", score: 745 },
  { month: "Feb", score: 748 },
  { month: "Mar", score: 752 },
  { month: "Apr", score: 755 },
  { month: "May", score: 760 },
  { month: "Jun", score: 762 },
  { month: "Jul", score: 768 },
  { month: "Aug", score: 770 },
  { month: "Sep", score: 774 },
  { month: "Oct", score: 776 },
  { month: "Nov", score: 780 },
  { month: "Dec", score: 782 },
]

const debtPayoffProjection = [
  { month: "Jan '24", balance: 438513, paid: 0, interest: 0 },
  { month: "Jul '24", balance: 420000, paid: 18513, interest: 8200 },
  { month: "Jan '25", balance: 398000, paid: 40513, interest: 15800 },
  { month: "Jul '25", balance: 375000, paid: 63513, interest: 22400 },
  { month: "Jan '26", balance: 350000, paid: 88513, interest: 28200 },
  { month: "Jul '26", balance: 322000, paid: 116513, interest: 33400 },
  { month: "Jan '27", balance: 292000, paid: 146513, interest: 38000 },
  { month: "Jul '27", balance: 260000, paid: 178513, interest: 42000 },
]

const cashFlowMonthly = [
  { month: "Jul", inflow: 8500, outflow: 6850, net: 1650 },
  { month: "Aug", inflow: 8500, outflow: 7120, net: 1380 },
  { month: "Sep", inflow: 8500, outflow: 6680, net: 1820 },
  { month: "Oct", inflow: 9200, outflow: 7340, net: 1860 },
  { month: "Nov", inflow: 8500, outflow: 7890, net: 610 },
  { month: "Dec", inflow: 12800, outflow: 8250, net: 4550 },
]

const spendingDonutData = [
  { name: "Housing", value: 2800, color: "#14b8a6" },
  { name: "Transport", value: 485, color: "#0891b2" },
  { name: "Groceries", value: 620, color: "#10b981" },
  { name: "Dining", value: 380, color: "#f59e0b" },
  { name: "Entertainment", value: 145, color: "#8b5cf6" },
  { name: "Utilities", value: 285, color: "#06b6d4" },
  { name: "Healthcare", value: 120, color: "#ef4444" },
  { name: "Shopping", value: 425, color: "#ec4899" },
]

// Tax Deductions Data
const taxSavingsData = [
  { category: "Retirement (SEP/IRA)", claimed: 72500, potential: 76500 },
  { category: "Business Expenses", claimed: 54000, potential: 62000 },
  { category: "QBI Deduction", claimed: 0, potential: 42000 },
  { category: "Section 179", claimed: 0, potential: 45000 },
  { category: "Home/Vehicle", claimed: 9540, potential: 12000 },
  { category: "Personal (SALT/Med)", claimed: 22500, potential: 25700 },
]

const deductionAllocationData = [
  { name: "Retirement", value: 72500, color: "#14b8a6" },
  { name: "Professional Services", value: 24000, color: "#06b6d4" },
  { name: "Health Insurance", value: 18000, color: "#8b5cf6" },
  { name: "Business Travel", value: 15200, color: "#f59e0b" },
  { name: "Mortgage Interest", value: 12450, color: "#10b981" },
  { name: "Other", value: 36850, color: "#ec4899" },
]

interface TaxDeductible {
  id: string
  name: string
  category: string
  description: string
  maxDeduction?: number
  status: "eligible" | "claimed" | "ineligible"
  estimatedSavings?: number
}

const taxDeductibles: TaxDeductible[] = [
  { id: "1", name: "SEP-IRA Contributions", category: "Retirement", description: "Up to 25% of net self-employment income", maxDeduction: 66000, status: "claimed", estimatedSavings: 66000 },
  { id: "2", name: "Professional Services", category: "Business", description: "Legal, accounting, and consulting fees", status: "claimed", estimatedSavings: 24000 },
  { id: "3", name: "Self-Employed Health Insurance", category: "Healthcare", description: "100% of premiums deductible", status: "claimed", estimatedSavings: 18000 },
  { id: "4", name: "Business Travel", category: "Business", description: "Airfare, lodging, and 50% of meals", status: "claimed", estimatedSavings: 15200 },
  { id: "5", name: "Mortgage Interest", category: "Personal", description: "Interest on up to $750,000 loan", status: "claimed", estimatedSavings: 12450 },
  { id: "6", name: "SALT Deduction", category: "Personal", description: "State and local taxes (capped at $10,000)", maxDeduction: 10000, status: "claimed", estimatedSavings: 10000 },
  { id: "7", name: "Vehicle Expenses", category: "Business", description: "Standard mileage rate (67¢/mile)", status: "claimed", estimatedSavings: 8040 },
  { id: "8", name: "Qualified Business Income", category: "Business", description: "20% deduction on pass-through income", status: "eligible", estimatedSavings: 42000 },
  { id: "9", name: "Section 179 Equipment", category: "Business", description: "Immediate expensing of equipment", maxDeduction: 1160000, status: "eligible", estimatedSavings: 45000 },
  { id: "10", name: "IRA Contributions", category: "Retirement", description: "Traditional IRA contribution", maxDeduction: 7000, status: "claimed", estimatedSavings: 6500 },
]

const taxStatusConfig = {
  eligible: { label: "Eligible", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  claimed: { label: "Claimed", color: "text-tiffany-500", bg: "bg-tiffany-500/10" },
  ineligible: { label: "Ineligible", color: "text-zinc-400", bg: "bg-zinc-400/10" },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

function AccountCard({ account }: { account: LinkedAccount }) {
  const [showBalance, setShowBalance] = React.useState(true)

  const typeConfig = {
    checking: { icon: Wallet, color: "text-blue-400", bg: "bg-blue-400/10" },
    savings: { icon: PiggyBank, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    credit: { icon: CreditCard, color: "text-purple-400", bg: "bg-purple-400/10" },
    investment: { icon: TrendingUp, color: "text-tiffany-500", bg: "bg-tiffany-500/10" },
    loan: { icon: Building, color: "text-amber-400", bg: "bg-amber-400/10" },
  }

  const config = typeConfig[account.type]
  const Icon = config.icon
  const isDebt = account.balance < 0

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div>
              <p className="font-medium text-zinc-100 text-sm">{account.name}</p>
              <p className="text-xs text-zinc-500">{account.institution}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {account.status === "needs_attention" && (
              <AlertCircle className="h-4 w-4 text-amber-400" />
            )}
            <button onClick={() => setShowBalance(!showBalance)} className="p-1 hover:bg-zinc-800 rounded">
              {showBalance ? <Eye className="h-4 w-4 text-zinc-500" /> : <EyeOff className="h-4 w-4 text-zinc-500" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-xs text-zinc-500">
              {account.type === "credit" ? "Current Balance" : "Balance"}
            </span>
            <span className={cn("text-lg font-semibold", isDebt ? "text-red-400" : "text-zinc-100")}>
              {showBalance ? formatCurrency(Math.abs(account.balance)) : "••••••"}
            </span>
          </div>

          {account.type === "credit" && account.creditLimit && (
            <>
              <Progress
                value={((account.creditLimit - (account.availableCredit || 0)) / account.creditLimit) * 100}
                className="h-1.5"
              />
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Available</span>
                <span className="text-zinc-400">
                  {showBalance ? formatCurrency(account.availableCredit || 0) : "••••••"}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Synced {new Date(account.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CreditCardOfferCard({ offer }: { offer: CreditCardOffer }) {
  const scoreColors = {
    excellent: "text-emerald-400 bg-emerald-400/10",
    good: "text-tiffany-500 bg-tiffany-500/10",
    fair: "text-amber-400 bg-amber-400/10",
  }

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-zinc-100">{offer.name}</h4>
            <p className="text-xs text-zinc-500">{offer.issuer}</p>
          </div>
          <Badge className={cn("text-xs", scoreColors[offer.creditScoreRequired])}>
            {offer.creditScoreRequired.charAt(0).toUpperCase() + offer.creditScoreRequired.slice(1)} Credit
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-xs text-zinc-500">APR</p>
            <p className="text-sm font-medium text-zinc-100">
              {offer.apr.low}% - {offer.apr.high}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-xs text-zinc-500">Annual Fee</p>
            <p className="text-sm font-medium text-zinc-100">
              {offer.annualFee === 0 ? "$0" : formatCurrency(offer.annualFee)}
            </p>
          </div>
        </div>

        {(offer.introApr || offer.balanceTransferApr) && (
          <div className="p-3 rounded-lg bg-tiffany-500/5 border border-tiffany-500/20 mb-3">
            {offer.introApr && (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-tiffany-500" />
                <span className="text-zinc-300">
                  <span className="text-tiffany-500 font-medium">{offer.introApr.rate}% intro APR</span> for {offer.introApr.months} months
                </span>
              </div>
            )}
            {offer.balanceTransferApr && (
              <div className="flex items-center gap-2 text-sm mt-1">
                <RefreshCw className="h-4 w-4 text-tiffany-500" />
                <span className="text-zinc-300">
                  <span className="text-tiffany-500 font-medium">{offer.balanceTransferApr.rate}% balance transfer</span> for {offer.balanceTransferApr.months} months
                </span>
              </div>
            )}
          </div>
        )}

        <p className="text-sm text-zinc-400 mb-3">{offer.rewards}</p>

        {offer.signupBonus && (
          <div className="flex items-center gap-2 text-sm text-amber-400 mb-3">
            <Gift className="h-4 w-4" />
            <span>{offer.signupBonus}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {offer.bestFor.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <Button className="w-full" size="sm">
          Apply Now
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}

function LoanOptionCard({ loan }: { loan: LoanOption }) {
  return (
    <Card className={cn("hover:border-zinc-700 transition-colors", loan.prequalified && "border-tiffany-500/30")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-zinc-100">{loan.type}</h4>
              {loan.prequalified && (
                <Badge variant="default" className="text-xs bg-tiffany-500/20 text-tiffany-500">
                  Pre-qualified
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500">{loan.provider}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-xs text-zinc-500">APR Range</p>
            <p className="text-sm font-medium text-zinc-100">
              {loan.apr.low}% - {loan.apr.high}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-xs text-zinc-500">Loan Term</p>
            <p className="text-sm font-medium text-zinc-100">{loan.term}</p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-xs text-zinc-500">Max Amount</p>
            <p className="text-sm font-medium text-zinc-100">{formatCurrency(loan.maxAmount)}</p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-xs text-zinc-500">Min Credit Score</p>
            <p className="text-sm font-medium text-zinc-100">{loan.minCreditScore}</p>
          </div>
        </div>

        {loan.estimatedPayment && (
          <div className="p-3 rounded-lg bg-tiffany-500/5 border border-tiffany-500/20 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Est. Monthly Payment</span>
              <span className="text-lg font-semibold text-tiffany-500">
                {formatCurrency(loan.estimatedPayment)}/mo
              </span>
            </div>
          </div>
        )}

        <p className="text-sm text-zinc-400 mb-3">Best for: {loan.bestFor}</p>

        <ul className="space-y-1 mb-3">
          {loan.features.slice(0, 3).map((feature, i) => (
            <li key={i} className="text-xs text-zinc-400 flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-tiffany-500" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Details
          </Button>
          <Button size="sm" className="flex-1">
            Check Rate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const reducedMotion = useReducedMotion()
  const [activeTab, setActiveTab] = React.useState("overview")

  // Calculate totals
  const totalAssets = Object.values(netWorthData.assets).reduce((a, b) => a + b, 0)
  const totalLiabilities = Object.values(netWorthData.liabilities).reduce((a, b) => a + b, 0)
  const netWorth = totalAssets - totalLiabilities
  const totalMonthlySpending = spendingCategories.reduce((a, b) => a + b.amount, 0)
  const totalBudget = spendingCategories.reduce((a, b) => a + b.budget, 0)
  const totalDebt = personalLoans.reduce((a, b) => a + b.currentBalance, 0)
  const totalMonthlyPayments = personalLoans.reduce((a, b) => a + b.monthlyPayment, 0)

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
          <h1 className="text-2xl font-bold text-zinc-100">Personal Finances</h1>
          <p className="text-zinc-400 mt-1">
            Track spending, manage loans, and discover opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Link2 className="h-4 w-4 mr-2" />
            Link Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Net Worth</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-100">{formatCurrency(netWorth)}</p>
            <p className="text-xs text-emerald-400 mt-1">+$12,450 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Monthly Spending</span>
              <Wallet className="h-4 w-4 text-tiffany-500" />
            </div>
            <p className="text-2xl font-bold text-zinc-100">{formatCurrency(totalMonthlySpending)}</p>
            <p className="text-xs text-zinc-500 mt-1">of {formatCurrency(totalBudget)} budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Total Debt</span>
              <CreditCard className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-100">{formatCurrency(totalDebt)}</p>
            <p className="text-xs text-zinc-500 mt-1">{formatCurrency(totalMonthlyPayments)}/mo payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Credit Score</span>
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-100">782</p>
            <p className="text-xs text-emerald-400 mt-1">Excellent (+8 this month)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Linked Accounts</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="loans">My Loans</TabsTrigger>
          <TabsTrigger value="credit-cards">Credit Cards</TabsTrigger>
          <TabsTrigger value="loan-options">Loan Options</TabsTrigger>
          <TabsTrigger value="tax">Tax Deductions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Net Worth & Credit Score Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <NetWorthChart data={netWorthChartData} />
            <CreditScoreChart data={creditScoreHistory} />
          </div>

          {/* Cash Flow & Spending */}
          <div className="grid lg:grid-cols-3 gap-6">
            <CashFlowChart data={cashFlowMonthly} className="lg:col-span-2" />
            <SpendingDonut data={spendingDonutData} total={totalMonthlySpending} />
          </div>

          {/* Net Worth Breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assets</CardTitle>
                <CardDescription>Total: {formatCurrency(totalAssets)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(netWorthData.assets).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm font-medium text-zinc-100">{formatCurrency(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Liabilities</CardTitle>
                <CardDescription>Total: {formatCurrency(totalLiabilities)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(netWorthData.liabilities).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm font-medium text-red-400">{formatCurrency(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.slice(0, 6).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        tx.type === "credit" ? "bg-emerald-400/10" : "bg-zinc-800"
                      )}>
                        {tx.type === "credit" ? (
                          <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{tx.description}</p>
                        <p className="text-xs text-zinc-500">{tx.category} • {tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-medium",
                        tx.type === "credit" ? "text-emerald-400" : "text-zinc-100"
                      )}>
                        {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </p>
                      {tx.pending && <Badge variant="outline" className="text-xs">Pending</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Accounts Tab */}
        <TabsContent value="accounts" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {linkedAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
            <Card className="border-dashed hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[180px]">
                <div className="p-3 rounded-full bg-zinc-800 mb-3">
                  <Plus className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-400">Link New Account</p>
                <p className="text-xs text-zinc-500 mt-1">Connect bank or credit card</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Spending Tab */}
        <TabsContent value="spending" className="mt-6 space-y-6">
          {/* Spending Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <SpendingChart data={monthlySpendingChartData} />
            <SpendingDonut data={spendingDonutData} total={totalMonthlySpending} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Spending by Category</CardTitle>
                <CardDescription>
                  {formatCurrency(totalMonthlySpending)} of {formatCurrency(totalBudget)} budget used
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {spendingCategories.map((category) => {
                  const percentage = (category.amount / category.budget) * 100
                  const isOverBudget = percentage > 100
                  const CategoryIcon = category.icon

                  return (
                    <div key={category.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-4 w-4" style={{ color: category.color }} />
                          <span className="text-sm text-zinc-100">{category.name}</span>
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          isOverBudget ? "text-red-400" : "text-zinc-100"
                        )}>
                          {formatCurrency(category.amount)} / {formatCurrency(category.budget)}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(percentage, 100)}
                        className={cn("h-2", isOverBudget && "[&>div]:bg-red-400")}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.filter(t => t.type === "debit").slice(0, 8).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.description}</TableCell>
                        <TableCell className="text-zinc-400">{tx.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* My Loans Tab */}
        <TabsContent value="loans" className="mt-6 space-y-6">
          {/* Debt Payoff Projection */}
          <DebtPayoffChart data={debtPayoffProjection} />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personalLoans.map((loan) => {
              const progress = ((loan.originalAmount - loan.currentBalance) / loan.originalAmount) * 100
              const typeIcons = {
                mortgage: Home,
                auto: Car,
                student: GraduationCap,
                personal: DollarSign,
                heloc: Home,
              }
              const LoanIcon = typeIcons[loan.type]

              return (
                <Card key={loan.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-800">
                          <LoanIcon className="h-5 w-5 text-tiffany-500" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{loan.name}</p>
                          <p className="text-xs text-zinc-500">{loan.lender}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-500">Balance</span>
                          <span className="font-medium text-zinc-100">{formatCurrency(loan.currentBalance)}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-zinc-500 mt-1">
                          {progress.toFixed(0)}% paid of {formatCurrency(loan.originalAmount)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-zinc-500">Interest Rate</p>
                          <p className="font-medium text-zinc-100">{loan.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Monthly Payment</p>
                          <p className="font-medium text-zinc-100">{formatCurrency(loan.monthlyPayment)}</p>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-zinc-800/50 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Next Payment</span>
                          <span className="text-zinc-100">{new Date(loan.nextPaymentDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-zinc-500">Remaining</span>
                          <span className="text-zinc-100">{loan.remainingPayments} payments</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full mt-3">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loan Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">Next Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personalLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.name}</TableCell>
                      <TableCell className="text-zinc-400">{loan.lender}</TableCell>
                      <TableCell className="text-right">{formatCurrency(loan.currentBalance)}</TableCell>
                      <TableCell className="text-right">{loan.interestRate}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(loan.monthlyPayment)}</TableCell>
                      <TableCell className="text-right">{new Date(loan.nextPaymentDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalDebt)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">{formatCurrency(totalMonthlyPayments)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Card Offers Tab */}
        <TabsContent value="credit-cards" className="mt-6 space-y-6">
          <Card className="border-tiffany-500/20 bg-tiffany-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Star className="h-5 w-5 text-tiffany-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Personalized Recommendations
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Based on your spending patterns and credit score of 782, these cards offer the best value for you.
                  Cards are sorted by potential annual savings.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditCardOffers.map((offer) => (
              <CreditCardOfferCard key={offer.id} offer={offer} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Balance Transfer Opportunities</CardTitle>
              <CardDescription>
                You have {formatCurrency(6143.32)} in credit card debt. Here are cards with 0% intro APR on balance transfers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card</TableHead>
                    <TableHead>Intro APR</TableHead>
                    <TableHead>Intro Period</TableHead>
                    <TableHead>Transfer Fee</TableHead>
                    <TableHead>Potential Savings</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditCardOffers.filter(c => c.balanceTransferApr).map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium">{card.name}</TableCell>
                      <TableCell className="text-tiffany-500">{card.balanceTransferApr?.rate}%</TableCell>
                      <TableCell>{card.balanceTransferApr?.months} months</TableCell>
                      <TableCell>3-5%</TableCell>
                      <TableCell className="text-emerald-400">~{formatCurrency(850)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Apply</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loan Options Tab */}
        <TabsContent value="loan-options" className="mt-6 space-y-6">
          <Card className="border-tiffany-500/20 bg-tiffany-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-tiffany-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Pre-Qualified Loan Options
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Based on your credit profile (782 score) and financial situation, you may qualify for the following loans.
                  Checking rates won&apos;t affect your credit score.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loanOptions.map((loan) => (
              <LoanOptionCard key={loan.id} loan={loan} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loan Comparison</CardTitle>
              <CardDescription>Compare rates and terms across different loan types</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>APR Range</TableHead>
                    <TableHead>Max Amount</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Min Score</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanOptions.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {loan.prequalified && (
                            <Badge variant="default" className="text-xs bg-tiffany-500/20 text-tiffany-500">PQ</Badge>
                          )}
                          <span className="font-medium">{loan.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400">{loan.provider}</TableCell>
                      <TableCell>{loan.apr.low}% - {loan.apr.high}%</TableCell>
                      <TableCell>{formatCurrency(loan.maxAmount)}</TableCell>
                      <TableCell>{loan.term}</TableCell>
                      <TableCell>{loan.minCreditScore}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Check Rate</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Deductions Tab */}
        <TabsContent value="tax" className="mt-6 space-y-6">
          {/* Tax Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Total Potential Savings</span>
                  <DollarSign className="h-4 w-4 text-tiffany-500" />
                </div>
                <p className="text-2xl font-bold text-zinc-100">{formatCurrency(263200)}</p>
                <p className="text-xs text-emerald-400 mt-1">Personal + Business</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Claimed Deductions</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-zinc-100">{formatCurrency(179000)}</p>
                <p className="text-xs text-zinc-500 mt-1">8 of 10 items</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Eligible to Claim</span>
                  <Receipt className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(87000)}</p>
                <p className="text-xs text-zinc-500 mt-1">2 items remaining</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Effective Tax Rate</span>
                  <Calculator className="h-4 w-4 text-tiffany-500" />
                </div>
                <p className="text-2xl font-bold text-zinc-100">24.8%</p>
                <p className="text-xs text-emerald-400 mt-1">-3.2% from standard</p>
              </CardContent>
            </Card>
          </div>

          {/* Tax Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <TaxSavingsChart data={taxSavingsData} className="lg:col-span-2" />
            <AllocationChart
              data={deductionAllocationData}
              title="Deductions by Category"
              description="Distribution of claimed deductions"
            />
          </div>

          {/* Tax Notice */}
          <Card className="border-tiffany-500/20 bg-tiffany-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Calculator className="h-5 w-5 text-tiffany-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-100">Tax Year 2024 Deductions</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Based on current IRS guidelines. Consult with a qualified tax professional before claiming deductions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Deductibles List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax Deductions Tracker</CardTitle>
              <CardDescription>Personal and business deductions for tax year 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deduction</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Max Limit</TableHead>
                    <TableHead className="text-right">Est. Savings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxDeductibles.map((item) => {
                    const status = taxStatusConfig[item.status]
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-zinc-100">{item.name}</p>
                            <p className="text-xs text-zinc-500">{item.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-400">{item.category}</TableCell>
                        <TableCell>
                          {item.maxDeduction ? formatCurrency(item.maxDeduction) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-tiffany-500">
                          {item.estimatedSavings ? formatCurrency(item.estimatedSavings) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", status.bg, status.color)}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2024 Deduction Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Standard Deduction (Single)</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">$14,600</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">SALT Cap</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">$10,000</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">401(k) Limit</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">$23,000</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">IRA Limit</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">$7,000</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">SEP-IRA Limit</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">$69,000</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Business Mileage</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">67¢/mile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </animated.div>
  )
}
