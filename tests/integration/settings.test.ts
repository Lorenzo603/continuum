/**
 * Integration tests for src/lib/settings.ts against the real local Postgres DB.
 * Fixtures: dedicated user per test, settings row deleted in afterEach.
 */
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { getSettings, updateSettings } from "@/lib/settings";
import {
  deleteTestSettings,
  closeTestDb,
  makeTestUserId,
} from "./helpers/fixtures";

let testUserId: string | null = null;

describe("settings (integration)", () => {
  afterEach(async () => {
    if (testUserId) await deleteTestSettings(testUserId);
    testUserId = null;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("seeds a default row for a fresh user", async () => {
    testUserId = makeTestUserId();

    const settings = await getSettings(testUserId);

    expect(settings.prepopulateCardContent).toBe(true);
    expect(settings.userId).toBe(testUserId);
  });

  it("updates the setting and persists it", async () => {
    testUserId = makeTestUserId();

    await updateSettings(testUserId, { prepopulateCardContent: false });
    const settings = await getSettings(testUserId);

    expect(settings.prepopulateCardContent).toBe(false);
  });
});
