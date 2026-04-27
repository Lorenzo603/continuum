import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { StreamBoard } from "@/components/StreamBoard";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { AuthControls } from "@/components/AuthControls";
import { getWorkspaceById } from "@/lib/workspaces";
import { workspaceIdParamSchema } from "@/lib/validations";

interface WorkspacePageProps {
  params: Promise<{ id?: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const { id } = await params;
  const parsedId = workspaceIdParamSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const workspace = await getWorkspaceById(parsedId.data, userId);
  if (!workspace) {
    notFound();
  }

  return (
    <main className="flex min-h-screen bg-background">
      <WorkspaceSidebar currentWorkspaceId={workspace.id} />

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background">
          <div className="mx-auto max-w-screen-2xl flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
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
            <div className="flex min-w-0 items-center gap-3">
              <p className="truncate text-sm text-muted" title={workspace.name}>
                {workspace.name}
              </p>
              <AuthControls />
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6">
          <StreamBoard workspaceId={workspace.id} />
        </div>
      </div>
    </main>
  );
}
