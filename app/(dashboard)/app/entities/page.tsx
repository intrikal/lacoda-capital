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
  Download,
  Loader2,
  AlertCircle,
  User,
  Landmark,
  Filter,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn, formatCurrency } from "@/lib/utils"
import { ContentCard, StatCard, PageHeader } from "@/components/dashboard/content-card"
import {
  useEntitiesTree,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
} from "@/lib/hooks/crud/use-entities"
import { useClients } from "@/lib/hooks/crud/use-clients"
import { EntityFormDialog } from "@/components/forms/entity-form-dialog"
import type { EntityTreeNode } from "@/lib/actions/entity.actions"
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

// ─── Tree Node ───────────────────────────────────────────────────────────────

function EntityTreeItem({
  node,
  depth,
  onSelect,
  onEdit,
  onDelete,
}: {
  node: EntityTreeNode
  depth: number
  onSelect: (node: EntityTreeNode) => void
  onEdit: (node: EntityTreeNode) => void
  onDelete: (node: EntityTreeNode) => void
}) {
  const [isOpen, setIsOpen] = React.useState(depth < 2)
  const hasChildren = node.children.length > 0
  const typeConfig = entityTypeConfig[node.entityType as EntityType] ?? entityTypeConfig.llc
  const TypeIcon = typeConfig.icon

  return (
    <div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className="group flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          <div
            className="flex items-center gap-3 flex-1 min-w-0"
            onClick={() => onSelect(node)}
          >
            <div className={cn("p-1.5 rounded-md shrink-0", typeConfig.bg)}>
              <TypeIcon className={cn("h-4 w-4", typeConfig.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-100 truncate">{node.name}</p>
              <p className="text-xs text-zinc-500">
                {node.assetCount} asset{node.assetCount !== 1 ? "s" : ""} · {formatCurrency(node.totalValue)}
              </p>
            </div>
            <Badge className={cn(typeConfig.bg, typeConfig.color, "border-0 text-xs shrink-0")}>
              {typeConfig.label}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={() => onEdit(node)}>Edit Entity</DropdownMenuItem>
              <DropdownMenuItem>View Documents</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="text-rose-400 focus:text-rose-400"
                onClick={() => onDelete(node)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            {node.children.map((child) => (
              <EntityTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

// ─── Detail Drawer ───────────────────────────────────────────────────────────

function EntityDetailDrawer({
  entity,
  open,
  onClose,
  onEdit,
}: {
  entity: EntityTreeNode | null
  open: boolean
  onClose: () => void
  onEdit: (entity: EntityTreeNode) => void
}) {
  if (!entity) return null

  const typeConfig = entityTypeConfig[entity.entityType as EntityType] ?? entityTypeConfig.llc
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
            {entity.children.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Child Entities</span>
                <span className="text-zinc-100">{entity.children.length}</span>
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

// ─── Delete Dialog ───────────────────────────────────────────────────────────

function DeleteEntityDialog({
  entity,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  entity: EntityTreeNode | null
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
            </span>
            {entity && entity.assetCount > 0 && (
              <>
                {" "}and its{" "}
                <span className="font-semibold text-zinc-100">
                  {entity.assetCount} asset{entity.assetCount !== 1 ? "s" : ""}
                </span>
              </>
            )}
            {entity && entity.children.length > 0 && (
              <>
                {" "}and{" "}
                <span className="font-semibold text-zinc-100">
                  {entity.children.length} child entit{entity.children.length !== 1 ? "ies" : "y"}
                </span>
              </>
            )}
            . This cannot be undone.
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

// ─── Pure helpers (defined outside component to avoid forward-reference issues) ─

function matchesFilterFn(
  node: EntityTreeNode,
  searchQuery: string,
  typeFilter: string
): boolean {
  const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase())
  const matchesType = typeFilter === "all" || node.entityType === typeFilter
  const childrenMatch = node.children.some(child => matchesFilterFn(child, searchQuery, typeFilter))
  return (matchesSearch && matchesType) || childrenMatch
}

function filterTreeFn(
  nodes: EntityTreeNode[],
  searchQuery: string,
  typeFilter: string,
  matchesFilter: (node: EntityTreeNode) => boolean
): EntityTreeNode[] {
  if (!searchQuery && typeFilter === "all") return nodes
  return nodes
    .filter(matchesFilter)
    .map((node) => ({
      ...node,
      children: filterTreeFn(node.children, searchQuery, typeFilter, matchesFilter),
    }))
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EntitiesPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [selectedEntity, setSelectedEntity] = React.useState<EntityTreeNode | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create")
  const [editingEntity, setEditingEntity] = React.useState<EntityTreeNode | undefined>()
  const [deleteTarget, setDeleteTarget] = React.useState<EntityTreeNode | null>(null)

  const { tree, allEntities, isLoading, isError, stats, refetch } = useEntitiesTree()
  const createMutation = useCreateEntity()
  const updateMutation = useUpdateEntity()
  const deleteMutation = useDeleteEntity()
  const { clients } = useClients()

  // Filter tree nodes for search/type
  const matchesFilter = React.useCallback(
    (node: EntityTreeNode) => matchesFilterFn(node, searchQuery, typeFilter),
    [searchQuery, typeFilter]
  )

  const filterTree = React.useCallback(
    (nodes: EntityTreeNode[]) => filterTreeFn(nodes, searchQuery, typeFilter, matchesFilter),
    [matchesFilter, searchQuery, typeFilter]
  )

  const filteredTree = React.useMemo(() => filterTree(tree), [filterTree, tree])
  const totalValue = allEntities.reduce((sum, e) => sum + (e.totalValue ?? 0), 0)

  function handleAddEntity() {
    setFormMode("create")
    setEditingEntity(undefined)
    setFormOpen(true)
  }

  function handleEditEntity(entity: EntityTreeNode) {
    setFormMode("edit")
    setEditingEntity(entity)
    setFormOpen(true)
  }

  function handleFormSubmit(data: CreateEntityInput) {
    if (formMode === "create") {
      createMutation.mutate(data, { onSuccess: refetch })
    } else if (editingEntity) {
      const { ...updateData } = data
      updateMutation.mutate({ id: editingEntity.id, input: updateData }, { onSuccess: refetch })
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); refetch() },
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
        description={`${allEntities.length} entities · ${formatCurrency(totalValue)} total value`}
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
      ) : filteredTree.length === 0 ? (
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
        <ContentCard>
          <div className="divide-y divide-zinc-800/50">
            {filteredTree.map((node) => (
              <EntityTreeItem
                key={node.id}
                node={node}
                depth={0}
                onSelect={setSelectedEntity}
                onEdit={handleEditEntity}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </ContentCard>
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
        entities={allEntities.map((e) => ({ id: e.id, name: e.name }))}
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
