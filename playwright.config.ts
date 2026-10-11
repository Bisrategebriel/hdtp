import { defineConfig, devices } from "@playwright/test";

// Local by default; `pnpm test:e2e --project=prod` with BASE_URL set targets the deployed demo.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "local", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
    { name: "prod", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "pnpm dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
