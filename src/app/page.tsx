import { Suspense } from "react";
import { StreamBoard } from "@/components/StreamBoard";
import { StreamBoardSkeleton } from "@/components/StreamBoardSkeleton";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-screen-2xl flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight leading-tight">Continuum</h1>
            <p className="text-[11px] text-muted leading-tight truncate">Workstream timeline organizer</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
        <Suspense fallback={<StreamBoardSkeleton />}>
          <StreamBoard />
        </Suspense>
      </div>
    </main>
  );
}
