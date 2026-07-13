export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-80 bg-muted/60 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-4 w-full bg-muted/60 rounded" />
            <div className="h-4 w-3/4 bg-muted/40 rounded" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-16 bg-muted rounded-full" />
              <div className="h-6 w-20 bg-muted/60 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}