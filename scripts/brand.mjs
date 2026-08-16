#!/usr/bin/env node
// Brand asset check, run before every build. Verifies presence of the
// required assets, then rasterizes the favicon at 16px and checks it
// against a blank/near-blank raster (BATCH-2-STANDARDS.md: "favicon
// VERIFIED BY RASTERIZING AT 16px AND LOOKING") — a real, automated,
// repeatable check that the icon didn't regress into an empty square, not
// just a presence check. The actual "and looking" was a manual visual
// inspection during M5 build (see docs/DEVIATIONS.md) — this script is
// the fast, mechanical regression guard for every build after that.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.join(root, "..", "apps", "web", "public", "brand");

const required = ["favicon.svg", "favicon-32.png", "og.png"];
const missing = required.filter((f) => !existsSync(path.join(brandDir, f)));

if (missing.length > 0) {
  console.error(`[brand] Missing required brand asset(s): ${missing.join(", ")}.`);
  process.exit(1);
}

const raster = await sharp(path.join(brandDir, "favicon.svg")).resize(16, 16).raw().toBuffer({ resolveWithObject: true });
const { data, info } = raster;
const channels = info.channels;

let nonBackgroundPixels = 0;
for (let i = 0; i < data.length; i += channels) {
  // Background is a solid warm brown (#7a4023); the glyph is cream
  // (#fbf6ef) — a pixel with high green+blue relative to a brown
  // background is glyph, not background. Cheap, deterministic proxy for
  // "the icon isn't just a blank/solid square at 16px."
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  if (g > 150 && b > 150 && r > 150) nonBackgroundPixels++;
}

const pct = (nonBackgroundPixels / (16 * 16)) * 100;
if (pct < 5) {
  console.error(
    `[brand] favicon.svg rasterized at 16px appears blank/near-blank (${pct.toFixed(1)}% glyph pixels) — ` +
      "the icon likely isn't legible at tab size. Fix and re-run.",
  );
  process.exit(1);
}

console.log(`[brand] favicon.svg, favicon-32.png, og.png present. 16px raster: ${pct.toFixed(1)}% glyph coverage — looks real, not blank.`);
