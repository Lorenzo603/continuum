export default function WorkspaceLoading() {
  return (
    <main className="flex min-h-screen bg-background">
      <aside className="sticky top-0 h-screen w-60 flex-shrink-0 border-r border-border/50 bg-surface/40" />

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background">
          <div className="mx-auto max-w-screen-2xl px-4 py-3.5 sm:px-6">
            <div className="h-7 w-36 animate-pulse rounded bg-surface" />
          </div>
        </header>

        <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-3 h-5 w-40 rounded bg-surface" />
                <div className="flex gap-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="h-32 w-72 rounded-lg bg-surface" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
