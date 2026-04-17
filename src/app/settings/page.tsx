import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { SettingsContent } from "@/components/SettingsContent";

export const metadata = {
  title: "Settings — Continuum",
};

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen bg-background">
      <WorkspaceSidebar />

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
          </div>
        </header>

        <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <div className="mt-6">
            <SettingsContent />
          </div>
        </div>
      </div>
    </main>
  );
}
