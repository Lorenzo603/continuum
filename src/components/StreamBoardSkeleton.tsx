export function StreamBoardSkeleton() {
  return (
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
  );
}
