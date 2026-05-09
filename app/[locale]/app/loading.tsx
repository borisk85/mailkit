export default function AppLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-mk-border-subtle" />
        <div className="h-8 w-64 rounded bg-mk-border-subtle" />
        <div className="h-4 w-80 rounded bg-mk-border-subtle" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-mk-border-subtle bg-surface-elevated p-6 space-y-3"
          >
            <div className="h-4 w-3/4 rounded bg-mk-border-subtle" />
            <div className="h-3 w-full rounded bg-mk-border-subtle" />
            <div className="h-3 w-2/3 rounded bg-mk-border-subtle" />
          </div>
        ))}
      </div>

      {/* Wide card skeleton */}
      <div className="rounded-xl border border-mk-border-subtle bg-surface-elevated p-6 space-y-3">
        <div className="h-4 w-40 rounded bg-mk-border-subtle" />
        <div className="h-3 w-full rounded bg-mk-border-subtle" />
        <div className="h-3 w-5/6 rounded bg-mk-border-subtle" />
        <div className="h-8 w-28 rounded bg-mk-border-subtle mt-2" />
      </div>
    </div>
  );
}
