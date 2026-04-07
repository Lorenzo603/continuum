import Link from "next/link";

export default function WorkspaceNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-border/50 bg-card/50 p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Workspace not found</h1>
        <p className="mt-2 text-sm text-muted">
          This workspace ID is invalid or no longer exists.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Go to workspace selector
        </Link>
      </div>
    </div>
  );
}
