// Name the elements that push past a narrow viewport, rather than guessing.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";

const BASE = process.env.SHOT_BASE;
const WIDTH = Number(process.env.PROBE_WIDTH ?? 320);
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 800 } });
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const offenders = await page.evaluate((w) => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > w + 1) {
      out.push({
        tag: el.tagName,
        cls: String(el.className || "").slice(0, 48),
        testid: el.getAttribute("data-testid"),
        right: Math.round(r.right),
        width: Math.round(r.width),
        scrollW: el.scrollWidth,
        text: (el.textContent || "").trim().slice(0, 34),
      });
    }
  }
  // Deepest offenders first: the innermost element is the real cause.
  return out.slice(-14);
}, WIDTH);

console.log(`viewport ${WIDTH} — ${offenders.length} overflowing element(s):`);
console.log(JSON.stringify(offenders, null, 2));
await browser.close();
