// Screenshot harness. Port comes from an env var and the caller owns the
// server — never a fixed port with reuseExistingServer, which is how two
// projects today screenshotted a DIFFERENT project's site.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";
import { mkdirSync, readFileSync } from "node:fs";
import { PNG_SIZE } from "./png-size.mjs";

const BASE = process.env.SHOT_BASE;
if (!BASE) {
  console.error("SHOT_BASE env var required, e.g. http://127.0.0.1:5199");
  process.exit(2);
}
const TAG = process.argv[2] ?? "after";
const OUT = `docs/shots/${TAG}`;
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "laptop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];
const ROUTES = [
  { path: "/", slug: "home" },
  { path: "/method", slug: "method" },
  { path: "/reference", slug: "reference" },
  { path: "/docs/limitations", slug: "limitations" },
];

const browser = await chromium.launch();
const rows = [];
// A screenshot of a page that threw on boot still looks plausible: the shell
// renders, the PNG is the right size, and the harness reports success. Listen
// for the throw, or this tool can certify a broken build.
const pageErrors = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => pageErrors.push(`[${vp.name}] pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(`[${vp.name}] console.error: ${msg.text()}`);
  });
  page.on("requestfailed", (req) => {
    pageErrors.push(`[${vp.name}] request failed: ${req.url()} (${req.failure()?.errorText})`);
  });
  for (const route of ROUTES) {
    await page.goto(BASE + route.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const file = `${OUT}/${route.slug}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    const png = PNG_SIZE(readFileSync(file));
    rows.push({
      route: route.path,
      vp: vp.name,
      viewportWidth: vp.width,
      pngWidth: png.width,
      pngHeight: png.height,
      scrollWidth: metrics.scrollWidth,
      clientWidth: metrics.clientWidth,
      overflow: png.width > vp.width ? "PNG-OVERFLOW" : metrics.scrollWidth > metrics.clientWidth ? "SCROLL-OVERFLOW" : "ok",
    });
  }
  await ctx.close();
}

await browser.close();
console.table(rows);

let failed = false;
const bad = rows.filter((r) => r.overflow !== "ok");
if (bad.length > 0) {
  console.error(`\n${bad.length} viewport/route pair(s) overflow horizontally.`);
  failed = true;
}
if (pageErrors.length > 0) {
  console.error(`\n${pageErrors.length} runtime error(s) while capturing — these screenshots are NOT evidence:`);
  for (const e of pageErrors) console.error(`  ${e}`);
  failed = true;
}
if (failed) process.exit(1);
console.log("\nAll routes fit their viewport at both real PNG width and scrollWidth.");
console.log("No pageerror, console.error, or failed request during capture.");
