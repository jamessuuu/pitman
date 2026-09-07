// Measure the rendered surface against the portfolio acceptance profile,
// rather than asserting it looks good. Numbers only.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";

const BASE = process.env.SHOT_BASE;
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const m = await page.evaluate(() => {
  const all = [...document.querySelectorAll("*")];
  const faces = new Map();
  let maxType = 0;
  let shadowed = 0;
  let transitioned = 0;
  let backdrop = 0;
  let blend = 0;
  let sideBorders = 0;
  let gradientText = 0;

  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.boxShadow && cs.boxShadow !== "none") shadowed++;
    if (cs.transitionDuration && cs.transitionDuration !== "0s") transitioned++;
    if (cs.backdropFilter && cs.backdropFilter !== "none") backdrop++;
    if (cs.mixBlendMode && cs.mixBlendMode !== "normal") blend++;

    // The slop tell: a thick coloured rail down exactly one side of a box.
    const l = parseFloat(cs.borderLeftWidth) || 0;
    const r = parseFloat(cs.borderRightWidth) || 0;
    const t = parseFloat(cs.borderTopWidth) || 0;
    const b = parseFloat(cs.borderBottomWidth) || 0;
    if (l >= 3 && r === 0 && t === 0 && b === 0) sideBorders++;

    if (cs.webkitTextFillColor === "transparent" && cs.backgroundImage.includes("gradient")) gradientText++;

    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && el.textContent && el.children.length === 0) {
      const size = parseFloat(cs.fontSize) || 0;
      if (size > maxType) maxType = size;
      const fam = cs.fontFamily.split(",")[0].replace(/"/g, "").trim();
      faces.set(fam, (faces.get(fam) || 0) + 1);
    }
  }

  const animating = document.getAnimations().length;
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText);

  return {
    elements: all.length,
    words: document.body.innerText.split(/\s+/).filter(Boolean).length,
    boxShadowed: shadowed,
    transitions: transitioned,
    animating,
    largestType: Math.round(maxType * 10) / 10,
    faces: [...faces.entries()].sort((a, b) => b[1] - a[1]),
    backdropFilter: backdrop,
    mixBlendMode: blend,
    sideBorderTells: sideBorders,
    gradientHeadings: gradientText,
    emojiInText: emoji,
  };
});

console.log(JSON.stringify(m, null, 2));

const floor = [
  ["box-shadowed nodes >= 10", m.boxShadowed >= 10],
  ["transitions >= 15", m.transitions >= 15],
  ["largest type >= 45px", m.largestType >= 45],
  [">= 3 font families", m.faces.length >= 3],
  ["0 side-border tells", m.sideBorderTells === 0],
  ["0 gradient headings", m.gradientHeadings === 0],
  ["no emoji iconography", !m.emojiInText],
  ["no backdrop-filter", m.backdropFilter === 0],
];
console.log("");
let failed = 0;
for (const [label, ok] of floor) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed++;
}
await browser.close();
process.exit(failed === 0 ? 0 : 1);
