export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-56 rounded-md bg-zinc-800" />
            <div className="h-6 w-20 rounded-full bg-zinc-800" />
          </div>
          <div className="h-4 w-48 rounded bg-zinc-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-md bg-zinc-800" />
          <div className="h-9 w-32 rounded-md bg-zinc-800" />
        </div>
      </div>

      {/* Portfolio Summary Hero */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="h-4 w-48 rounded bg-zinc-800" />
            <div className="h-10 w-64 rounded bg-zinc-800" />
            <div className="h-4 w-32 rounded bg-zinc-800" />
          </div>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-zinc-800" />
            <div className="h-8 w-24 rounded bg-zinc-800" />
            <div className="h-3 w-28 rounded bg-zinc-800" />
          </div>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-2">
            <div className="h-3 w-24 rounded bg-zinc-800" />
            <div className="h-8 w-12 rounded bg-zinc-800" />
            <div className="h-3 w-20 rounded bg-zinc-800" />
          </div>
        </div>
        {/* Top Performers */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <div className="h-3 w-28 rounded bg-zinc-800 mb-3" />
          <div className="grid md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-800" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 rounded bg-zinc-800" />
                    <div className="h-3 w-20 rounded bg-zinc-800" />
                  </div>
                </div>
                <div className="h-6 w-14 rounded-full bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <div className="h-6 w-28 rounded bg-zinc-800 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="h-4 w-28 rounded bg-zinc-800" />
                <div className="h-8 w-8 rounded-lg bg-zinc-800" />
              </div>
              <div className="h-8 w-32 rounded bg-zinc-800" />
              <div className="h-3 w-24 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div>
        <div className="h-6 w-44 rounded bg-zinc-800 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-72" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-72" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-64" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-56" />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-56" />
          </div>
        </div>
        {/* Right column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-40" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-48" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            {/* Tabs */}
            <div className="h-9 w-full rounded-lg bg-zinc-800 mb-4" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <div className="h-4 w-32 rounded bg-zinc-800" />
                    <div className="h-4 w-28 rounded bg-zinc-800" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800" />
                  <div className="h-3 w-16 rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
