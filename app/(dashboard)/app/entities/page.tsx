"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Building2,
  Users,
  Briefcase,
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  FileText,
  MapPin,
  Download,
  Loader2,
  AlertCircle,
  User,
  Landmark,
  Filter,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatCurrency } from "@/lib/utils"
import { ContentCard, StatCard, PageHeader } from "@/components/dashboard/content-card"
import {
  useEntities,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
} from "@/lib/hooks/crud/use-entities"
import { useClients } from "@/lib/hooks/crud/use-clients"
import { EntityFormDialog } from "@/components/forms/entity-form-dialog"
import type { CreateEntityInput } from "@/lib/validations/entity.schema"

const entityTypeConfig = {
  personal: {
    label: "Personal",
    fullLabel: "Personal Account",
    icon: User,
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
  },
  llc: {
    label: "LLC",
    fullLabel: "Limited Liability Company",
    icon: Building2,
    color: "text-tiffany-500",
    bg: "bg-tiffany-500/10",
  },
  trust: {
    label: "Trust",
    fullLabel: "Trust",
    icon: Shield,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  corporation: {
    label: "Corp",
    fullLabel: "Corporation",
    icon: Briefcase,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  partnership: {
    label: "LP",
    fullLabel: "Limited Partnership",
    icon: Users,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  foundation: {
    label: "Foundation",
    fullLabel: "Foundation",
    icon: Landmark,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
} as const

type EntityType = keyof typeof entityTypeConfig

interface EntityRecord {
  id: string
  clientId: string
  name: string
  entityType: EntityType
  jurisdiction: string | null
  formationDate: string | null
  taxId: string | null
  createdAt: string
  assetCount: number
  totalValue: number
}

function EntityCard({
  entity,
  onClick,
  onEdit,
  onDelete,
}: {
  entity: EntityRecord
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const typeConfig = entityTypeConfig[entity.entityType] ?? entityTypeConfig.llc
  const TypeIcon = typeConfig.icon

  return (
    <Card
      className="group cursor-pointer hover:border-zinc-700 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
              <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
            </div>
            <div>
              <p className="font-medium text-zinc-100">{entity.name}</p>
              <p className="text-xs text-zinc-500">{typeConfig.fullLabel}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                Edit Entity
              </DropdownMenuItem>
              <DropdownMenuItem>View Documents</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="text-rose-400 focus:text-rose-400"
                onClick={(e) => { e.stopPropagation(); onDelete() }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500">Total Assets</p>
            <p className="text-lg font-semibold text-tiffany-500">
              {formatCurrency(entity.totalValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Holdings</p>
            <p className="text-lg font-semibold text-zinc-100">
              {entity.assetCount} asset{entity.assetCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {entity.jurisdiction && (
              <>
                <MapPin className="h-3 w-3" />
                <span>{entity.jurisdiction}</span>
              </>
            )}
          </div>
          <Badge className={cn(typeConfig.bg, typeConfig.color, "border-0")}>
            {typeConfig.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function EntityDetailDrawer({
  entity,
  open,
  onClose,
  onEdit,
}: {
  entity: EntityRecord | null
  open: boolean
  onClose: () => void
  onEdit: (entity: EntityRecord) => void
}) {
  if (!entity) return null

  const typeConfig = entityTypeConfig[entity.entityType] ?? entityTypeConfig.llc
  const TypeIcon = typeConfig.icon

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg", typeConfig.bg)}>
              <TypeIcon className={cn("h-6 w-6", typeConfig.color)} />
            </div>
            <div>
              <DialogTitle>{entity.name}</DialogTitle>
              <DialogDescription>{typeConfig.fullLabel}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Total Assets</p>
              <p className="text-2xl font-bold text-tiffany-500 mt-1">
                {formatCurrency(entity.totalValue)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Holdings</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">
                {entity.assetCount}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {entity.formationDate && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Formation Date</span>
                <span className="text-zinc-100">
                  {format(new Date(entity.formationDate), "MMMM d, yyyy")}
                </span>
              </div>
            )}
            {entity.jurisdiction && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Jurisdiction</span>
                <span className="text-zinc-100">{entity.jurisdiction}</span>
              </div>
            )}
            {entity.taxId && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Tax ID (EIN)</span>
                <span className="text-zinc-100 font-mono">{entity.taxId}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Created</span>
              <span className="text-zinc-100">
                {format(new Date(entity.createdAt), "MMMM yyyy")}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => { onClose(); onEdit(entity) }}>
              Edit Entity
            </Button>
            <Button variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteEntityDialog({
  entity,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  entity: EntityRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete entity?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-semibold text-zinc-100">
              {entity?.name}
            </span>{" "}
            and all associated assets and data. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-zinc-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function EntitiesPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [selectedEntity, setSelectedEntity] = React.useState<EntityRecord | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create")
  const [editingEntity, setEditingEntity] = React.useState<EntityRecord | undefined>()
  const [deleteTarget, setDeleteTarget] = React.useState<EntityRecord | null>(null)

  const { entities, isLoading, isError, stats } = useEntities()
  const createMutation = useCreateEntity()
  const updateMutation = useUpdateEntity()
  const deleteMutation = useDeleteEntity()
  const { clients } = useClients()

  const filteredEntities = (entities as EntityRecord[]).filter((entity) => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || entity.entityType === typeFilter
    return matchesSearch && matchesType
  })

  const totalValue = filteredEntities.reduce((sum, e) => sum + (e.totalValue ?? 0), 0)

  function handleAddEntity() {
    setFormMode("create")
    setEditingEntity(undefined)
    setFormOpen(true)
  }

  function handleEditEntity(entity: EntityRecord) {
    setFormMode("edit")
    setEditingEntity(entity)
    setFormOpen(true)
  }

  function handleFormSubmit(data: CreateEntityInput) {
    if (formMode === "create") {
      createMutation.mutate(data)
    } else if (editingEntity) {
      const { clientId: _, ...updateData } = data
      updateMutation.mutate({ id: editingEntity.id, input: updateData })
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <p>Failed to load entities. Please refresh.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entities"
        description={`${filteredEntities.length} entities · ${formatCurrency(totalValue)} total value`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={handleAddEntity}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Entities"
          value={stats.total}
          icon={<Building2 className="h-4 w-4 text-tiffany-500" />}
        />
        <StatCard
          label="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon={<Briefcase className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Trusts"
          value={stats.byType?.trust ?? 0}
          icon={<Shield className="h-4 w-4 text-purple-400" />}
        />
        <StatCard
          label="LLCs"
          value={stats.byType?.llc ?? 0}
          icon={<Building2 className="h-4 w-4 text-tiffany-500" />}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search entities…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800/60"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-zinc-900/50 border-zinc-800/60">
            <Filter className="h-4 w-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(entityTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading entities…
        </div>
      ) : filteredEntities.length === 0 ? (
        <ContentCard>
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-500">
            <Building2 className="h-8 w-8" />
            <p className="text-sm">
              {searchQuery || typeFilter !== "all"
                ? "No entities match your filters"
                : "No entities yet — add your first one"}
            </p>
            {!searchQuery && typeFilter === "all" && (
              <Button size="sm" variant="outline" onClick={handleAddEntity}>
                <Plus className="h-4 w-4 mr-1" /> Add Entity
              </Button>
            )}
          </div>
        </ContentCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((entity) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              onClick={() => setSelectedEntity(entity)}
              onEdit={() => handleEditEntity(entity)}
              onDelete={() => setDeleteTarget(entity)}
            />
          ))}
        </div>
      )}

      <EntityDetailDrawer
        entity={selectedEntity}
        open={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onEdit={handleEditEntity}
      />

      <EntityFormDialog
        mode={formMode}
        initialData={editingEntity}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        clients={clients.map((c: { id: string; displayName: string }) => ({
          id: c.id,
          displayName: c.displayName,
        }))}
      />

      <DeleteEntityDialog
        entity={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
