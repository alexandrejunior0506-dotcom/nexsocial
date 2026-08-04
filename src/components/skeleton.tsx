export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[var(--surface-hover)] ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-3 h-4 w-24" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
