import { defineConfig, devices } from "@playwright/test";

// e2e content (fixture-clip transcription, mic-denied fallback, provider
// readback, a11y walkthrough) is written milestone-by-milestone starting M2
// (docs/pitman-SPEC.md "Verification plan"). This config is scaffold-level.
export default defineConfig({
  testDir: "./e2e",
  // Each transcription test downloads a real model (30-190MB) from the
  // same CDN. Running these in parallel (Playwright's default worker count
  // scales with CPU cores) causes real bandwidth contention and spurious
  // timeouts — reproduced during M2 verification (default parallelism:
  // multiple flaky/failed loads; workers:1: 9/9 green, ~3.3min). Sequential
  // execution trades a few minutes of CI time for determinism, which is
  // the right trade for a suite this size.
  fullyParallel: false,
  workers: 1,
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
