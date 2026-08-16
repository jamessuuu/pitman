import { defineConfig } from "vitest/config";

// Root-level `pnpm run unit` (packages/core's suite is the only one today).
// Explicitly scoped to packages/*/test — without this, vitest's default
// include glob (**/*.{test,spec}.ts) also picks up apps/web/e2e/*.spec.ts,
// which are Playwright tests, not vitest tests, and fail to even collect
// (test.describe()/test.setTimeout() are Playwright's, not vitest's).
export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/*/test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "apps/web/**"],
  },
});
