#!/usr/bin/env node
// Brand asset check, run before every build. Full favicon/OG generation +
// the 16px-raster verification (BATCH-2-STANDARDS.md) lands in M5
// (docs/pitman-SPEC.md). Until then this is a non-fatal presence check so
// `pnpm run build` never silently ships a broken brand reference, and so
// the gap is visible in build output rather than hidden.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.join(root, "..", "apps", "web", "public", "brand");

const required = ["favicon.svg", "og.png"];
const missing = required.filter((f) => !existsSync(path.join(brandDir, f)));

if (missing.length > 0) {
  console.warn(
    `[brand] Not yet present (expected in M5, docs/pitman-SPEC.md): ${missing.join(", ")}. ` +
      "index.html does not reference them until they exist and are verified — see BATCH-2-STANDARDS.md " +
      "(favicon verified by rasterizing at 16px).",
  );
} else {
  console.log("[brand] favicon.svg and og.png present.");
}
