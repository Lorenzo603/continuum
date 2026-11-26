/**
 * UI smoke suite for Continuum — runs against the app in its normal local
 * Clerk auth mode (dev server on port 4000, NEXT_PUBLIC_ENABLE_CLERK_AUTH=true).
 *
 * Requires a dedicated Clerk test account in the Clerk Dev instance:
 *   PLAYWRIGHT_CLERK_EMAIL     — email of the dedicated Clerk test user
 *   PLAYWRIGHT_CLERK_PASSWORD  — password of the dedicated Clerk test user
 *
 * Credentials are read from the environment and never committed.
 *
 * Flow under test: unauthenticated redirect to Clerk sign-in, Clerk sign-in,
 * workspace sidebar rendering, and workspace creation via the sidebar.
 * The workspace created by the smoke test is deleted through the same API the
 * app uses, so no test data is left behind in the dev database.
 */
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.PLAYWRIGHT_CLERK_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_CLERK_PASSWORD;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000";

function requireCredentials() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Missing PLAYWRIGHT_CLERK_EMAIL / PLAYWRIGHT_CLERK_PASSWORD. " +
        "Create a dedicated test user in the Clerk Dev instance (Dashboard → Users → Add test user) " +
        "and export the credentials before running npm run test:ui.",
    );
  }
}

/** Fill the Clerk hosted sign-in form and submit. */
async function signIn(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/accounts\.dev\/sign-in|\/sign-in/, { timeout: 20_000 });

  await page.getByPlaceholder(/email address/i).fill(EMAIL!);
  await page.getByPlaceholder(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /continue|sign in/i }).first().click();

  // After sign-in Clerk redirects back to the app root.
  await expect(page).toHaveURL(BASE_URL + "/", { timeout: 30_000 });
}

test.describe("Continuum smoke (Clerk test account)", () => {
  test("unauthenticated visitor is sent to a sign-in page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/accounts\.dev\/sign-in|\/sign-in/, { timeout: 20_000 });
  });

  test("signed-in user lands on the app and sees the sidebar", async ({ page }) => {
    requireCredentials();
    await signIn(page);

    // Sidebar exposes the "New workspace" action once signed in.
    await expect(page.getByRole("button", { name: /new workspace/i })).toBeVisible({ timeout: 20_000 });
    // App shell renders (stream board area is reachable).
    await expect(page.locator("body")).toContainText(/workspace|stream/i);
  });

  test("user can create a workspace in the sidebar (and is cleaned up)", async ({ page }) => {
    requireCredentials();
    await signIn(page);

    const name = `uitest-${Date.now()}`;
    await page.getByRole("button", { name: /new workspace/i }).click();

    const input = page.getByPlaceholder(/workspace name/i);
    await expect(input).toBeVisible();
    await input.fill(name);
    await page.getByRole("button", { name: /^create$/i }).click();

    // The new workspace appears in the sidebar.
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 20_000 });

    // Best-effort cleanup through the same authenticated session the app uses.
    try {
      const listRes = await page.request.get("/api/workspaces");
      expect(listRes.ok()).toBeTruthy();
      const workspaces = (await listRes.json()) as Array<{ id: string; name: string }>;
      const created = workspaces.find((w) => w.name === name);
      if (created) {
        const res = await page.request.delete(`/api/workspaces/${created.id}`);
        expect(res.ok()).toBeTruthy();
      }
    } catch (error) {
      console.warn("Smoke-test cleanup failed (workspace left in dev DB):", error);
    }
  });
});
