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
          <div className="mx-auto max-w-screen-2xl flex items-center gap-2.5 px-4 py-3.5 sm:px-6">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h1 className="text-lg font-bold tracking-tight">Continuum</h1>
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
