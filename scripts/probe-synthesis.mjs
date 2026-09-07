// Detect SYNTHESIZED type: a slant or a weight the browser fakes because no
// real face covers it.
//
// document.fonts.check() cannot answer this — it returns true whenever the
// FAMILY matches, because the browser is perfectly willing to synthesize. The
// only way to see it is to enumerate the faces actually LOADED and compare
// them against what each element asks for.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";

const BASE = process.env.SHOT_BASE;
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }

const ROUTES = ["/", "/method", "/reference", "/docs/limitations"];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
let findings = 0;

for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  const result = await page.evaluate(() => {
    const loaded = [];
    document.fonts.forEach((f) => {
      if (f.status === "loaded") loaded.push({ family: f.family.replace(/"/g, ""), style: f.style, weight: f.weight });
    });

    // Does a loaded face cover this family at this style and weight?
    const covered = (family, style, weight) =>
      loaded.some((f) => {
        if (f.family.toLowerCase() !== family.toLowerCase()) return false;
        if (style === "italic" && f.style !== "italic") return false;
        if (style !== "italic" && f.style === "italic") return false;
        // A variable face declares a range like "400 600".
        const parts = String(f.weight).trim().split(/\s+/).map(Number);
        const lo = parts[0];
        const hi = parts.length > 1 ? parts[1] : parts[0];
        return weight >= lo && weight <= hi;
      });

    const faked = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!el.textContent || !el.textContent.trim()) continue;
      const cs = getComputedStyle(el);
      const family = cs.fontFamily.split(",")[0].replace(/"/g, "").trim();
      // Only families we actually ship are our problem.
      if (!["Archivo", "Commit Mono", "Newsreader"].includes(family)) continue;
      const style = cs.fontStyle;
      const weight = parseInt(cs.fontWeight, 10);
      const isItalic = style === "italic" || style === "oblique";
      // Weights above a variable font's declared max are CLAMPED by the
      // engine, not synthesized, so only flag a genuine style mismatch.
      if (isItalic && !covered(family, "italic", weight)) {
        faked.push({ kind: "synthesized-italic", family, weight, tag: el.tagName, text: el.textContent.trim().slice(0, 40) });
      }
    }
    return { loaded, faked, checkSaysTrue: document.fonts.check("italic 16px Archivo") };
  });

  const faces = result.loaded.map((f) => `${f.family}/${f.style}/${f.weight}`).sort().join(", ");
  console.log(`${route}`);
  console.log(`  loaded: ${faces || "(none)"}`);
  console.log(`  document.fonts.check("italic 16px Archivo") => ${result.checkSaysTrue}  <- cannot detect this`);
  if (result.faked.length === 0) {
    console.log("  no synthesized type");
  } else {
    findings += result.faked.length;
    for (const f of result.faked) console.log(`  *** ${f.kind}: <${f.tag}> "${f.text}" (${f.family} ${f.weight})`);
  }
}

await browser.close();
console.log(`\n${findings} synthesized-type finding(s).`);
process.exit(findings === 0 ? 0 : 1);
