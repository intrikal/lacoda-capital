"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Building2,
  FileText,
  Users,
  Briefcase,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { globalSearch, type GroupedSearchResults, type SearchResult } from "@/lib/actions/search.actions"
import { trackSearchPerformed } from "@/lib/analytics/track"

// ─── Icon map ───────────────────────────────────────────────────────────────

const typeConfig = {
  asset: { icon: Building2, label: "Assets", color: "text-teal-400" },
  document: { icon: FileText, label: "Documents", color: "text-cyan-400" },
  client: { icon: Users, label: "Clients", color: "text-blue-400" },
  entity: { icon: Briefcase, label: "Entities", color: "text-purple-400" },
} as const

// ─── Component ──────────────────────────────────────────────────────────────

export function CommandSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<GroupedSearchResults | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Flatten results for keyboard navigation
  const flatResults = React.useMemo(() => {
    if (!results) return []
    return [
      ...results.assets,
      ...results.documents,
      ...results.clients,
      ...results.entities,
    ]
  }, [results])

  // ── Keyboard shortcut: Cmd+K / Ctrl+K ──────────────────────────────────

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery("")
      setResults(null)
      setSelectedIndex(0)
    }
  }, [open])

  // ── Debounced search ───────────────────────────────────────────────────

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length === 0) {
      setResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await globalSearch(query)
        setResults(data)
        setSelectedIndex(0)
        trackSearchPerformed(query, data.total)
      } catch {
        setResults(null)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // ── Navigate to result ─────────────────────────────────────────────────

  function navigateTo(result: SearchResult) {
    setOpen(false)
    router.push(result.href)
  }

  // ── Keyboard navigation ────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && flatResults[selectedIndex]) {
      e.preventDefault()
      navigateTo(flatResults[selectedIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // ── Render a group of results ──────────────────────────────────────────

  function renderGroup(type: keyof typeof typeConfig, items: SearchResult[]) {
    if (items.length === 0) return null
    const config = typeConfig[type]
    const Icon = config.icon

    return (
      <div key={type}>
        <div className="flex items-center gap-2 px-3 py-2">
          <Icon className={cn("h-3.5 w-3.5", config.color)} />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {config.label}
          </span>
        </div>
        {items.map((item) => {
          const globalIdx = flatResults.indexOf(item)
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item)}
              onMouseEnter={() => setSelectedIndex(globalIdx)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors rounded-md mx-1",
                globalIdx === selectedIndex
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.subtitle && (
                  <p className="truncate text-xs text-zinc-500">{item.subtitle}</p>
                )}
              </div>
              {globalIdx === selectedIndex && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Trigger button (used in topbar) */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 hidden rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-xl border-zinc-800 bg-zinc-900 p-0 shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-zinc-800 px-4">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search assets, documents, clients, entities..."
              className="h-12 border-0 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {isSearching && (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!isSearching && results && results.total === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-500">No results found</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Try searching with different terms
                </p>
              </div>
            )}

            {!isSearching && results && results.total > 0 && (
              <div className="space-y-1">
                {renderGroup("asset", results.assets)}
                {renderGroup("document", results.documents)}
                {renderGroup("client", results.clients)}
                {renderGroup("entity", results.entities)}
              </div>
            )}

            {!isSearching && !results && (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-500">
                  Start typing to search across all data
                </p>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-600">
                  <span>↑↓ Navigate</span>
                  <span>↵ Open</span>
                  <span>Esc Close</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
