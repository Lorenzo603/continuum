"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { AuthControls } from "@/components/AuthControls";
import { useWorkspaces } from "@/hooks/useWorkspaces";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const {
    workspaces,
    loading,
    error: loadError,
    authRequired,
  } = useWorkspaces();

  return (
    <main className="flex min-h-screen bg-background">
      <WorkspaceSidebar currentWorkspaceId={null} />

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background">
          <div className="mx-auto max-w-screen-2xl flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <img
              src="/img/logo/continuum-logo-light.svg"
              alt="Continuum"
              className="h-7 w-auto block dark:hidden"
            />
            <img
              src="/img/logo/continuum-logo-dark.svg"
              alt="Continuum"
              className="h-7 w-auto hidden dark:block"
            />
            <AuthControls />
          </div>
        </header>
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6">
          <section className="rounded-xl border border-border/50 bg-card/40 p-6 sm:p-8">
            <h1 className="text-xl font-semibold text-foreground">Choose a workspace</h1>
            <p className="mt-2 text-sm text-muted">
              Select a workspace to open its board. Workspace boards are available at the URL pattern /workspace/&lt;id&gt;.
            </p>

            {!isLoaded ? (
              <p className="mt-6 text-sm text-muted">Checking session...</p>
            ) : !isSignedIn || authRequired ? (
              <div className="mt-6 rounded-lg border border-border/50 bg-card/40 p-4">
                <p className="text-sm text-muted">Sign in to view your workspaces.</p>
                <div className="mt-3">
                  <AuthControls />
                </div>
              </div>
            ) : loading ? (
              <p className="mt-6 text-sm text-muted">Loading workspaces...</p>
            ) : loadError ? (
              <p className="mt-6 text-sm text-danger">{loadError}</p>
            ) : workspaces.length === 0 ? (
              <p className="mt-6 text-sm text-muted">
                No workspaces yet. Create one from the sidebar to get started.
              </p>
            ) : (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workspaces.map((workspace) => (
                  <li key={workspace.id}>
                    <Link
                      href={`/workspace/${workspace.id}`}
                      className="group flex items-center justify-between rounded-lg border border-border/50 bg-background px-4 py-3 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-card"
                    >
                      <span className="truncate font-medium">{workspace.name}</span>
                      <svg
                        className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
