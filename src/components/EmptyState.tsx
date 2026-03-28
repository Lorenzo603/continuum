interface EmptyStateProps {
  onCreateStream: () => void;
}

export function EmptyState({ onCreateStream }: EmptyStateProps) {
  return (
    <div className="max-w-md py-16 animate-fade-up">
      <h2 className="text-2xl font-bold tracking-tight">Start your first stream</h2>
      <p className="mt-3 text-sm text-muted leading-relaxed">
        A stream is a living timeline of your work. Each update becomes a new
        card while every previous version is preserved — so nothing is ever lost.
      </p>
      <button
        onClick={onCreateStream}
        className="cursor-pointer mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Create a stream
      </button>
    </div>
  );
}
