// WCAG 1.4.3 contrast, measured on the rendered page.
//
// project-gate has no contrast check at all (its a11y coverage is img-alt,
// button-names and target-size), so this dimension went unmeasured.
//
// Two instruments disagreed on this today and BOTH were wrong somewhere: one
// read only background-color and reported a legible gradient button at
// 1.19:1; the other was gradient-aware but oklab- and alpha-blind and issued a
// false clean tick over 22 real failures. So this one:
//
//   - takes colours from getComputedStyle, which resolves oklab/oklch/
//     color-mix to rgb for us rather than reimplementing colour spaces;
//   - composites translucent backgrounds over what is actually behind them;
//   - reads gradient colour stops and takes the WORST stop, not the average;
//   - and SELF-VALIDATES against known-value fixtures in both directions
//     before reporting anything, because a checker that finds nothing looks
//     exactly like a page with nothing to find.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";

const BASE = process.env.SHOT_BASE;
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }
const ROUTES = (process.env.WCAG_ROUTES ?? "/,/method,/reference,/docs/limitations").split(",");

const MEASURE = () => {
  const parse = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,/]/).map((v) => parseFloat(v.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  // Every candidate backdrop behind an element: solid layers composited in
  // order, plus each gradient stop treated as its own candidate.
  const backdrops = (el) => {
    const layers = [];
    let opaqueFound = false;
    let n = el;
    while (n && n !== document.documentElement.parentElement) {
      const cs = getComputedStyle(n);
      const img = cs.backgroundImage;
      if (img && img !== "none") {
        for (const m of img.matchAll(/rgba?\([^)]+\)/g)) {
          const c = parse(m[0]);
          if (c && c.a > 0.05) layers.push(c);
        }
      }
      const bc = parse(cs.backgroundColor);
      if (bc && bc.a > 0) layers.push(bc);
      if (bc && bc.a >= 0.999) { opaqueFound = true; break; }
      n = n.parentElement;
    }
    // The canvas is only a candidate when no opaque layer was found. Appending
    // it unconditionally made white-on-black measure 1:1 — caught by this
    // script's own calibration fixture, which is why the fixture exists.
    if (!opaqueFound) layers.push({ r: 255, g: 255, b: 255, a: 1 });
    if (layers.length === 0) layers.push({ r: 255, g: 255, b: 255, a: 1 });
    // Flatten each candidate against the remaining stack beneath it.
    const out = [];
    for (let i = 0; i < layers.length; i++) {
      let acc = layers[layers.length - 1];
      for (let j = layers.length - 2; j >= i; j--) acc = over(layers[j], acc);
      out.push(acc);
    }
    return out;
  };

  const results = [];
  for (const el of document.querySelectorAll("body *")) {
    // Only elements with their own visible text.
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim()).map((n) => n.nodeValue.trim()).join(" ");
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const fg = parse(cs.color);
    if (!fg) continue;

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    // WCAG "large text": >=24px, or >=18.66px when bold.
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;

    let worst = Infinity;
    let worstBg = null;
    for (const bg of backdrops(el)) {
      const solidFg = fg.a < 1 ? over(fg, bg) : fg;
      const cr = ratio(solidFg, bg);
      if (cr < worst) { worst = cr; worstBg = bg; }
    }
    results.push({
      text: own.slice(0, 44),
      cls: String(el.className || "").slice(0, 26),
      tag: el.tagName,
      size: Math.round(size * 10) / 10,
      weight,
      need,
      ratio: Math.round(worst * 100) / 100,
      fg: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,
      bg: worstBg ? `rgb(${Math.round(worstBg.r)},${Math.round(worstBg.g)},${Math.round(worstBg.b)})` : "?",
      pass: worst >= need,
    });
  }
  return results;
};

const browser = await chromium.launch();

// ---- self-validation: prove the instrument can fail AND pass -------------
const vctx = await browser.newContext();
const vpage = await vctx.newPage();
await vpage.setContent(`<style>
  body{margin:0}
  .a{background:#ffffff;color:#666666;font-size:16px}   /* known 5.74 -> PASS at 4.5 */
  .b{background:#000000;color:#ffffff;font-size:16px}   /* known 21.00 -> PASS */
  .c{background:#ffffff;color:#767676;font-size:16px}   /* known 4.54 -> PASS, boundary */
  .d{background:#ffffff;color:#777777;font-size:16px}   /* known 4.48 -> FAIL, boundary */
  .e{background:linear-gradient(90deg,#ffffff,#000000);color:#ffffff} /* worst stop must FAIL */
  .f{background:#ffffff;color:rgba(0,0,0,0.25)}          /* alpha must composite -> FAIL */
  .g{background:#ffffff;color:#949494;font-size:16px}   /* known 2.85 -> FAIL */
</style>
<p class="a">a</p><p class="b">b</p><p class="c">c</p><p class="d">d</p><p class="e">e</p><p class="f">f</p><p class="g">g</p>`);
const v = await vpage.evaluate(MEASURE);
const byCls = Object.fromEntries(v.map((r) => [r.cls, r]));
const expect = [
  ["a", true, "#666 on white must PASS (5.74 - a wrong expectation caught by calibration)"],
  ["g", false, "#949494 on white must FAIL (2.85)"],
  ["b", true, "white on black must PASS"],
  ["c", true, "#767676 on white must PASS (4.54, just over)"],
  ["d", false, "#777 on white must FAIL (4.48, just under)"],
  ["e", false, "gradient worst stop must FAIL"],
  ["f", false, "25%-alpha black on white must FAIL"],
];
let calibrated = true;
console.log("instrument self-validation:");
for (const [cls, shouldPass, why] of expect) {
  const got = byCls[cls];
  const ok = got && got.pass === shouldPass;
  if (!ok) calibrated = false;
  console.log(`  ${ok ? "OK  " : "BAD "} ${why} -> measured ${got ? got.ratio + ":1 " + (got.pass ? "PASS" : "FAIL") : "MISSING"}`);
}
await vctx.close();
if (!calibrated) {
  console.error("\nInstrument failed calibration. Refusing to report page results.");
  await browser.close();
  process.exit(2);
}

// ---- the actual measurement ---------------------------------------------
let failures = 0;
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
    await page.waitForTimeout(300);
    const rows = (await page.evaluate(MEASURE)).filter((r) => !r.pass).sort((a, b) => a.ratio - b.ratio);
    if (rows.length === 0) {
      console.log(`\n${scheme} ${route}: clean`);
      continue;
    }
    failures += rows.length;
    console.log(`\n${scheme} ${route}: ${rows.length} failure(s)`);
    for (const r of rows) {
      console.log(`  ${r.ratio.toFixed(2)}:1  need ${r.need}  ${r.size}px/${r.weight}  .${r.cls || r.tag}  "${r.text}"  ${r.fg} on ${r.bg}`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${failures} WCAG 1.4.3 failure(s) across ${ROUTES.length} route(s) x 2 schemes.`);
process.exit(failures === 0 ? 0 : 1);
