// Name the control the gate is calling clipped, instead of guessing at it.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";

const BASE = process.env.SHOT_BASE;
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }

const browser = await chromium.launch();
for (const vp of [{ name: "laptop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const found = await page.evaluate(() => {
    const out = [];
    for (const c of document.querySelectorAll("button,[role=button],input,select,a[href]")) {
      const r = c.getBoundingClientRect();
      if (r.width > 0 && (r.right > innerWidth + 1 || r.left < -1)) {
        out.push({
          tag: c.tagName,
          type: c.getAttribute("type"),
          testid: c.getAttribute("data-testid"),
          cls: c.className && String(c.className).slice(0, 60),
          text: (c.textContent || "").trim().slice(0, 40),
          left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
          innerWidth,
        });
      }
    }
    return out;
  });
  console.log(vp.name, JSON.stringify(found, null, 2));
  await ctx.close();
}
await browser.close();
