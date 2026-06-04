export default function WorkflowLoading() {
  return (
    <div className="h-screen w-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-pulse text-muted-foreground">
        {/* Canvas skeleton */}
        <div className="relative w-64 h-40 rounded-2xl border border-border/50 bg-muted/30 overflow-hidden">
          {/* Mock nodes */}
          <div className="absolute top-6 left-6 w-20 h-10 bg-muted/60 rounded-xl border border-border/40" />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-10 bg-muted/60 rounded-xl border border-border/40" />
          <div className="absolute top-6 right-6 w-20 h-10 bg-muted/60 rounded-xl border border-border/40" />
          {/* Mock edges */}
          <div className="absolute top-11 left-[108px] w-8 h-0.5 bg-border/60" />
          <div className="absolute top-11 right-[98px] w-8 h-0.5 bg-border/60" />
        </div>
        <p className="text-sm font-medium">Loading canvas…</p>
      </div>
    </div>
  );
}
