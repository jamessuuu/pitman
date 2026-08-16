import { defineConfig, devices } from "@playwright/test";

// e2e content (fixture-clip transcription, mic-denied fallback, provider
// readback, a11y walkthrough) is written milestone-by-milestone starting M2
// (docs/pitman-SPEC.md "Verification plan"). This config is scaffold-level.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm run build && pnpm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
