export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="h-8 w-24 rounded-md bg-zinc-800" />
          <div className="h-4 w-40 rounded bg-zinc-800" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-md bg-zinc-800" />
          <div className="h-9 w-28 rounded-md bg-zinc-800" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <div className="h-4 w-20 rounded bg-zinc-800" />
            <div className="h-8 w-16 rounded bg-zinc-800" />
            <div className="h-3 w-24 rounded bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 pb-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-t-md bg-zinc-800" />
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 rounded-md bg-zinc-800" />
        <div className="h-10 w-36 rounded-md bg-zinc-800" />
      </div>

      {/* Client List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-zinc-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-zinc-800" />
          ))}
        </div>
        {/* Client rows */}
        {[...Array(7)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4 border-b border-zinc-800/50 last:border-0 items-center">
            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-zinc-800 flex-shrink-0" />
              <div className="space-y-1">
                <div className="h-4 w-28 rounded bg-zinc-800" />
                <div className="h-3 w-20 rounded bg-zinc-800" />
              </div>
            </div>
            {/* Status badge */}
            <div className="h-6 w-16 rounded-full bg-zinc-800" />
            {/* Email */}
            <div className="h-4 w-36 rounded bg-zinc-800" />
            {/* AUM */}
            <div className="h-4 w-24 rounded bg-zinc-800" />
            {/* Actions */}
            <div className="h-8 w-8 rounded-md bg-zinc-800 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
