export default function ClientDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-52 rounded-md bg-zinc-800" />
          <div className="h-4 w-48 rounded bg-zinc-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-md bg-zinc-800" />
          <div className="h-9 w-36 rounded-md bg-zinc-800" />
        </div>
      </div>

      {/* Portfolio Summary Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Total Value */}
          <div className="lg:col-span-2 space-y-3">
            <div className="h-4 w-40 rounded bg-zinc-800" />
            <div className="flex items-baseline gap-3">
              <div className="h-10 w-52 rounded bg-zinc-800" />
              <div className="h-6 w-16 rounded bg-zinc-800" />
            </div>
            <div className="h-4 w-36 rounded bg-zinc-800" />
          </div>
          {/* YTD Return */}
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-zinc-800" />
            <div className="h-8 w-20 rounded bg-zinc-800" />
            <div className="h-3 w-28 rounded bg-zinc-800" />
          </div>
          {/* Net Worth */}
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-zinc-800" />
            <div className="h-8 w-32 rounded bg-zinc-800" />
            <div className="h-3 w-24 rounded bg-zinc-800" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-72" />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-72" />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Allocation + Goals row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Allocation chart */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-64" />
            {/* Goals card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="h-5 w-28 rounded bg-zinc-800" />
                  <div className="h-3 w-40 rounded bg-zinc-800" />
                </div>
                <div className="h-8 w-16 rounded-md bg-zinc-800" />
              </div>
              {[...Array(3)].map((_, i) => (
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

          {/* Recent Activity */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-5 w-28 rounded bg-zinc-800" />
              <div className="h-8 w-16 rounded-md bg-zinc-800" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-800 flex-shrink-0" />
                  <div className="space-y-1">
                    <div className="h-4 w-40 rounded bg-zinc-800" />
                    <div className="h-3 w-24 rounded bg-zinc-800" />
                  </div>
                </div>
                <div className="h-4 w-20 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <div className="h-5 w-24 rounded bg-zinc-800 mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
                <div className="h-9 w-9 rounded-lg bg-zinc-800 flex-shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 w-full rounded bg-zinc-800" />
                  <div className="h-3 w-20 rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <div className="h-5 w-28 rounded bg-zinc-800 mb-4" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-full rounded-md bg-zinc-800" />
            ))}
          </div>

          {/* Advisor Contact */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800" />
              <div className="space-y-1">
                <div className="h-4 w-28 rounded bg-zinc-800" />
                <div className="h-3 w-24 rounded bg-zinc-800" />
              </div>
            </div>
            <div className="h-9 w-full rounded-md bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  )
}
