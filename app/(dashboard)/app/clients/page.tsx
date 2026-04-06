/**
 * ============================================================================
 * FILE: /app/(dashboard)/app/clients/page.tsx
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   The main Clients page of the advisor dashboard. This is the PAGE COMPONENT —
 *   the full-screen view that users see when they navigate to /app/clients.
 *
 * FILE-BASED ROUTING:
 *   This file lives at: app/(dashboard)/app/clients/page.tsx
 *   It maps to the URL:  /app/clients
 *
 *   The (dashboard) part is a "route group" — parentheses tell Next.js
 *   "use the layout from this folder but DON'T include the name in the URL."
 *   So (dashboard) applies the dashboard layout without adding "/dashboard" to the URL.
 *
 *   page.tsx is a special filename in Next.js that defines the page component
 *   for that URL segment.
 *
 * WHAT DOES THIS PAGE SHOW?
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Page Header: "Clients" + Export/Add Client buttons               │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ Stats Cards: Total | Active | Avg AUM | Prospects                │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ Tabs: All Clients | Active | Prospects | Inactive                │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ Search bar + Type filter dropdown                                │
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ Client List:                                                     │
 *   │   Avatar | Name | Status Badge | Email | AUM | Actions Menu      │
 *   │   Avatar | Name | Status Badge | Email | AUM | Actions Menu      │
 *   │   ...                                                            │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * COMPONENT ARCHITECTURE:
 *   This file contains MULTIPLE components (common for page files):
 *
 *   1. ClientDetailDrawer — Modal showing a single client's details (click a row)
 *   2. DeleteClientDialog — Confirmation dialog before deleting a client
 *   3. ClientsPage — The main page component (default export)
 *
 *   Plus, it imports:
 *   4. ClientFormDialog — Modal form for create/edit (separate file)
 *
 * STATE MANAGEMENT:
 *   This component uses React's useState for UI state (which tab is active,
 *   what's in the search box, which client is selected, etc.)
 *   and React Query hooks for SERVER state (the actual client data).
 *
 *   UI State (useState) = "What is the user doing right now?"
 *   Server State (useQuery) = "What data is in the database?"
 *
 * "use client" EXPLAINED:
 *   This directive marks the file as a CLIENT component.
 *   In Next.js App Router, components are SERVER components by default
 *   (rendered on the server, no JavaScript sent to browser).
 *
 *   "use client" opts in to CLIENT rendering because we need:
 *     - useState (interactive state)
 *     - onClick handlers (user interactions)
 *     - React Query hooks (browser-side data fetching)
 *
 *   Server components = faster initial load, less JS sent to browser.
 *   Client components = interactive, can use hooks and event handlers.
 */
"use client"

// ─── IMPORTS ────────────────────────────────────────────────────────────────────

/**
 * React — The core library for building user interfaces.
 *
 * import * as React — Imports ALL exports from React under the name "React".
 * We use React.useState, React.useMemo, etc. below.
 *
 * You'll also see `import { useState } from "react"` in some codebases —
 * both work, but `import * as React` is conventional for files with many
 * React API uses.
 */
import * as React from "react"

/**
 * date-fns — A lightweight date formatting library.
 * format(date, "MMMM yyyy") → "January 2024"
 * We use it to display "Client Since: January 2024" in the detail drawer.
 */
import { format } from "date-fns"

/**
 * Lucide React — An icon library. Each import is an SVG icon component.
 * These render as small graphics in the UI (search icon, user icon, etc.)
 *
 * Usage: <Search className="h-4 w-4" /> renders a magnifying glass icon
 *        with height and width of 1rem (16px).
 */
import {
  Plus,            // + icon for "Add Client" button
  Search,          // Magnifying glass for search bar
  Building2,       // Building icon for institution type
  User,            // Person icon for individual type
  Users,           // Group icon for trust type / total clients stat
  Briefcase,       // Briefcase for fund type / prospects stat
  Mail,            // Envelope for email
  Phone,           // Phone handset for phone number
  MoreHorizontal,  // Three dots "..." for actions dropdown
  FileText,        // Document icon for "Documents" button
  Filter,          // Funnel for type filter dropdown
  Download,        // Download arrow for "Export" button
  Loader2,         // Spinning loader for loading state
  AlertCircle,     // Circle with ! for error state
  X as XIcon,      // X for closing the detail panel
} from "lucide-react"

/**
 * UI Components — Pre-built, styled components from our shared component library.
 * Located in /components/ui/. Built on Radix UI + Tailwind CSS.
 */
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * cn — A utility function for combining CSS class names.
 * cn("text-red-500", condition && "font-bold")
 *   → If condition is true: "text-red-500 font-bold"
 *   → If condition is false: "text-red-500"
 *
 * formatCurrency — Formats a number as USD currency.
 * formatCurrency(1234567) → "$1,234,567"
 */
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

/**
 * Dashboard components — Layout building blocks specific to the dashboard.
 * ContentCard = A card with dark background and border (container for content)
 * StatCard = A card showing a single metric (e.g., "Total Clients: 24")
 * PageHeader = The top section with title, description, and action buttons
 * Tabs = A row of clickable tab buttons for filtering
 */
import { ContentCard, PageHeader } from "@/components/dashboard/content-card"

/**
 * CRUD hooks — Our custom hooks that connect to the API.
 * See lib/hooks/crud/use-clients.ts for detailed documentation.
 */
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from "@/lib/hooks/crud/use-clients"

/** The form dialog component — see components/forms/client-form-dialog.tsx */
import { ClientFormDialog } from "@/components/forms/client-form-dialog"

/** Type imports for TypeScript type-checking */
import type { ClientRecord } from "@/lib/types"
import type { CreateClientInput } from "@/lib/validations/client.schema"


// ─── CONSTANTS ──────────────────────────────────────────────────────────────────
/**
 * typeIcons — Maps each client type to its icon component.
 *
 * `as const` makes this object READONLY and preserves exact types.
 * Without it: TypeScript sees { individual: ComponentType } (generic)
 * With it: TypeScript sees { individual: typeof User } (exact)
 *
 * USAGE: const TypeIcon = typeIcons[client.clientType]
 *        <TypeIcon className="h-4 w-4" />
 */
const typeIcons: Record<string, typeof User> = {
  individual: User,
  institution: Building2,
  trust: Users,
  fund: Briefcase,
}

/**
 * statusConfig — Configuration for how each status is displayed.
 * Each status has:
 *   label = Human-readable text ("Active", "Inactive", "Prospect")
 *   color = Text color class (Tailwind CSS)
 *   bg    = Background color class (with opacity via /10 = 10% opacity)
 *
 * These are used by Badge components throughout the page.
 */
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  inactive: { label: "Inactive", color: "text-zinc-400", bg: "bg-zinc-500/10" },
  prospect: { label: "Prospect", color: "text-blue-400", bg: "bg-blue-500/10" },
}



// ─── DELETE CONFIRMATION DIALOG ─────────────────────────────────────────────────
/**
 * DeleteClientDialog — A confirmation dialog before permanently deleting a client.
 *
 * Uses AlertDialog (not Dialog) because:
 *   - AlertDialog requires explicit user action (OK/Cancel)
 *   - Clicking the backdrop does NOT close it (safer for destructive actions)
 *   - Dialog closes on backdrop click (fine for non-destructive modals)
 *
 * PROPS:
 *   client       — The client to delete (or null)
 *   open         — Whether the dialog is visible
 *   onOpenChange — Callback to open/close
 *   onConfirm    — Callback when "Delete" is clicked
 *   isPending    — Whether the delete request is in progress
 */
function DeleteClientDialog({
  client,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  client: ClientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client?</AlertDialogTitle>
          <AlertDialogDescription>
            {/* {" "} = explicit space in JSX.
                JSX collapses whitespace differently than HTML.
                We need {" "} to ensure the space before/after the bold name. */}
            This will permanently delete{" "}
            <span className="font-semibold text-zinc-100">
              {/* ?. = optional chaining. If client is null, returns undefined
                  instead of throwing an error. */}
              {client?.displayName}
            </span>{" "}
            and all associated data. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-zinc-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={onConfirm}
            disabled={isPending}  // Prevents double-click while deleting
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


// ─── MAIN PAGE COMPONENT ────────────────────────────────────────────────────────
/**
 * TYPE: TabId
 * A union type representing the valid tab identifiers.
 * Can only be: "all", "active", "prospect", or "inactive".
 */
type TabId = "all" | "active" | "prospect" | "inactive"

/**
 * ClientsPage — The main page component. This is the DEFAULT EXPORT.
 *
 * `export default` means this is the primary export of the file.
 * Next.js requires page.tsx files to have a default export — that's the page component.
 *
 * WHAT IS STATE?
 *   "State" is data that can change over time and causes the component to re-render.
 *
 *   React.useState<Type>(initialValue) returns [currentValue, setterFunction]:
 *     const [count, setCount] = useState(0)
 *     setCount(5)  → count is now 5, component re-renders to show new value
 *
 *   Every call to a setter function triggers a RE-RENDER:
 *     The component function runs again, the JSX is recalculated, and
 *     React updates ONLY the parts of the DOM that actually changed.
 */
export default function ClientsPage() {
  // ── UI State (what the user is doing right now) ─────────────────────────────

  /** What the user typed in the search box */
  const [searchQuery, setSearchQuery] = React.useState("")

  /** Which tab is currently active (all, active, prospect, inactive) */
  const [activeTab, setActiveTab] = React.useState<TabId>("all")

  /** Which type filter is selected in the dropdown (all, individual, etc.) */
  const [typeFilter, setTypeFilter] = React.useState<string>("all")

  /** The client whose detail drawer is open (null = drawer closed) */
  const [selectedClient, setSelectedClient] = React.useState<ClientRecord | null>(null)

  /** Whether the create/edit form dialog is open */
  const [formOpen, setFormOpen] = React.useState(false)

  /** Whether the form is in "create" or "edit" mode */
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create")

  /** The client being edited (undefined in create mode) */
  const [editingClient, setEditingClient] = React.useState<ClientRecord | undefined>()

  /** The client targeted for deletion (null = delete dialog closed) */
  const [deleteTarget, setDeleteTarget] = React.useState<ClientRecord | null>(null)

  // ── Server State (data from the database) ───────────────────────────────────
  /**
   * Custom hooks that connect to the API.
   * See lib/hooks/crud/use-clients.ts for detailed documentation.
   *
   * useClients() — Fetches and caches the client list, computes stats.
   *   Returns: { clients, isLoading, isError, stats }
   *
   * useCreateClient() — Returns a mutation object for creating clients.
   *   Usage: createMutation.mutate(data)
   *   State: createMutation.isPending (true while request is in flight)
   *
   * useUpdateClient() / useDeleteClient() — Same pattern for update/delete.
   */
  const { clients, isLoading, isError, stats } = useClients()
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const deleteMutation = useDeleteClient()

  // ── CLIENT-SIDE FILTERING ──────────────────────────────────────────────────
  /**
   * Filter the client list based on search query, type filter, and active tab.
   *
   * .filter() creates a new array containing only elements where the callback
   * returns true. For each client, ALL three conditions must be true to include it.
   *
   * WHY FILTER ON THE CLIENT SIDE?
   *   The API fetches ALL clients for this org (no server-side filtering for
   *   type or tab). Filtering happens here for instant responsiveness — the
   *   user sees results change immediately as they type/click, without waiting
   *   for a new API call.
   *
   *   Tradeoff: This works fine with <1000 clients. For 10,000+ clients,
   *   we'd want server-side filtering (pass type/tab as query params).
   */
  const filteredClients = clients.filter((client) => {
    // Search: does the client's name or email contain the search text?
    // .toLowerCase() makes it case-insensitive: "JOHN" matches "john"
    const matchesSearch =
      client.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.email ?? "").toLowerCase().includes(searchQuery.toLowerCase())

    // Type filter: does the client's type match the dropdown?
    // "all" means no filtering (show all types).
    const matchesType = typeFilter === "all" || client.clientType === typeFilter

    // Tab filter: does the client's status match the active tab?
    const matchesTab = activeTab === "all" || client.clientStatus === activeTab

    // ALL conditions must be true (logical AND).
    return matchesSearch && matchesType && matchesTab
  })

  /**
   * Total AUM of the currently visible (filtered) clients.
   * Used in the page header: "24 clients · $12,345,678 AUM"
   */
  const filteredAUM = filteredClients.reduce((sum, c) => sum + (c.totalAUM ?? 0), 0)

  /**
   * Tab configuration — defines the tabs shown in the tab bar.
   * Each tab has an id (for state), label (displayed text), and count (badge number).
   * The count comes from the stats computed in useClients().
   */
  const tabs = [
    { id: "all", label: "All Clients", count: stats.total },
    { id: "active", label: "Active", count: stats.active },
    { id: "prospect", label: "Prospects", count: stats.prospects },
    { id: "inactive", label: "Inactive", count: stats.inactive },
  ]

  // ── EVENT HANDLERS ─────────────────────────────────────────────────────────
  /**
   * These functions handle user interactions. They update state, which triggers
   * re-renders, which updates the UI to reflect the new state.
   *
   * NAMING CONVENTION: handle[Event] (e.g., handleAddClient, handleEditClient)
   */

  /** Opens the form dialog in "create" mode (empty form) */
  function handleAddClient() {
    setFormMode("create")
    setEditingClient(undefined)  // No existing data to pre-fill
    setFormOpen(true)
  }

  /** Opens the form dialog in "edit" mode (pre-filled with client data) */
  function handleEditClient(client: ClientRecord) {
    setFormMode("edit")
    setEditingClient(client)     // Pre-fill the form with this client's data
    setFormOpen(true)
  }

  /**
   * Handles form submission from the ClientFormDialog.
   * Decides whether to create or update based on the current form mode.
   */
  function handleFormSubmit(data: CreateClientInput) {
    if (formMode === "create") {
      // .mutate() triggers the API call (POST /api/clients)
      createMutation.mutate(data)
    } else if (editingClient) {
      // .mutate() triggers the API call (PATCH /api/clients/:id)
      updateMutation.mutate({ id: editingClient.id, input: data })
    }
  }

  /**
   * Handles the delete confirmation.
   * Called when user clicks "Delete" in the confirmation dialog.
   */
  function handleDeleteConfirm() {
    if (!deleteTarget) return  // Safety check
    deleteMutation.mutate(deleteTarget.id, {
      // onSuccess callback — runs after successful deletion.
      // Closes the delete dialog by setting deleteTarget back to null.
      onSuccess: () => setDeleteTarget(null),
    })
  }

  // ── ERROR STATE ────────────────────────────────────────────────────────────
  /**
   * If the initial data fetch failed, show an error message.
   * This is an "early return" — the rest of the component doesn't render.
   */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <p>Failed to load clients. Please refresh.</p>
      </div>
    )
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  /**
   * The main JSX return — defines the complete page layout.
   *
   * TAILWIND CSS CLASSES CHEAT SHEET (used throughout):
   *   space-y-6     = 1.5rem vertical gap between direct children
   *   grid          = CSS Grid layout
   *   grid-cols-2   = 2 equal columns
   *   lg:grid-cols-4 = 4 columns on large screens (responsive)
   *   gap-4         = 1rem gap between grid items
   *   flex          = Flexbox layout
   *   items-center  = Vertically center items
   *   justify-between = Push items to opposite ends
   *   text-sm       = Small text (0.875rem)
   *   font-medium   = Medium font weight (500)
   *   text-zinc-100 = Very light gray text
   *   text-zinc-500 = Medium gray text
   *   bg-zinc-900   = Very dark gray background
   *   rounded-lg    = Large border radius (rounded corners)
   *   p-4           = 1rem padding on all sides
   *   min-w-0       = Allows text truncation (prevents overflow)
   *   hidden sm:block = Hidden on mobile, visible on small+ screens
   *   opacity-0 group-hover:opacity-100 = Invisible until parent is hovered
   *   transition-*  = Smooth animation for property changes
   */
  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="pb-6">
        <PageHeader
          title="Clients"
          description={`${filteredClients.length} clients · ${formatCurrency(filteredAUM)} AUM`}
          actions={
            <>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={handleAddClient}>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </>
          }
        />
      </div>

      {/* ── Three-panel layout ───────────────────────────────────────── */}
      <div className="flex flex-col lg:grid lg:grid-cols-[220px_1fr_300px] rounded-xl border border-zinc-800/60 overflow-hidden">

        {/* ── Left sticky panel ──────────────────────────────────────── */}
        <aside className="flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-zinc-800/60 lg:sticky lg:top-14 lg:h-[calc(100vh-80px)] lg:overflow-y-auto bg-zinc-900/40">

          {/* Stats */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Overview</p>
            {[
              { label: "Total", value: stats.total, color: "text-zinc-100", icon: Users },
              { label: "Active", value: stats.active, color: "text-emerald-400", icon: User },
              { label: "Prospects", value: stats.prospects, color: "text-blue-400", icon: Briefcase },
              { label: "Inactive", value: stats.inactive, color: "text-zinc-500", icon: User },
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
                <span>Avg AUM</span>
                <span className="text-zinc-400 font-medium">{formatCurrency(stats.avgAUM)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800/60" />

          {/* Status tabs */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Filter by Status</p>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-tiffany-500/10 text-tiffany-500"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn("text-xs font-mono", activeTab === tab.id ? "text-tiffany-400" : "text-zinc-600")}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-800/60" />

          {/* Search + type filter */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search clients…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-900/50 border-zinc-800/60 h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-zinc-900/50 border-zinc-800/60 h-9">
                <Filter className="h-4 w-4 mr-2 text-zinc-500" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="institution">Institution</SelectItem>
                <SelectItem value="trust">Trust</SelectItem>
                <SelectItem value="fund">Fund</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </aside>

        {/* ── Right main panel ───────────────────────────────────────── */}
        <div className="p-4 lg:p-5 min-w-0">
          <ContentCard noPadding>
        {isLoading ? (
          /* ── Loading State ───────────────────────────────────────── */
          <div className="flex items-center justify-center h-40 text-zinc-500">
            {/* animate-spin rotates the icon continuously (CSS animation) */}
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading clients…
          </div>
        ) : filteredClients.length === 0 ? (
          /* ── Empty State ─────────────────────────────────────────── */
          /* Shows different messages based on whether filters are active:
             - With filters: "No clients match your filters"
             - Without filters: "No clients yet — add your first one" + CTA button */
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-500">
            <Users className="h-8 w-8" />
            <p className="text-sm">
              {searchQuery || typeFilter !== "all" || activeTab !== "all"
                ? "No clients match your filters"
                : "No clients yet — add your first one"}
            </p>
            {!searchQuery && typeFilter === "all" && activeTab === "all" && (
              <Button size="sm" variant="outline" onClick={handleAddClient}>
                <Plus className="h-4 w-4 mr-1" /> Add Client
              </Button>
            )}
          </div>
        ) : (
          /* ── Client Rows ─────────────────────────────────────────── */
          /* divide-y = adds a border between each child (visual separator).
             divide-zinc-800/60 = the border color (dark gray, 60% opacity). */
          <div className="divide-y divide-zinc-800/60">
            {/* .map() transforms each client object into a JSX row.
                It's like a for loop that returns UI for each item.

                .map(client => <Row />) is equivalent to:
                  const rows = []
                  for (const client of filteredClients) {
                    rows.push(<Row />)
                  }
                  return rows
            */}
            {filteredClients.map((client) => {
              const TypeIcon = typeIcons[client.clientType]
              const status = statusConfig[client.clientStatus]

              return (
                <div
                  key={client.id}
                  /* key={client.id} — CRITICAL for React performance.
                     React uses keys to track which items changed/moved/deleted.
                     Without keys, React re-renders the ENTIRE list.
                     With keys, React only updates what actually changed.
                     Keys must be UNIQUE and STABLE (UUIDs are perfect). */
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  onClick={() => setSelectedClient(client)}
                  data-testid="client-row"
                >
                  {/* Left side: Avatar + Name + Status + Email */}
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar fallback={client.displayName} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-100">
                          {client.displayName}
                        </p>
                        <Badge className={cn("text-xs", status.color, status.bg)}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                        <TypeIcon className="h-3 w-3" />
                        <span className="capitalize">{client.clientType}</span>
                        {client.email && (
                          <>
                            <span>·</span>
                            <span>{client.email}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right side: AUM + Actions dropdown */}
                  <div className="flex items-center gap-4">
                    {/* AUM display — hidden on mobile (hidden sm:block) */}
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold text-tiffany-500">
                        {formatCurrency(client.totalAUM ?? 0)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {client.assetCount} asset{client.assetCount !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Actions dropdown (three dots menu) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          /* opacity-0 group-hover:opacity-100 = invisible by default,
                             appears when the ROW is hovered (group = the parent div
                             with className="group"). */
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                          /* e.stopPropagation() prevents the click from bubbling up
                             to the row's onClick (which would open the detail drawer).
                             We want ONLY the dropdown to open, not the drawer too. */
                          aria-label="Client actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleEditClient(client) }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>Send Message</DropdownMenuItem>
                        <DropdownMenuItem>View Documents</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        <DropdownMenuItem
                          className="text-rose-400 focus:text-rose-400"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(client) }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ContentCard>
        </div>{/* end center panel */}

        {/* ── Right detail panel ─────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col border-l border-zinc-800/60 lg:sticky lg:top-14 lg:h-[calc(100vh-80px)] lg:overflow-y-auto bg-zinc-900/20">
          {selectedClient ? (
            (() => {
              const TypeIcon = typeIcons[selectedClient.clientType]
              const status = statusConfig[selectedClient.clientStatus]
              return (
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-5 border-b border-zinc-800/60">
                    <div className="flex items-start justify-between mb-3">
                      <Avatar fallback={selectedClient.displayName} size="lg" />
                      <button
                        onClick={() => setSelectedClient(null)}
                        className="text-zinc-600 hover:text-zinc-400 transition-colors"
                        aria-label="Close"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-zinc-100 leading-snug">{selectedClient.displayName}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <TypeIcon className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-xs text-zinc-500 capitalize">{selectedClient.clientType}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                    {/* AUM */}
                    <div className="p-4 rounded-xl bg-zinc-800/50">
                      <p className="text-xs text-zinc-500 mb-1">Assets Under Management</p>
                      <p className="text-xl font-bold text-zinc-100">{formatCurrency(selectedClient.totalAUM ?? 0)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {selectedClient.assetCount} asset{selectedClient.assetCount !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Status + Since */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Status</span>
                        <Badge className={cn(status.color, status.bg, "text-xs")}>{status.label}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Client since</span>
                        <span className="text-zinc-300 text-xs">{format(new Date(selectedClient.createdAt), "MMM yyyy")}</span>
                      </div>
                    </div>

                    {/* Contact */}
                    {(selectedClient.email || selectedClient.phone) && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Contact</p>
                        {selectedClient.email && (
                          <a
                            href={`mailto:${selectedClient.email}`}
                            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-tiffany-500 transition-colors truncate"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                            {selectedClient.email}
                          </a>
                        )}
                        {selectedClient.phone && (
                          <a
                            href={`tel:${selectedClient.phone}`}
                            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-tiffany-500 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                            {selectedClient.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-5 border-t border-zinc-800/60 space-y-2">
                    <Button className="w-full" size="sm" onClick={() => handleEditClient(selectedClient)}>
                      Edit Client
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <FileText className="h-3.5 w-3.5 mr-2" />
                      Documents
                    </Button>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600 p-6 text-center">
              <Users className="h-8 w-8 opacity-40" />
              <p className="text-xs leading-relaxed">Select a client to view details</p>
            </div>
          )}
        </div>
      </div>{/* end three-panel grid */}

      <ClientFormDialog
        mode={formMode}
        initialData={editingClient}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteClientDialog
        client={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>  )
}
