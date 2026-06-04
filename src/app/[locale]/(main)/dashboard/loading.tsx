export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8 space-y-8 animate-pulse font-sans">
      {/* Stats Bar Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-muted/60 rounded-2xl h-24 border border-border/40" />
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="flex items-center gap-3 flex-wrap">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-muted/60 rounded-xl h-10 w-36 border border-border/40" />
        ))}
      </div>

      {/* Tab Row */}
      <div className="flex gap-6 border-b border-border pb-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-muted/60 rounded-md h-4 w-20" />
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="bg-muted/60 rounded-xl h-10 flex-1 max-w-sm border border-border/40" />
        <div className="bg-muted/60 rounded-xl h-10 w-28 border border-border/40" />
        <div className="bg-muted/60 rounded-xl h-10 w-28 border border-border/40" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col">
            {/* Thumbnail */}
            <div className="h-[88px] bg-muted/50" />
            {/* Body */}
            <div className="p-4 space-y-3 flex-1">
              <div className="h-4 bg-muted/70 rounded-md w-3/4" />
              <div className="h-3 bg-muted/50 rounded-md w-full" />
              <div className="h-3 bg-muted/50 rounded-md w-2/3" />
              <div className="flex gap-2 pt-1">
                <div className="h-5 bg-muted/60 rounded-full w-16" />
                <div className="h-5 bg-muted/40 rounded-full w-4" />
                <div className="h-5 bg-muted/60 rounded-full w-16" />
              </div>
            </div>
            {/* Footer */}
            <div className="px-4 py-3 border-t border-border/40 bg-muted/20 flex justify-between">
              <div className="h-3 bg-muted/50 rounded w-16" />
              <div className="h-3 bg-muted/50 rounded w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
