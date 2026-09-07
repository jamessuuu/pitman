// Fold-only captures, at 1:1, so the above-the-fold decision can be judged
// at real scale instead of inside a 4800px full-page thumbnail.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE;
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }
mkdirSync("docs/shots/after", { recursive: true });

const browser = await chromium.launch();
for (const vp of [{ name: "laptop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `docs/shots/after/fold-${vp.name}.png`, fullPage: false });
  await ctx.close();
}
await browser.close();
console.log("fold captures written");
