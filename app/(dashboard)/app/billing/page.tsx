/**
 * ============================================================================
 * FILE: app/(dashboard)/app/billing/page.tsx
 * ============================================================================
 *
 * Advisor-facing billing management page. Full CRUD for advisory fee invoices.
 * Displays summary stats, an invoice table with status filters, and
 * create/edit/delete dialogs.
 *
 * ARCHITECTURE:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ BillingPage (this file)                                      │
 *   │   useBillingRecords() → GET_BILLING_RECORDS → /api/graphql   │
 *   │   useClients() → GET_CLIENTS (for form dropdown)             │
 *   │   useCreate/Update/DeleteBillingRecord() → mutations         │
 *   │         ↓                                                    │
 *   │ BillingRecordFormDialog → TanStack Form + Zod                │
 *   │ AlertDialog → delete confirmation                            │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * CONSUMERS:
 *   - Sidebar link: /app/billing (Receipt icon)
 */

"use client"

import * as React from "react"
import { useSpring, animated, config } from "@react-spring/web"
import {
  Receipt,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import {
  useBillingRecords,
  useCreateBillingRecord,
  useUpdateBillingRecord,
  useDeleteBillingRecord,
} from "@/lib/hooks/crud/use-billing-records"
import type { BillingRecordItem } from "@/lib/hooks/crud/use-billing-records"
import { useClients } from "@/lib/hooks/crud/use-clients"
import { BillingRecordFormDialog } from "@/components/forms/billing-record-form-dialog"
import type {
  CreateBillingRecordInput,
  UpdateBillingRecordInput,
} from "@/lib/validations/billing-record.schema"

// ─── STATUS CONFIG ──────────────────────────────────────────────────────────

const statusConfig = {
  paid: { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  upcoming: { label: "Upcoming", color: "text-cyan-400", bg: "bg-cyan-400/10", icon: Clock },
  due: { label: "Due", color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertCircle },
} as const

// ─── EMPTY STATE ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16">
      <Receipt className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
      <p className="text-zinc-400 font-medium mb-1">No invoices yet</p>
      <p className="text-zinc-500 text-sm mb-6">
        Create your first advisory fee invoice for a client.
      </p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Create Invoice
      </Button>
    </div>
  )
}

// ─── PAGE ───────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { billingRecords, isLoading, stats } = useBillingRecords()
  const { clients } = useClients()
  const createMutation = useCreateBillingRecord()
  const updateMutation = useUpdateBillingRecord()
  const deleteMutation = useDeleteBillingRecord()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<BillingRecordItem | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<BillingRecordItem | null>(null)

  const reducedMotion = useReducedMotion()

  const spring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: config.gentle,
    immediate: reducedMotion,
  })

  /** Build client lookup for displaying names in the table. */
  const clientMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const c of clients) map.set(c.id, c.displayName)
    return map
  }, [clients])

  /** Client options for the form dialog dropdown. */
  const clientOptions = React.useMemo(
    () => clients.map((c) => ({ id: c.id, displayName: c.displayName })),
    [clients]
  )

  function handleCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function handleEdit(record: BillingRecordItem) {
    setEditTarget(record)
    setDialogOpen(true)
  }

  function handleFormSubmit(data: CreateBillingRecordInput | UpdateBillingRecordInput) {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, input: data as UpdateBillingRecordInput })
    } else {
      createMutation.mutate(data as CreateBillingRecordInput)
    }
  }

  /** Render a single invoice row in the table. */
  function InvoiceRow({ record }: { record: BillingRecordItem }) {
    const cfg = statusConfig[record.status] ?? statusConfig.upcoming
    const StatusIcon = cfg.icon

    return (
      <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
        <td className="py-3 px-4 font-medium text-zinc-100">{record.period}</td>
        <td className="py-3 px-4 text-zinc-400">
          {clientMap.get(record.clientId) ?? "—"}
        </td>
        <td className="py-3 px-4 text-right text-zinc-100 font-medium">
          {formatCurrency(record.amount)}
        </td>
        <td className="py-3 px-4 text-right text-zinc-400">
          {formatCurrency(record.aum)}
        </td>
        <td className="py-3 px-4 text-right text-zinc-400">
          {(record.effectiveRate * 100).toFixed(2)}%
        </td>
        <td className="py-3 px-4 text-zinc-400">{record.dueDate}</td>
        <td className="py-3 px-4">
          <Badge className={cn(cfg.bg, cfg.color, "border-0 text-xs gap-1")}>
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </td>
        <td className="py-3 px-4 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={() => handleEdit(record)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="text-rose-400 focus:text-rose-400"
                onClick={() => setDeleteTarget(record)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    )
  }

  /** Render invoice table for a filtered list. */
  function InvoiceTable({ records }: { records: BillingRecordItem[] }) {
    if (records.length === 0) {
      return (
        <p className="text-zinc-500 text-sm py-8 text-center">
          No invoices in this view.
        </p>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Period</th>
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Client</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">Amount</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">AUM</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">Rate</th>
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Due Date</th>
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Status</th>
              <th className="text-right py-3 px-4 text-zinc-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <InvoiceRow key={r.id} record={r} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <animated.div style={spring} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Billing</h1>
          <p className="text-zinc-400 mt-1">
            Manage advisory fee invoices across all clients
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Metrics */}
      {billingRecords.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Total Invoices</p>
                <Receipt className="h-4 w-4 text-tiffany-500" />
              </div>
              <p className="text-2xl font-bold text-zinc-100 mt-2">{stats.total}</p>
              <p className="text-xs text-zinc-500 mt-1">All billing records</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Total Billed</p>
                <DollarSign className="h-4 w-4 text-tiffany-500" />
              </div>
              <p className="text-2xl font-bold text-zinc-100 mt-2">
                {formatCurrency(stats.totalAmount)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Across all invoices</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Collected</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-400 mt-2">
                {formatCurrency(stats.totalPaid)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Paid invoices</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Outstanding</p>
                <AlertCircle className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-400 mt-2">
                {formatCurrency(stats.totalDue + stats.totalUpcoming)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Due + upcoming</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice Table with Status Tabs */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-12 animate-pulse bg-zinc-800/50" />
          ))}
        </div>
      ) : billingRecords.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState onAdd={handleCreate} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
            <CardDescription>Advisory fee invoices across all clients</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All ({billingRecords.length})</TabsTrigger>
                <TabsTrigger value="paid">
                  Paid ({billingRecords.filter((r) => r.status === "paid").length})
                </TabsTrigger>
                <TabsTrigger value="due">
                  Due ({billingRecords.filter((r) => r.status === "due").length})
                </TabsTrigger>
                <TabsTrigger value="upcoming">
                  Upcoming ({billingRecords.filter((r) => r.status === "upcoming").length})
                </TabsTrigger>
              </TabsList>

              {([
                { value: "all", filter: () => true },
                { value: "paid", filter: (r: BillingRecordItem) => r.status === "paid" },
                { value: "due", filter: (r: BillingRecordItem) => r.status === "due" },
                { value: "upcoming", filter: (r: BillingRecordItem) => r.status === "upcoming" },
              ] as { value: string; filter: (r: BillingRecordItem) => boolean }[]).map(
                ({ value, filter }) => (
                  <TabsContent key={value} value={value} className="mt-4">
                    <InvoiceTable records={billingRecords.filter(filter)} />
                  </TabsContent>
                )
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <BillingRecordFormDialog
        mode={editTarget ? "edit" : "create"}
        initialData={editTarget ?? undefined}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditTarget(null)
        }}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        clients={clientOptions}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the invoice for &quot;{deleteTarget?.period}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  })
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </animated.div>
  )
}
