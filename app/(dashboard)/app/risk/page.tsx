"use client"

import * as React from "react"
import {
  ShieldAlert,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Waves,
  Anchor,
  Info,
  Plus,
  MoreHorizontal,
  Eye,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn, formatCurrency } from "@/lib/utils"

// ─── Mock data — replace with listRiskProfiles() ─────────────────────────────

const RISK_PROFILES = [
  {
    id: "rp1",
    client: "Anderson Family Trust",
    riskTolerance: "moderate",
    alertStatus: "breach",
    investmentHorizon: "10–15 years",
    maxDrawdown: 15,
    alertDrawdown: 12,
    currentDrawdown: 16.4,
    targetVolatility: 10,
    maxVolatility: 14,
    currentVolatility: 12.1,
    hedgeRatio: 25,
    hedgingInstruments: ["S&P 500 Put Options", "Gold ETF"],
    varConfidenceLevel: 95,
    varAmount: 82000,
    varHorizonDays: 1,
    lastReviewedAt: "2024-10-15",
    nextReviewDue: "2025-04-15",
    alertNotes: "Drawdown limit breached following rate spike. Review asset allocation.",
    portfolioValue: 4200000,
  },
  {
    id: "rp2",
    client: "Whitmore Holdings",
    riskTolerance: "aggressive",
    alertStatus: "watch",
    investmentHorizon: "7–10 years",
    maxDrawdown: 25,
    alertDrawdown: 20,
    currentDrawdown: 21.3,
    targetVolatility: 16,
    maxVolatility: 22,
    currentVolatility: 18.4,
    hedgeRatio: 10,
    hedgingInstruments: ["Treasury Bonds"],
    varConfidenceLevel: 99,
    varAmount: 215000,
    varHorizonDays: 1,
    lastReviewedAt: "2024-12-01",
    nextReviewDue: "2025-06-01",
    alertNotes: "Approaching drawdown alert threshold. PE allocation driving volatility.",
    portfolioValue: 8750000,
  },
  {
    id: "rp3",
    client: "Johnson Trust",
    riskTolerance: "conservative",
    alertStatus: "normal",
    investmentHorizon: "3–5 years",
    maxDrawdown: 8,
    alertDrawdown: 6,
    currentDrawdown: 2.1,
    targetVolatility: 5,
    maxVolatility: 8,
    currentVolatility: 4.3,
    hedgeRatio: 40,
    hedgingInstruments: ["U.S. Treasury Bills", "AAA Bond Ladder", "Gold ETF"],
    varConfidenceLevel: 95,
    varAmount: 31000,
    varHorizonDays: 1,
    lastReviewedAt: "2025-01-10",
    nextReviewDue: "2025-07-10",
    alertNotes: null,
    portfolioValue: 2450000,
  },
  {
    id: "rp4",
    client: "Rivera Family Office",
    riskTolerance: "speculative",
    alertStatus: "normal",
    investmentHorizon: "15+ years",
    maxDrawdown: 40,
    alertDrawdown: 30,
    currentDrawdown: 8.5,
    targetVolatility: 24,
    maxVolatility: 35,
    currentVolatility: 19.8,
    hedgeRatio: 5,
    hedgingInstruments: ["Long-dated Calls"],
    varConfidenceLevel: 99,
    varAmount: 480000,
    varHorizonDays: 1,
    lastReviewedAt: "2025-02-01",
    nextReviewDue: "2025-08-01",
    alertNotes: null,
    portfolioValue: 12000000,
  },
]

const TOLERANCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  conservative: { label: "Conservative", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  moderate: { label: "Moderate", color: "text-tiffany-500", bg: "bg-tiffany-500/10" },
  aggressive: { label: "Aggressive", color: "text-orange-400", bg: "bg-orange-500/10" },
  speculative: { label: "Speculative", color: "text-red-400", bg: "bg-red-500/10" },
}

const ALERT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  normal: { label: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  watch: { label: "Watch", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: Eye },
  breach: { label: "Breach", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: AlertTriangle },
  resolved: { label: "Resolved", color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", icon: CheckCircle2 },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RiskManagementPage() {
  const [editOpen, setEditOpen] = React.useState(false)
  const [selectedProfile, setSelectedProfile] = React.useState<typeof RISK_PROFILES[0] | null>(null)

  const breachCount = RISK_PROFILES.filter((p) => p.alertStatus === "breach").length
  const watchCount = RISK_PROFILES.filter((p) => p.alertStatus === "watch").length
  const totalAUM = RISK_PROFILES.reduce((s, p) => s + p.portfolioValue, 0)

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Risk Management</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Drawdown limits, volatility controls, and hedging framework across all client portfolios
          </p>
        </div>
        <Button
          size="sm"
          className="bg-tiffany-500 hover:bg-tiffany-600 text-white"
          onClick={() => { setSelectedProfile(null); setEditOpen(true) }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Profile
        </Button>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────────────────── */}
      <Tabs defaultValue="profiles">
        <div className="flex flex-col lg:grid lg:grid-cols-[220px_1fr] rounded-xl border border-zinc-800/60 overflow-hidden">

          {/* ── Left sticky panel ────────────────────────────────────────── */}
          <aside className="flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-zinc-800/60 lg:sticky lg:top-14 lg:h-[calc(100vh-80px)] lg:overflow-y-auto bg-zinc-900/40">

            {/* Alert status */}
            {(breachCount > 0 || watchCount > 0) && (
              <div className={cn(
                "flex items-start gap-2 p-3 rounded-lg border text-xs",
                breachCount > 0 ? "bg-red-500/5 border-red-500/20" : "bg-yellow-500/5 border-yellow-500/20"
              )}>
                <AlertTriangle className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", breachCount > 0 ? "text-red-400" : "text-yellow-400")} />
                <p className={breachCount > 0 ? "text-red-300" : "text-yellow-300"}>
                  {breachCount > 0
                    ? `${breachCount} portfolio${breachCount > 1 ? "s" : ""} in breach`
                    : `${watchCount} approaching limits`}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Overview</p>
              {[
                { label: "Monitored", value: String(RISK_PROFILES.length), color: "text-tiffany-500", icon: Activity },
                { label: "Breaches", value: String(breachCount), color: breachCount > 0 ? "text-red-400" : "text-emerald-400", icon: AlertTriangle },
                { label: "On Watch", value: String(watchCount), color: watchCount > 0 ? "text-yellow-400" : "text-zinc-400", icon: Eye },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-2">
                    {React.createElement(s.icon, { className: cn("h-3.5 w-3.5", s.color) })}
                    <span className="text-sm text-zinc-400">{s.label}</span>
                  </div>
                  <span className={cn("text-sm font-bold tabular-nums", s.color)}>{s.value}</span>
                </div>
              ))}
              <div className="px-2 pt-1">
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Total AUM</span>
                  <span className="text-zinc-400 font-medium">{formatCurrency(totalAUM)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800/60" />

            {/* Vertical tab nav */}
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">View</p>
              <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-0.5">
                {[
                  { value: "profiles",   label: "Risk Profiles",      icon: ShieldAlert },
                  { value: "drawdown",   label: "Drawdown Limits",    icon: TrendingDown },
                  { value: "volatility", label: "Volatility Controls", icon: Waves },
                  { value: "hedging",    label: "Hedging",             icon: Anchor },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="w-full justify-start px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-tiffany-500/10 data-[state=active]:text-tiffany-500 data-[state=active]:shadow-none"
                  >
                    {React.createElement(tab.icon, { className: "h-3.5 w-3.5 mr-2 shrink-0" })}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </aside>

          {/* ── Right main panel ─────────────────────────────────────────── */}
          <div className="p-5 lg:p-6 min-w-0">

        {/* ── Risk Profiles ──────────────────────────────────────────── */}
        <TabsContent value="profiles" className="mt-0">
          <Card className="bg-zinc-900 border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500">Client</TableHead>
                  <TableHead className="text-zinc-500">Risk Tolerance</TableHead>
                  <TableHead className="text-zinc-500">Portfolio Value</TableHead>
                  <TableHead className="text-zinc-500">Drawdown</TableHead>
                  <TableHead className="text-zinc-500">Volatility</TableHead>
                  <TableHead className="text-zinc-500">VaR (1-day)</TableHead>
                  <TableHead className="text-zinc-500">Next Review</TableHead>
                  <TableHead className="text-zinc-500">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {RISK_PROFILES.map((profile) => {
                  const tc = TOLERANCE_CONFIG[profile.riskTolerance]
                  const ac = ALERT_CONFIG[profile.alertStatus]
                  const drawdownPct = (profile.currentDrawdown / profile.maxDrawdown) * 100

                  return (
                    <TableRow key={profile.id} className="border-zinc-800 hover:bg-zinc-800/40">
                      <TableCell>
                        <p className="text-sm font-medium text-zinc-100">{profile.client}</p>
                        <p className="text-xs text-zinc-500">{profile.investmentHorizon}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs border-0", tc.bg, tc.color)}>
                          {tc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-zinc-300">
                          {formatCurrency(profile.portfolioValue)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[100px]">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={profile.currentDrawdown > profile.maxDrawdown ? "text-red-400 font-semibold" : "text-zinc-300"}>
                              {profile.currentDrawdown}%
                            </span>
                            <span className="text-zinc-600">/ {profile.maxDrawdown}%</span>
                          </div>
                          <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "absolute left-0 top-0 h-full rounded-full",
                                drawdownPct >= 100 ? "bg-red-500" :
                                drawdownPct >= 80 ? "bg-yellow-500" : "bg-tiffany-500"
                              )}
                              style={{ width: `${Math.min(drawdownPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="text-zinc-300">{profile.currentVolatility}%</span>
                          <span className="text-zinc-600"> / {profile.maxVolatility}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-zinc-300">{formatCurrency(profile.varAmount)}</p>
                          <p className="text-xs text-zinc-600">{profile.varConfidenceLevel}% CI</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-400">
                          {new Date(profile.nextReviewDue).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs border gap-1", ac.bg, ac.color, ac.border)}>
                          {React.createElement(ac.icon, { className: "h-3 w-3" })}
                          {ac.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
                          onClick={() => { setSelectedProfile(profile); setEditOpen(true) }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Drawdown Limits ────────────────────────────────────────── */}
        <TabsContent value="drawdown" className="mt-0 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-200 font-medium">Maximum drawdown</span> is the largest peak-to-trough decline a portfolio
              is permitted before triggering a mandatory review. The alert threshold (soft limit) fires a warning before the hard cap is reached.
            </p>
          </div>

          <div className="grid gap-4">
            {RISK_PROFILES.map((p) => {
              const ac = ALERT_CONFIG[p.alertStatus]
              const pct = (p.currentDrawdown / p.maxDrawdown) * 100
              const alertPct = (p.alertDrawdown / p.maxDrawdown) * 100
              return (
                <Card key={p.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-zinc-100">{p.client}</h3>
                        <p className="text-xs text-zinc-500">{formatCurrency(p.portfolioValue)} portfolio value</p>
                      </div>
                      <Badge className={cn("text-xs border gap-1", ac.bg, ac.color, ac.border)}>
                        {React.createElement(ac.icon, { className: "h-3 w-3" })}
                        {ac.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-4">
                      {[
                        { label: "Current Drawdown", value: `${p.currentDrawdown}%`, color: pct >= 100 ? "text-red-400" : pct >= 80 ? "text-yellow-400" : "text-zinc-300" },
                        { label: "Alert Threshold", value: `${p.alertDrawdown}%`, color: "text-yellow-400" },
                        { label: "Hard Limit", value: `${p.maxDrawdown}%`, color: "text-red-400" },
                      ].map((s) => (
                        <div key={s.label}>
                          <p className="text-xs text-zinc-500 mb-0.5">{s.label}</p>
                          <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Drawdown gauge */}
                    <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                      {/* Alert zone */}
                      <div className="absolute top-0 h-full bg-yellow-500/20 rounded-full"
                        style={{ left: 0, width: `${alertPct}%` }} />
                      {/* Current drawdown bar */}
                      <div
                        className={cn("absolute left-0 top-0 h-full rounded-full transition-all",
                          pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-tiffany-500"
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                      {/* Alert marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/60"
                        style={{ left: `${alertPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-600">
                      <span>0%</span>
                      <span className="text-yellow-600">Alert: {p.alertDrawdown}%</span>
                      <span className="text-red-600">Limit: {p.maxDrawdown}%</span>
                    </div>

                    {p.alertNotes && (
                      <div className="mt-3 text-xs text-zinc-400 italic border-l-2 border-zinc-700 pl-3">
                        {p.alertNotes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Volatility Controls ────────────────────────────────────── */}
        <TabsContent value="volatility" className="mt-0 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-200 font-medium">Volatility</span> is the annualized standard deviation of portfolio returns (%).
              Portfolios exceeding their target volatility trigger a rebalancing review.
              Value-at-Risk (VaR) shows the maximum expected 1-day loss at the specified confidence level.
            </p>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500">Client</TableHead>
                  <TableHead className="text-zinc-500">Target Vol.</TableHead>
                  <TableHead className="text-zinc-500">Current Vol.</TableHead>
                  <TableHead className="text-zinc-500">Max Vol.</TableHead>
                  <TableHead className="text-zinc-500">Vol. Utilization</TableHead>
                  <TableHead className="text-zinc-500">VaR Confidence</TableHead>
                  <TableHead className="text-zinc-500">1-day VaR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RISK_PROFILES.map((p) => {
                  const volPct = (p.currentVolatility / p.maxVolatility) * 100
                  return (
                    <TableRow key={p.id} className="border-zinc-800 hover:bg-zinc-800/40">
                      <TableCell>
                        <p className="text-sm font-medium text-zinc-100">{p.client}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-400">{p.targetVolatility}%</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-sm font-semibold",
                          p.currentVolatility > p.maxVolatility ? "text-red-400" :
                          p.currentVolatility > p.targetVolatility ? "text-yellow-400" : "text-emerald-400"
                        )}>
                          {p.currentVolatility}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-400">{p.maxVolatility}%</span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[100px]">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-500">{Math.round(volPct)}%</span>
                          </div>
                          <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "absolute left-0 top-0 h-full rounded-full",
                                volPct >= 100 ? "bg-red-500" :
                                volPct >= 80 ? "bg-yellow-500" : "bg-tiffany-500"
                              )}
                              style={{ width: `${Math.min(volPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-400">{p.varConfidenceLevel}%</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-zinc-300">
                          {formatCurrency(p.varAmount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Hedging ─────────────────────────────────────────────────── */}
        <TabsContent value="hedging" className="mt-0 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-200 font-medium">Hedge ratio</span> is the proportion of portfolio value protected via
              hedging instruments (put options, inverse ETFs, bonds, etc.).
              A ratio of 25% means one-quarter of the portfolio&apos;s downside is offset by hedges.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {RISK_PROFILES.map((p) => {
              const tc = TOLERANCE_CONFIG[p.riskTolerance]
              return (
                <Card key={p.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-zinc-100">{p.client}</h3>
                        <Badge className={cn("mt-1 text-xs border-0", tc.bg, tc.color)}>
                          {tc.label}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-tiffany-500">{p.hedgeRatio}%</p>
                        <p className="text-xs text-zinc-500">hedge ratio</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Unhedged</span>
                        <span>Hedged</span>
                      </div>
                      <div className="relative h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="absolute right-0 top-0 h-full bg-tiffany-500/60 rounded-full"
                          style={{ width: `${p.hedgeRatio}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Hedging instruments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(p.hedgingInstruments as string[]).map((inst) => (
                          <Badge key={inst} variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                            {inst}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-zinc-500">Protected value</p>
                        <p className="text-zinc-300 font-medium mt-0.5">
                          {formatCurrency((p.portfolioValue * p.hedgeRatio) / 100)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Exposed value</p>
                        <p className="text-zinc-300 font-medium mt-0.5">
                          {formatCurrency((p.portfolioValue * (100 - p.hedgeRatio)) / 100)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
          </div>{/* end right panel */}
        </div>{/* end two-panel grid */}
      </Tabs>

      {/* ── Edit / Create Profile Dialog ───────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {selectedProfile ? "Edit Risk Profile" : "New Risk Profile"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!selectedProfile && (
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Client</Label>
                <Select>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="1">Anderson Family Trust</SelectItem>
                    <SelectItem value="2">Whitmore Holdings</SelectItem>
                    <SelectItem value="3">Johnson Trust</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Risk Tolerance</Label>
                <Select defaultValue={selectedProfile?.riskTolerance ?? "moderate"}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="speculative">Speculative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Investment Horizon</Label>
                <Input
                  defaultValue={selectedProfile?.investmentHorizon ?? ""}
                  placeholder="e.g. 5–10 years"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Max Drawdown %</Label>
                <Input
                  type="number"
                  defaultValue={selectedProfile?.maxDrawdown ?? ""}
                  placeholder="e.g. 15"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Alert Drawdown %</Label>
                <Input
                  type="number"
                  defaultValue={selectedProfile?.alertDrawdown ?? ""}
                  placeholder="e.g. 12"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Hedge Ratio %</Label>
                <Input
                  type="number"
                  defaultValue={selectedProfile?.hedgeRatio ?? ""}
                  placeholder="e.g. 25"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Target Volatility %</Label>
                <Input
                  type="number"
                  defaultValue={selectedProfile?.targetVolatility ?? ""}
                  placeholder="e.g. 10"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Max Volatility %</Label>
                <Input
                  type="number"
                  defaultValue={selectedProfile?.maxVolatility ?? ""}
                  placeholder="e.g. 14"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">VaR Confidence %</Label>
                <Select defaultValue={String(selectedProfile?.varConfidenceLevel ?? 95)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="95">95%</SelectItem>
                    <SelectItem value="99">99%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Alert Status</Label>
                <Select defaultValue={selectedProfile?.alertStatus ?? "normal"}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="watch">Watch</SelectItem>
                    <SelectItem value="breach">Breach</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Alert Notes</Label>
              <Textarea
                defaultValue={selectedProfile?.alertNotes ?? ""}
                placeholder="Notes on current alert or review..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-zinc-700 text-zinc-400">
              Cancel
            </Button>
            <Button className="bg-tiffany-500 hover:bg-tiffany-600 text-white" onClick={() => setEditOpen(false)}>
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
