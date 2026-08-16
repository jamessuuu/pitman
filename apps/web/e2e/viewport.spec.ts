// BATCH-2-STANDARDS.md MUST: "320px renders without horizontal scroll —
// verified by a real screenshot." Cheap, fast, no model load required, so
// it stays @smoke.
import { test, expect } from "@playwright/test";

const PAGES = ["/", "/method", "/docs/limitations"];

test.describe("320px no horizontal scroll @smoke", () => {
  for (const path of PAGES) {
    test(`${path} fits 320px width`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `document.documentElement.scrollWidth (${scrollWidth}) exceeds clientWidth (${clientWidth}) at 320px on ${path}`).toBeLessThanOrEqual(clientWidth);
    });
  }
});
