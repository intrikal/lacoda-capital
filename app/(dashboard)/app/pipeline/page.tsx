"use client"

import * as React from "react"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Building2,
  TrendingUp,
  Briefcase,
  Calendar,
  DollarSign,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { StatCard, PageHeader } from "@/components/dashboard/content-card"
import { pipelineStages } from "@/lib/mock/data"
import { useDeals } from "@/lib/hooks/crud/use-deals"
import { DealFormDialog } from "@/components/forms/deal-form-dialog"
import type { Deal, PipelineStageId } from "@/lib/mock/types"

import type { LucideIcon } from "lucide-react"

const typeIcons: Record<string, LucideIcon> = {
  "Real Estate": Building2,
  "Private Equity": Briefcase,
  "Venture Capital": TrendingUp,
  "Fixed Income": DollarSign,
}

function DealCard({
  deal,
  onClick,
  onEdit,
  onMoveNext,
  onArchive,
}: {
  deal: Deal
  onClick: () => void
  onEdit: () => void
  onMoveNext: () => void
  onArchive: () => void
}) {
  const Icon = typeIcons[deal.type] || Briefcase

  return (
    <div
      onClick={onClick}
      className="group p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg cursor-pointer hover:bg-zinc-800 hover:border-zinc-600 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-zinc-700/50 flex-shrink-0">
            <Icon className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <span className="text-sm font-medium text-zinc-200 truncate">{deal.name}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>Edit Deal</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveNext() }}>Move to Next Stage</DropdownMenuItem>
            <DropdownMenuItem>Add Note</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-400" onClick={(e) => { e.stopPropagation(); onArchive() }}>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-zinc-100">
            {formatCurrency(deal.potentialValue)}
          </span>
          {deal.probability < 100 && (
            <Badge variant="outline" className="text-xs">
              {deal.probability}%
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{deal.assignee.split(" ")[0]}</span>
          </div>
          {deal.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(deal.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500 truncate">{deal.notes}</p>
      </div>
    </div>
  )
}

function DealDetailDialog({
  deal,
  open,
  onClose,
  onEdit,
}: {
  deal: Deal | null
  open: boolean
  onClose: () => void
  onEdit: (deal: Deal) => void
}) {
  if (!deal) return null

  const Icon = typeIcons[deal.type] || Briefcase
  const stage = pipelineStages.find((s) => s.id === deal.stage)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800">
              <Icon className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <DialogTitle>{deal.name}</DialogTitle>
              <DialogDescription>{deal.type}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage?.color }} />
            <span className="text-sm font-medium" style={{ color: stage?.color }}>
              {stage?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Potential Value</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">
                {formatCurrency(deal.potentialValue)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Probability</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{deal.probability}%</p>
              <p className="text-xs text-zinc-500 mt-1">
                Expected: {formatCurrency(deal.potentialValue * deal.probability / 100)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Assigned To</span>
              <span className="text-zinc-100">{deal.assignee}</span>
            </div>
            {deal.dueDate && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Target Date</span>
                <span className="text-zinc-100">
                  {new Date(deal.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Last Activity</span>
              <span className="text-zinc-100">{deal.lastActivity}</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-zinc-400 mb-2">Notes</p>
            <p className="text-sm text-zinc-300">{deal.notes}</p>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => { onEdit(deal); onClose() }}>Edit Deal</Button>
            <Button variant="outline" className="flex-1" onClick={() => { onEdit(deal); onClose() }}>Add Activity</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PipelinePage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedDeal, setSelectedDeal] = React.useState<Deal | null>(null)

  // CRUD hook
  const { deals, addDeal, updateDeal, deleteDeal, moveDealToStage } = useDeals()

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create")
  const [editingDeal, setEditingDeal] = React.useState<Deal | undefined>(undefined)

  // Helpers to open the form dialog
  function openCreateForm() {
    setFormMode("create")
    setEditingDeal(undefined)
    setFormOpen(true)
  }

  function openEditForm(deal: Deal) {
    setFormMode("edit")
    setEditingDeal(deal)
    setFormOpen(true)
  }

  // Compute the next stage for a given deal
  function getNextStageId(currentStageId: PipelineStageId): PipelineStageId | null {
    const currentIndex = pipelineStages.findIndex((s) => s.id === currentStageId)
    if (currentIndex === -1 || currentIndex >= pipelineStages.length - 1) return null
    return pipelineStages[currentIndex + 1].id
  }

  function handleMoveNext(deal: Deal) {
    const nextStageId = getNextStageId(deal.stage)
    if (nextStageId) {
      moveDealToStage(deal.id, nextStageId)
    }
  }

  // Handle form submission for both create and edit
  function handleFormSubmit(data: Parameters<typeof addDeal>[0]) {
    if (formMode === "create") {
      addDeal(data)
    } else if (editingDeal) {
      updateDeal(editingDeal.id, { ...data, lastActivity: "Just now" })
    }
  }

  const filteredDealsByStage = React.useMemo(() => {
    const filtered = deals.filter(
      (deal) =>
        deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.assignee.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return pipelineStages.reduce((acc, stage) => {
      acc[stage.id] = filtered.filter((deal) => deal.stage === stage.id)
      return acc
    }, {} as Record<string, Deal[]>)
  }, [deals, searchQuery])

  const stageTotals = React.useMemo(() => {
    return pipelineStages.reduce((acc, stage) => {
      const stageDeals = filteredDealsByStage[stage.id] || []
      acc[stage.id] = {
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.potentialValue, 0),
        weightedValue: stageDeals.reduce((sum, d) => sum + (d.potentialValue * d.probability) / 100, 0),
      }
      return acc
    }, {} as Record<string, { count: number; value: number; weightedValue: number }>)
  }, [filteredDealsByStage])

  const pipelineSummary = React.useMemo(() => {
    const allDeals = Object.values(filteredDealsByStage).flat()
    return {
      totalDeals: allDeals.length,
      totalValue: allDeals.reduce((sum, d) => sum + d.potentialValue, 0),
      weightedValue: allDeals.reduce((sum, d) => sum + (d.potentialValue * d.probability) / 100, 0),
      activeValue: (filteredDealsByStage.active || []).reduce((sum, d) => sum + d.potentialValue, 0),
    }
  }, [filteredDealsByStage])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investment Pipeline"
        description="Track deals from prospecting to exit"
        actions={
          <Button size="sm" onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Pipeline"
          value={formatCurrency(pipelineSummary.totalValue)}
          subtext={`${pipelineSummary.totalDeals} deals`}
          icon={<DollarSign className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Weighted Value"
          value={formatCurrency(pipelineSummary.weightedValue)}
          subtext="Expected returns"
          icon={<TrendingUp className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Active Investments"
          value={formatCurrency(pipelineSummary.activeValue)}
          subtext={`${stageTotals.active?.count || 0} positions`}
          icon={<Briefcase className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="In Negotiation"
          value={formatCurrency(stageTotals.negotiation?.value || 0)}
          subtext={`${stageTotals.negotiation?.count || 0} deals`}
          icon={<Building2 className="h-4 w-4 text-amber-400" />}
        />
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800/60"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {pipelineStages.map((stage) => {
            const stageDeals = filteredDealsByStage[stage.id] || []
            const totals = stageTotals[stage.id]

            return (
              <div key={stage.id} className="w-72 flex-shrink-0">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="text-sm font-semibold text-zinc-200">{stage.name}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {stageDeals.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{stage.description}</p>
                  {totals && totals.value > 0 && (
                    <p className="text-xs text-zinc-400 mt-1">
                      {formatCurrency(totals.value)}
                      {totals.weightedValue !== totals.value && (
                        <span className="text-zinc-500"> ({formatCurrency(totals.weightedValue)} weighted)</span>
                      )}
                    </p>
                  )}
                </div>

                <div
                  className="space-y-2 min-h-[200px] p-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30"
                  style={{ borderTopColor: stage.color, borderTopWidth: 2 }}
                >
                  {stageDeals.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-xs text-zinc-600">
                      No deals in this stage
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onClick={() => setSelectedDeal(deal)}
                        onEdit={() => openEditForm(deal)}
                        onMoveNext={() => handleMoveNext(deal)}
                        onArchive={() => deleteDeal(deal.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <DealDetailDialog
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onEdit={openEditForm}
      />

      <DealFormDialog
        mode={formMode}
        initialData={editingDeal}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}
