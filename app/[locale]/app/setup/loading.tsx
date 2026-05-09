export default function SetupLoading() {
  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl animate-pulse space-y-8">
        {/* Stepper skeleton */}
        <div className="hidden md:flex items-start justify-between w-full">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="size-8 rounded-full bg-mk-border-subtle" />
              <div className="h-2.5 w-16 rounded bg-mk-border-subtle" />
              <div className="h-2 w-12 rounded bg-mk-border-subtle" />
            </div>
          ))}
        </div>

        {/* Form area skeleton */}
        <div className="rounded-2xl border border-mk-border-subtle bg-surface-elevated p-8 space-y-5">
          <div className="h-6 w-48 rounded bg-mk-border-subtle" />
          <div className="h-4 w-72 rounded bg-mk-border-subtle" />

          <div className="space-y-3 mt-4">
            <div className="h-3 w-24 rounded bg-mk-border-subtle" />
            <div className="h-10 w-full rounded-lg bg-mk-border-subtle" />
          </div>

          <div className="h-10 w-40 rounded-lg bg-mk-border-subtle mt-2" />
        </div>
      </div>
    </div>
  );
}
