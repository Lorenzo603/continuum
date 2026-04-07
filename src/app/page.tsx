"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import type { Workspace } from "@/types";

export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadWorkspaces = async () => {
      try {
        setLoadError(null);
        const response = await fetch("/api/workspaces", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load workspaces");
        }

        const data: Workspace[] = await response.json();
        setWorkspaces(data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Failed to load workspaces");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadWorkspaces();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="flex min-h-screen bg-background">
      <WorkspaceSidebar currentWorkspaceId={null} />

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background">
          <div className="mx-auto max-w-screen-2xl flex items-center px-4 py-3.5 sm:px-6">
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
          </div>
        </header>
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6">
          <section className="rounded-xl border border-border/50 bg-card/40 p-6 sm:p-8">
            <h1 className="text-xl font-semibold text-foreground">Choose a workspace</h1>
            <p className="mt-2 text-sm text-muted">
              Select a workspace to open its board. Workspace boards are available at the URL pattern /workspace/&lt;id&gt;.
            </p>

            {loading ? (
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
