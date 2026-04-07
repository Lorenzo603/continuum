export default function LatestCardsLoading() {
  return (
    <main className="flex min-h-screen bg-background">
      <aside className="sticky top-0 h-screen w-60 flex-shrink-0 border-r border-border/50 bg-surface/40" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background">
          <div className="mx-auto max-w-screen-2xl px-4 py-3.5 sm:px-6">
            <div className="h-7 w-36 animate-pulse rounded bg-surface" />
          </div>
        </header>

        <section className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6" aria-label="Loading latest cards">
          <div className="mb-6 flex gap-2">
            <div className="h-8 w-24 animate-pulse rounded-full bg-surface" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-surface" />
          </div>

          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <div key={index} className="mb-4 break-inside-avoid rounded-xl border border-border/50 bg-card/60 p-4">
                <div className="h-5 w-2/3 animate-pulse rounded bg-surface" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-surface" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-surface" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-surface" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-surface" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}