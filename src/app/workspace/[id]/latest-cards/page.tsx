import { notFound } from "next/navigation";
import { LatestCardTile } from "@/components/LatestCardTile";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { WorkspaceViewNav } from "@/components/WorkspaceViewNav";
import { getLatestCardsByWorkspace } from "@/lib/latestCards";
import { workspaceIdParamSchema } from "@/lib/validations";
import { getWorkspaceById } from "@/lib/workspaces";

interface LatestCardsPageProps {
  params: Promise<{ id?: string }>;
}

export default async function LatestCardsPage({ params }: LatestCardsPageProps) {
  const { id } = await params;
  const parsedId = workspaceIdParamSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const workspace = await getWorkspaceById(parsedId.data);

  if (!workspace) {
    notFound();
  }

  const latestCards = await getLatestCardsByWorkspace(workspace.id);

  return (
    <main className="flex min-h-screen bg-background">
      <WorkspaceSidebar currentWorkspaceId={workspace.id} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background">
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <img
                src="/img/logo/continuum-logo-light.svg"
                alt="Continuum"
                className="block h-7 w-auto dark:hidden"
              />
              <img
                src="/img/logo/continuum-logo-dark.svg"
                alt="Continuum"
                className="hidden h-7 w-auto dark:block"
              />
            </div>
            <p className="truncate text-sm text-muted" title={workspace.name}>
              {workspace.name}
            </p>
          </div>
        </header>

        <section className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6" aria-labelledby="latest-cards-heading">
          <WorkspaceViewNav workspaceId={workspace.id} />

          <div className="mb-5">
            <h1 id="latest-cards-heading" className="text-xl font-semibold text-foreground">
              Latest Cards
            </h1>
            <p className="mt-1 text-sm text-muted">
              Most recent card per stream, ordered by stream position.
            </p>
          </div>

          {latestCards.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center">
              <h2 className="text-base font-semibold text-foreground">No latest cards yet</h2>
              <p className="mt-2 text-sm text-muted">
                This workspace has no streams with cards. Add a card in any stream to populate this view.
              </p>
            </div>
          ) : (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4">
              {latestCards.map((item) => (
                <LatestCardTile key={item.streamId} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}