// Locate non-latin-subset characters and report their CONTEXT, not just a
// count. Whether a bare arrow is an icon or punctuation is decided by what
// sits next to it, so the count alone cannot answer the question.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";

const BASE = process.env.SHOT_BASE;
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }

const ROUTES = ["/", "/method", "/reference", "/docs/limitations"];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const hits = await page.evaluate(() => {
    // Everything outside the Google Fonts "latin" subset the vendored files
    // were built against.
    const inLatinSubset = (cp) =>
      (cp >= 0x0000 && cp <= 0x00ff) || cp === 0x0131 || (cp >= 0x0152 && cp <= 0x0153) ||
      (cp >= 0x02bb && cp <= 0x02bc) || cp === 0x02c6 || cp === 0x02da || cp === 0x02dc ||
      (cp >= 0x2000 && cp <= 0x206f) || cp === 0x2074 || cp === 0x20ac || cp === 0x2122 ||
      cp === 0x2191 || cp === 0x2193 || cp === 0x2212 || cp === 0x2215 ||
      cp === 0xfeff || cp === 0xfffd;

    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue ?? "";
      for (const ch of text) {
        const cp = ch.codePointAt(0);
        if (cp > 0x7f && !inLatinSubset(cp)) {
          const parent = node.parentElement;
          const prev = node.previousSibling;
          const next = node.nextSibling;
          out.push({
            char: ch,
            cp: "U+" + cp.toString(16).toUpperCase().padStart(4, "0"),
            font: getComputedStyle(parent).fontFamily.split(",")[0].replace(/"/g, ""),
            nodeText: JSON.stringify(text.trim()),
            bareNode: text.trim() === ch,
            parentTag: parent.tagName,
            parentClass: String(parent.className || "").slice(0, 30),
            prevSibling: prev ? `${prev.nodeName}:${(prev.textContent || "").trim().slice(0, 22)}` : null,
            nextSibling: next ? `${next.nodeName}:${(next.textContent || "").trim().slice(0, 22)}` : null,
            parentText: (parent.textContent || "").trim().slice(0, 60),
          });
        }
      }
    }
    return out;
  });

  if (hits.length === 0) {
    console.log(`${route}: clean`);
    continue;
  }
  console.log(`${route}: ${hits.length} out-of-subset character(s)`);
  for (const h of hits) console.log("   " + JSON.stringify(h));
}

await browser.close();
