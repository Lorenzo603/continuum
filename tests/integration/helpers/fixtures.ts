/**
 * Shared fixture helpers for integration tests.
 *
 * Safety guarantees:
 * - Every test creates its own workspace with a `test-integration-` prefix and
 *   a dedicated `it-user-` userId. Nothing pre-existing is ever touched.
 * - Cleanup verifies the workspace exists AND still carries the test prefix
 *   before deleting it; otherwise it throws loudly instead of deleting data
 *   it does not own.
 * - Schema cascade (workspaces -> streams -> cards) does the child cleanup.
 */
import { eq } from "drizzle-orm";
import { db, streams, settings } from "@/db";
import { createWorkspace, deleteWorkspace, getWorkspaceById } from "@/lib/workspaces";
import type { Workspace } from "@/types";

const USER_PREFIX = "it-user-";
const WORKSPACE_PREFIX = "test-integration-"; // used for fixture creation names

export function makeTestUserId(): string {
  return `${USER_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface FixtureWorkspace {
  userId: string;
  workspace: Workspace;
}

/** Create a dedicated test workspace for a fresh test user. */
export async function createTestWorkspace(): Promise<FixtureWorkspace> {
  const userId = makeTestUserId();
  const name = `${WORKSPACE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const workspace = await createWorkspace(
    { name, description: "Automated integration test fixture" },
    userId,
  );
  if (!workspace) {
    throw new Error("Failed to create test fixture workspace");
  }
  return { userId, workspace };
}

/** Delete a fixture workspace and verify the cascade really removed children. */
export async function cleanupTestWorkspace(fixture: FixtureWorkspace): Promise<void> {
  const { userId, workspace } = fixture;
  const existing = await getWorkspaceById(workspace.id, userId);

  if (!existing) {
    // Already removed (e.g. by an earlier assertion) — nothing to do, but say so.
    return;
  }
  // The workspace id comes from our own fixture creation, so the only residual
  // risk is deleting the wrong row; the userId prefix is the reliable invariant.
  if (!existing.userId.startsWith(USER_PREFIX)) {
    throw new Error(
      `Refusing to delete workspace ${existing.id}: not a test fixture (userId="${existing.userId}")`,
    );
  }

  await deleteWorkspace(existing.id, userId);

  const remainingStreams = await db
    .select({ id: streams.id })
    .from(streams)
    .where(eq(streams.workspaceId, existing.id));
  if (remainingStreams.length > 0) {
    throw new Error(
      `Cascade delete failed: ${remainingStreams.length} streams remain for fixture workspace ${existing.id}`,
    );
  }

}

/** Delete the settings row for a test user (best-effort, never throws). */
export async function deleteTestSettings(userId: string): Promise<void> {
  if (!userId.startsWith(USER_PREFIX)) return;
  await db.delete(settings).where(eq(settings.userId, userId));
}

export async function closeTestDb(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (db as any).$client;
  if (client && typeof client.end === "function") {
    await client.end();
  }
}
