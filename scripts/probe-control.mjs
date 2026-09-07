// Verify the replacement file control actually behaves: keyboard focus draws
// a ring, selecting a file updates the readout, and the native picker is
// reachable. A styled control that only LOOKS right is a regression.
import { chromium } from "file:///C:/Users/admin/agentjames/node_modules/playwright/index.mjs";
import path from "node:path";

const BASE = process.env.SHOT_BASE;
if (!BASE) { console.error("SHOT_BASE required"); process.exit(2); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

const control = page.getByTestId("file-control");
const input = page.getByTestId("file-input");
const readout = page.getByTestId("file-control-name");

console.log("control visible:", await control.isVisible());
console.log("input enabled:  ", await input.isEnabled());
console.log("readout before: ", (await readout.innerText()).trim());

// The transparent overlay must still be a real, focusable control.
await input.focus();
const focusState = await page.evaluate(() => {
  const el = document.activeElement;
  const label = el?.closest("label");
  return {
    activeTag: el?.tagName,
    activeType: el?.getAttribute("type"),
    labelHasFocusWithin: label ? label.matches(":focus-within") : false,
    ringDrawnOn: label ? getComputedStyle(label.querySelector(".file-control-btn")).outlineWidth : null,
  };
});
console.log("focus:", JSON.stringify(focusState));
await control.scrollIntoViewIfNeeded();
await page.screenshot({ path: "docs/shots/after/control-focus.png", clip: await control.boundingBox().then((b) => ({ x: b.x - 12, y: b.y - 12, width: b.width + 24, height: b.height + 24 })) });

// Selecting a file must update the visible readout.
const clip = path.resolve("fixtures/audio/common_voice_en_187059.mp3");
await input.setInputFiles(clip);
await page.waitForTimeout(400);
console.log("readout after:  ", (await readout.innerText()).trim());

// Overlay must cover the whole visible control so a click anywhere opens the picker.
const cover = await page.evaluate(() => {
  const label = document.querySelector("[data-testid=file-control]");
  const overlay = document.querySelector("[data-testid=file-input]");
  const l = label.getBoundingClientRect();
  const o = overlay.getBoundingClientRect();
  return { labelW: Math.round(l.width), labelH: Math.round(l.height), overlayW: Math.round(o.width), overlayH: Math.round(o.height) };
});
console.log("coverage:", JSON.stringify(cover));

console.log("runtime errors:", errors.length === 0 ? "none" : errors);
await browser.close();
process.exit(errors.length === 0 ? 0 : 1);
