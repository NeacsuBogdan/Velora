import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm exec tsx tests/e2e/mock-api/server.ts",
      port: 4000,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @velora/storefront dev",
      port: 3000,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: "pnpm --filter @velora/admin dev",
      port: 3001,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
