export default function AssetsLoading() {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-zinc-800" />
              <div className="h-9 w-9 rounded-lg bg-zinc-800" />
            </div>
            <div className="h-8 w-36 rounded bg-zinc-800" />
            <div className="h-3 w-24 rounded bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-72" />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-72" />
      </div>

      {/* ROI Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-64" />

      {/* Search + Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 rounded-md bg-zinc-800" />
        <div className="h-10 w-40 rounded-md bg-zinc-800" />
        <div className="h-10 w-36 rounded-md bg-zinc-800" />
      </div>

      {/* Assets Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-zinc-800">
          {["Asset", "Class", "Entity", "Current Value", "Status", ""].map((_, i) => (
            <div key={i} className="h-4 rounded bg-zinc-800" />
          ))}
        </div>
        {/* Table Rows */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-zinc-800/50 last:border-0 items-center">
            {/* Asset name + icon */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-800 flex-shrink-0" />
              <div className="space-y-1">
                <div className="h-4 w-24 rounded bg-zinc-800" />
                <div className="h-3 w-16 rounded bg-zinc-800" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-zinc-800" />
            <div className="h-4 w-20 rounded bg-zinc-800" />
            <div className="h-4 w-24 rounded bg-zinc-800" />
            <div className="h-6 w-16 rounded-full bg-zinc-800" />
            <div className="h-8 w-8 rounded-md bg-zinc-800 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
