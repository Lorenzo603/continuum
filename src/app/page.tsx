import { Suspense } from "react";
import { StreamBoard } from "@/components/StreamBoard";
import { StreamBoardSkeleton } from "@/components/StreamBoardSkeleton";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-background">
      {/* Workspace sidebar */}
      <WorkspaceSidebar />

      {/* Main content area */}
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
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6">
          <Suspense fallback={<StreamBoardSkeleton />}>
            <StreamBoard />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
