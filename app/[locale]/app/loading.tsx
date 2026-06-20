export default function AppLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-pulse">
      {/* Header: eyebrow + h1 */}
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-mk-border-subtle" />
        <div className="h-8 w-64 rounded bg-mk-border-subtle" />
      </div>

      {/* Setup cards (stacked full-width) */}
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-mk-border-subtle bg-surface-elevated p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-48 rounded bg-mk-border-subtle" />
                <div className="h-3 w-32 rounded bg-mk-border-subtle" />
              </div>
              <div className="h-6 w-24 rounded-md bg-mk-border-subtle shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Add another strip */}
      <div className="rounded-xl border border-dashed border-mk-border-subtle bg-surface-elevated p-5 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-mk-border-subtle" />
          <div className="h-3 w-44 rounded bg-mk-border-subtle" />
        </div>
        <div className="h-8 w-24 rounded-md bg-mk-border-subtle shrink-0" />
      </div>
    </div>
  );
}
