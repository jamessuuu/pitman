// Capture one named section, so a specific component can be judged at 1:1
// instead of inside a 7000px full-page thumbnail.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE;
const SELECTOR = process.env.SHOT_SELECTOR;
const NAME = process.env.SHOT_NAME ?? "section";
if (!BASE || !SELECTOR) { console.error("SHOT_BASE and SHOT_SELECTOR required"); process.exit(2); }
mkdirSync("docs/shots/after", { recursive: true });

const browser = await chromium.launch();
for (const vp of [{ name: "laptop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const el = page.locator(SELECTOR).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await el.screenshot({ path: `docs/shots/after/${NAME}-${vp.name}.png` });
  await ctx.close();
}
await browser.close();
console.log("section captures written");
