"use client";

import { useEffect, useState } from "react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useThemeStore, hydrateTheme } from "@/stores/themeStore";
import { toast } from "sonner";

export function WorkspaceSidebar() {
  const {
    workspaces,
    activeWorkspaceId,
    loading,
    setActiveWorkspace,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaces();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    hydrateTheme();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSaving(true);
    try {
      const ws = await addWorkspace(newName.trim());
      if (ws) {
        toast.success("Workspace created");
        setNewName("");
        setIsCreating(false);
      }
    } catch {
      toast.error("Failed to create workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete workspace "${name}"? All streams and cards in it will be permanently deleted.`)) {
      return;
    }
    await deleteWorkspace(id);
    toast.success("Workspace deleted");
  };

  const startRename = (id: string, name: string) => {
    setEditingWorkspaceId(id);
    setEditingName(name);
  };

  const cancelRename = () => {
    setEditingWorkspaceId(null);
    setEditingName("");
  };

  const handleRename = async (id: string, currentName: string) => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === currentName) {
      cancelRename();
      return;
    }

    setRenaming(true);
    try {
      await updateWorkspace(id, { name: trimmed });
      toast.success("Workspace renamed");
      cancelRename();
    } catch {
      toast.error("Failed to rename workspace");
    } finally {
      setRenaming(false);
    }
  };

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-shrink-0 flex-col border-r border-border/50 bg-surface/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Workspaces
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded p-1 text-muted transition-colors hover:text-primary hover:bg-primary/10 cursor-pointer"
          title="New workspace"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Workspace list */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {loading && workspaces.length === 0 && (
          <div className="space-y-2 px-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-surface"
              />
            ))}
          </div>
        )}

        {workspaces.map((ws) => {
          const isEditing = editingWorkspaceId === ws.id;
          return (
            <div
              key={ws.id}
              role="button"
              tabIndex={isEditing ? -1 : 0}
              onClick={() => {
                if (!isEditing) setActiveWorkspace(ws.id);
              }}
              onKeyDown={(e) => {
                if (!isEditing && (e.key === "Enter" || e.key === " ")) {
                  setActiveWorkspace(ws.id);
                }
              }}
              className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all mb-0.5 ${
                ws.id === activeWorkspaceId
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/80 hover:bg-card hover:text-foreground"
              } ${isEditing ? "cursor-default" : "cursor-pointer"}`}
            >
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                  ws.id === activeWorkspaceId
                    ? "bg-primary/20 text-primary"
                    : "bg-border/50 text-muted"
                }`}
              >
                {ws.name.charAt(0).toUpperCase()}
              </div>

              {isEditing ? (
                <form
                  className="flex flex-1 items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRename(ws.id, ws.name);
                  }}
                >
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    className="w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                    autoFocus
                    disabled={renaming}
                  />
                  <button
                    type="submit"
                    disabled={renaming || !editingName.trim()}
                    className="cursor-pointer rounded p-1 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    title="Save name"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    disabled={renaming}
                    className="cursor-pointer rounded p-1 text-muted transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
                    title="Cancel rename"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </form>
              ) : (
                <>
                  <span className="flex-1 truncate">{ws.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(ws.id, ws.name);
                    }}
                    className="cursor-pointer rounded p-0.5 text-muted opacity-0 transition-all hover:text-primary group-hover:opacity-100"
                    title="Rename workspace"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L12 14l-4 1 1-4 8.414-8.414z" />
                    </svg>
                  </button>
                  {workspaces.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(ws.id, ws.name);
                      }}
                      className="cursor-pointer rounded p-0.5 text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                      title="Delete workspace"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}

        {workspaces.length === 0 && !loading && (
          <p className="px-3 py-4 text-xs text-muted text-center">
            No workspaces yet. Create one to get started.
          </p>
        )}
      </nav>

      {/* Create workspace inline form */}
      {isCreating && (
        <div className="border-t border-border/50 px-3 py-3">
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Workspace name…"
              className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm placeholder:text-muted focus:outline-none focus:border-primary"
              autoFocus
              disabled={saving}
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="cursor-pointer flex-1 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewName("");
                }}
                disabled={saving}
                className="cursor-pointer rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Theme toggle */}
      <div className="mt-auto border-t border-border/50 px-3 py-3">
        <button
          onClick={toggleTheme}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.005 9.005 0 0012 21a9.005 9.005 0 008.354-5.646z" />
            </svg>
          )}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>
    </aside>
  );
}
