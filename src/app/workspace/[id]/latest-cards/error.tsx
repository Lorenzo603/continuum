"use client";

export default function LatestCardsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
        <h2 className="text-lg font-semibold text-danger">Latest Cards could not load</h2>
        <p className="mt-2 text-sm text-muted">
          {error.message || "An unexpected error occurred while loading the latest cards view."}
        </p>
        <button
          onClick={reset}
          className="mt-4 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Try again
        </button>
      </div>
    </div>
  );
}