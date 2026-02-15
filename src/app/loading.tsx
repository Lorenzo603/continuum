export default function Loading() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto max-w-screen-2xl">
          <div className="h-6 w-32 animate-pulse rounded bg-surface" />
          <div className="mt-1 h-4 w-56 animate-pulse rounded bg-surface" />
        </div>
      </header>
      <div className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-5 w-40 rounded bg-surface mb-3" />
              <div className="flex gap-4">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-32 w-72 rounded-lg bg-surface flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
