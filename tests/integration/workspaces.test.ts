/**
 * Integration tests for src/lib/workspaces.ts against the real local Postgres DB.
 * Fixtures: one dedicated workspace per test, deleted in afterEach.
 * No existing data is touched.
 */
import { describe, it, expect, afterEach, afterAll } from "vitest";
import {
  getAllWorkspaces,
  getWorkspaceById,
  getWorkspaceByName,
  createWorkspace,
  updateWorkspace,
  reorderWorkspaces,
  deleteWorkspace,
} from "@/lib/workspaces";
import { createTestWorkspace, cleanupTestWorkspace, closeTestDb, type FixtureWorkspace } from "./helpers/fixtures";

let fixture: FixtureWorkspace;

describe("workspaces (integration)", () => {
  afterEach(async () => {
    if (fixture) await cleanupTestWorkspace(fixture);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("creates a workspace and assigns sequential orderIndex values", async () => {
    fixture = await createTestWorkspace();
    const second = await createWorkspace({ name: "it-second-workspace" }, fixture.userId);

    expect(fixture.workspace.orderIndex).toBe(0);
    expect(second.orderIndex).toBe(1);

    // Clean up the extra workspace too
    await deleteWorkspace(second.id, fixture.userId);
  });

  it("gets a workspace by id and by name, scoped to the owner", async () => {
    fixture = await createTestWorkspace();

    const byId = await getWorkspaceById(fixture.workspace.id, fixture.userId);
    const byName = await getWorkspaceByName(fixture.workspace.name, fixture.userId);

    expect(byId?.id).toBe(fixture.workspace.id);
    expect(byName?.id).toBe(fixture.workspace.id);
  });

  it("returns null when the workspace belongs to a different user", async () => {
    fixture = await createTestWorkspace();

    const byId = await getWorkspaceById(fixture.workspace.id, "it-user-someone-else");
    const byName = await getWorkspaceByName(fixture.workspace.name, "it-user-someone-else");

    expect(byId).toBeNull();
    expect(byName).toBeNull();
  });

  it("updates name and description", async () => {
    fixture = await createTestWorkspace();

    const updated = await updateWorkspace(
      fixture.workspace.id,
      { name: "renamed-workspace", description: "new desc" },
      fixture.userId,
    );

    expect(updated?.name).toBe("renamed-workspace");
    expect(updated?.description).toBe("new desc");
  });

  it("reorders workspaces and persists the new order", async () => {
    fixture = await createTestWorkspace();
    const second = await createWorkspace({ name: "it-second-workspace" }, fixture.userId);

    await reorderWorkspaces([second.id, fixture.workspace.id], fixture.userId);

    const all = await getAllWorkspaces(fixture.userId);
    expect(all.map((w: { id: string }) => w.id)).toEqual([second.id, fixture.workspace.id]);

    await deleteWorkspace(second.id, fixture.userId);
  });

  it("reorderWorkspaces throws when an id is not owned by the user", async () => {
    fixture = await createTestWorkspace();

    await expect(
      reorderWorkspaces([fixture.workspace.id, "00000000-0000-0000-0000-000000000000"], fixture.userId),
    ).rejects.toThrow("Workspace not found");
  });

  it("lists workspaces ordered by orderIndex then createdAt", async () => {
    fixture = await createTestWorkspace();
    const second = await createWorkspace({ name: "it-second-workspace" }, fixture.userId);

    const all = await getAllWorkspaces(fixture.userId);
    expect(all.map((w: { id: string }) => w.id)).toEqual([fixture.workspace.id, second.id]);

    await deleteWorkspace(second.id, fixture.userId);
  });
});
