// Contrast of the emphasis colour against the surface it actually sits on,
// measured from computed styles in both light and dark schemes rather than
// reasoned about from hex values.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";

const BASE = process.env.SHOT_BASE;
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }

const browser = await chromium.launch();
let worst = 21;

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const rows = await page.evaluate(() => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(",").map((v) => parseFloat(v));
      return [p[0], p[1], p[2]];
    };
    const lum = (rgb) => {
      const a = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    // Walk up for the first non-transparent background.
    const bgOf = (el) => {
      let n = el;
      while (n) {
        const c = getComputedStyle(n).backgroundColor;
        const rgb = parse(c);
        if (rgb && !/rgba\([^)]*,\s*0\)/.test(c)) return rgb;
        n = n.parentElement;
      }
      return [255, 255, 255];
    };
    const out = [];
    for (const el of document.querySelectorAll("em, i")) {
      const fg = parse(getComputedStyle(el).color);
      const bg = bgOf(el);
      const l1 = lum(fg), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      out.push({
        text: el.textContent.trim().slice(0, 24),
        fg: `rgb(${fg.join(",")})`,
        bg: `rgb(${bg.join(",")})`,
        weight: getComputedStyle(el).fontWeight,
        style: getComputedStyle(el).fontStyle,
        ratio: Math.round(ratio * 100) / 100,
      });
    }
    return out;
  });

  console.log(`\n${scheme}:`);
  for (const r of rows) {
    const pass = r.ratio >= 4.5 ? "PASS" : "FAIL";
    if (r.ratio < worst) worst = r.ratio;
    console.log(`  ${pass}  ${r.ratio.toFixed(2)}:1  weight ${r.weight} style ${r.style}  "${r.text}"  ${r.fg} on ${r.bg}`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\nworst emphasis contrast: ${worst.toFixed(2)}:1 (AA body text needs 4.5:1)`);
process.exit(worst >= 4.5 ? 0 : 1);
