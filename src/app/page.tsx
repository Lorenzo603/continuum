import { Suspense } from "react";
import { StreamBoard } from "@/components/StreamBoard";
import { StreamBoardSkeleton } from "@/components/StreamBoardSkeleton";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto max-w-screen-2xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Continuum</h1>
            <p className="text-sm text-muted">
              Timeline-based workstream organizer
            </p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-screen-2xl px-6 py-6">
        <Suspense fallback={<StreamBoardSkeleton />}>
          <StreamBoard />
        </Suspense>
      </div>
    </main>
  );
}
