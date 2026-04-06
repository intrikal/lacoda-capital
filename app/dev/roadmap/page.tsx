"use client"

import * as React from "react"
import { Plus, X, GripVertical, AlertTriangle, Zap, Target } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low"
type Column = "mvp" | "stretch" | "scope-creep"

interface Card {
  id: string
  title: string
  description?: string
  priority: Priority
}

interface BoardState {
  mvp: Card[]
  stretch: Card[]
  "scope-creep": Card[]
}

// ─── Initial data ─────────────────────────────────────────────────────────────

const INITIAL_BOARD: BoardState = {
  mvp: [
    { id: "mvp-1", title: "Run Drizzle migrations", description: "Push schema to Supabase — create all tables before any feature works", priority: "high" },
    { id: "mvp-2", title: "End-to-end auth flow", description: "Login, signup, Google OAuth, session refresh, role-based redirect", priority: "high" },
    { id: "mvp-3", title: "Client CRUD", description: "Add, view, edit, archive clients from the admin dashboard", priority: "high" },
    { id: "mvp-4", title: "Asset tracking + valuations", description: "Create assets, attach to clients/entities, log valuations over time", priority: "high" },
    { id: "mvp-5", title: "Document vault", description: "Upload, categorize, and view documents with expiration tracking", priority: "medium" },
    { id: "mvp-6", title: "Basic compliance controls", description: "SOC2 + GDPR control tracking with pass/fail/pending statuses", priority: "medium" },
    { id: "mvp-7", title: "Static demo mode", description: "/demo/app and /demo/client — no auth, no DB, fully presentable", priority: "medium" },
    { id: "mvp-8", title: "Onboarding flow", description: "Post-signup org creation wizard so new users aren't stuck in /onboarding", priority: "high" },
  ],
  stretch: [
    { id: "str-1", title: "Email notifications (Resend)", description: "Notify on new reports, expiring docs, task assignments", priority: "medium" },
    { id: "str-2", title: "Plaid bank sync", description: "Auto-pull balances and transactions for linked accounts", priority: "medium" },
    { id: "str-3", title: "PDF report export", description: "Export portfolio summaries as branded PDFs", priority: "low" },
    { id: "str-4", title: "QuickBooks sync", description: "Sync ledger events to QuickBooks for accounting", priority: "low" },
    { id: "str-5", title: "Advanced compliance frameworks", description: "CCPA, ISO 27001, FINRA, AML/KYC tracking per client", priority: "medium" },
    { id: "str-6", title: "Client portal polish", description: "Full client-facing /client/* routes with real data", priority: "medium" },
    { id: "str-7", title: "Task management", description: "Assign tasks to advisors and clients with due dates", priority: "low" },
    { id: "str-8", title: "DocuSign e-signatures", description: "Send documents for electronic signature from the vault", priority: "low" },
  ],
  "scope-creep": [
    { id: "sc-1", title: "Built-in AI assistant", description: "LLM chatbot for portfolio Q&A — huge distraction, adds no core value yet", priority: "low" },
    { id: "sc-2", title: "Native mobile app", description: "iOS/Android — web-first is the right call until revenue justifies it", priority: "low" },
    { id: "sc-3", title: "Public REST API", description: "Developer-facing API with rate limiting, docs, SDK — not yet", priority: "low" },
    { id: "sc-4", title: "White-labeling per org", description: "Custom domains + brand colors — premature optimization before scale", priority: "low" },
    { id: "sc-5", title: "Blockchain document verification", description: "NFT-based doc provenance — gimmick, not a compliance requirement", priority: "low" },
    { id: "sc-6", title: "Marketplace / integrations store", description: "Plugin ecosystem — no one is asking for this yet", priority: "low" },
  ],
}

const STORAGE_KEY = "lacoda-roadmap-v1"

// ─── Column config ─────────────────────────────────────────────────────────────

const COLUMNS: { id: Column; label: string; sublabel: string; icon: React.ReactNode; color: string; border: string; badge: string }[] = [
  {
    id: "mvp",
    label: "MVP",
    sublabel: "Build this now",
    icon: <Target className="h-4 w-4" />,
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    id: "stretch",
    label: "Stretch",
    sublabel: "Nice to have",
    icon: <Zap className="h-4 w-4" />,
    color: "text-amber-400",
    border: "border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    id: "scope-creep",
    label: "Scope Creep",
    sublabel: "DO NOT BUILD",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-400",
    border: "border-red-500/20",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
  },
]

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30",
}

// ─── Card component ───────────────────────────────────────────────────────────

function KanbanCard({
  card,
  onDelete,
  onDragStart,
}: {
  card: Card
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, cardId: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      className="group relative rounded-lg border border-zinc-700/60 bg-zinc-800/60 p-3 cursor-grab active:cursor-grabbing hover:border-zinc-600 transition-colors select-none"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0 group-hover:text-zinc-500 transition-colors" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 leading-snug">{card.title}</p>
          {card.description && (
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{card.description}</p>
          )}
          <div className="mt-2">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_COLORS[card.priority]}`}>
              {card.priority}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(card.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-zinc-600 hover:text-zinc-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Add card form ─────────────────────────────────────────────────────────────

function AddCardForm({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string, description: string, priority: Priority) => void
  onCancel: () => void
}) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState<Priority>("medium")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title.trim(), description.trim(), priority)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-600 bg-zinc-800 p-3 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title"
        className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 resize-none"
      />
      <div className="flex items-center gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="bg-zinc-700/50 border border-zinc-600/50 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="flex gap-1 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs bg-tiffany-500 hover:bg-tiffany-600 text-zinc-950 font-medium rounded transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Column component ─────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  cards,
  onAddCard,
  onDeleteCard,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  column: typeof COLUMNS[number]
  cards: Card[]
  onAddCard: (col: Column, title: string, description: string, priority: Priority) => void
  onDeleteCard: (col: Column, cardId: string) => void
  onDragStart: (e: React.DragEvent, cardId: string, sourceCol: Column) => void
  onDragOver: (e: React.DragEvent, col: Column) => void
  onDrop: (e: React.DragEvent, col: Column) => void
  isDragOver: boolean
}) {
  const [adding, setAdding] = React.useState(false)

  return (
    <div
      className={`flex flex-col rounded-xl border bg-zinc-900/60 transition-colors ${column.border} ${isDragOver ? "bg-zinc-800/60" : ""}`}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={column.color}>{column.icon}</span>
          <div>
            <span className={`text-sm font-semibold ${column.color}`}>{column.label}</span>
            <span className="text-xs text-zinc-500 ml-2">{column.sublabel}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${column.badge}`}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2 min-h-[120px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            onDelete={(id) => onDeleteCard(column.id, id)}
            onDragStart={(e, cardId) => onDragStart(e, cardId, column.id)}
          />
        ))}
        {isDragOver && cards.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-zinc-600 h-16 flex items-center justify-center">
            <span className="text-xs text-zinc-500">Drop here</span>
          </div>
        )}
        {adding && (
          <AddCardForm
            onAdd={(title, description, priority) => {
              onAddCard(column.id, title, description, priority)
              setAdding(false)
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>

      {/* Add card button */}
      {!adding && (
        <div className="p-3 pt-0">
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add card
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [board, setBoard] = React.useState<BoardState>(() => {
    if (typeof window === "undefined") return INITIAL_BOARD
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : INITIAL_BOARD
    } catch {
      return INITIAL_BOARD
    }
  })

  const dragRef = React.useRef<{ cardId: string; sourceCol: Column } | null>(null)
  const [dragOverCol, setDragOverCol] = React.useState<Column | null>(null)

  // Persist to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
    } catch {}
  }, [board])

  const handleDragStart = (e: React.DragEvent, cardId: string, sourceCol: Column) => {
    dragRef.current = { cardId, sourceCol }
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, col: Column) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverCol(col)
  }

  const handleDrop = (e: React.DragEvent, targetCol: Column) => {
    e.preventDefault()
    setDragOverCol(null)
    if (!dragRef.current) return
    const { cardId, sourceCol } = dragRef.current
    if (sourceCol === targetCol) return

    setBoard((prev) => {
      const card = prev[sourceCol].find((c) => c.id === cardId)
      if (!card) return prev
      return {
        ...prev,
        [sourceCol]: prev[sourceCol].filter((c) => c.id !== cardId),
        [targetCol]: [...prev[targetCol], card],
      }
    })
    dragRef.current = null
  }

  const handleDragEnd = () => {
    setDragOverCol(null)
    dragRef.current = null
  }

  const handleAddCard = (col: Column, title: string, description: string, priority: Priority) => {
    setBoard((prev) => ({
      ...prev,
      [col]: [
        ...prev[col],
        { id: `${col}-${Date.now()}`, title, description, priority },
      ],
    }))
  }

  const handleDeleteCard = (col: Column, cardId: string) => {
    setBoard((prev) => ({
      ...prev,
      [col]: prev[col].filter((c) => c.id !== cardId),
    }))
  }

  const handleReset = () => {
    if (confirm("Reset board to default? This cannot be undone.")) {
      setBoard(INITIAL_BOARD)
    }
  }

  return (
    <div
      className="min-h-screen bg-zinc-950 p-6"
      onDragEnd={handleDragEnd}
    >
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-tiffany-500/10 text-tiffany-500 border border-tiffany-500/20">
              DEV ONLY
            </span>
            <span className="text-xs text-zinc-600">localhost only — remove before launch</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Product Roadmap</h1>
          <p className="text-zinc-400 mt-1 text-sm">
            {board.mvp.length} MVP · {board.stretch.length} Stretch · {board["scope-creep"].length} Do Not Build
          </p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-4 items-start">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            cards={board[col.id]}
            onAddCard={handleAddCard}
            onDeleteCard={handleDeleteCard}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragOver={dragOverCol === col.id}
          />
        ))}
      </div>
    </div>
  )
}
