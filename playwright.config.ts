import { defineConfig, devices } from "@playwright/test";

// UI smoke tests for Continuum.
//
// These tests run against the app in its normal local auth mode
// (NEXT_PUBLIC_ENABLE_CLERK_AUTH=true + real Clerk Dev instance). They
// require a dedicated Clerk test account; credentials are read from env vars:
//   PLAYWRIGHT_CLERK_EMAIL     — email of the dedicated Clerk test user
//   PLAYWRIGHT_CLERK_PASSWORD  — password of the dedicated Clerk test user
// Never commit real credentials — pass them via the environment or a local,
// gitignored .env.local file.
export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false, // UI tests share one app instance; keep serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // The dev server reads .env itself; ensure Clerk mode is on.
      NEXT_PUBLIC_ENABLE_CLERK_AUTH: "true",
    },
  },
});
