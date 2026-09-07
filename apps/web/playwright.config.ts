import { defineConfig, devices } from "@playwright/test";

// Port comes from an env var and the server is NEVER reused.
//
// This used to pin port 4173 with `reuseExistingServer: !process.env.CI`. That
// combination is how two sibling projects in this portfolio ran their entire
// e2e suite against a DIFFERENT project's website and reported failures that
// had nothing to do with them: whatever already held the port answered, and
// Playwright happily asserted against a stranger. A suite that can silently
// test the wrong site is worse than no suite, so the port is now explicit and
// the server is always this run's own.
const PORT = Number(process.env.PITMAN_E2E_PORT ?? 4319);
// Bind and probe the SAME stack: `vite preview` defaults to a host that
// can resolve IPv6-only, while Playwright's readiness probe hits IPv4 —
// which reads as a server that never came up. Pin both to 127.0.0.1.
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    // vite is invoked DIRECTLY, not through `pnpm run preview -- <flags>`.
    // pnpm forwards a literal "--" as argv[0], so vite discarded every flag
    // after it and silently fell back to its default port 4173 — the exact
    // port a sibling project holds. Combined with the old
    // `reuseExistingServer: true`, that is how a suite ends up asserting
    // against another project's website. Verified: with the old form vite
    // logged "Port 4173 is in use, trying another one..." and bound 4175.
    command: `pnpm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    // Never reuse. If the port is busy the run fails loudly instead of
    // testing whatever else happens to be listening.
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
