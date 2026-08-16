#!/usr/bin/env node
// Copies onnxruntime-web's WASM runtime files into apps/web/public/ort/ so
// the app can serve them same-origin instead of onnxruntime-web's own
// default (a jsdelivr CDN URL, set as a module-load-time side effect —
// found during M2 e2e verification: the zero-upload network assertion
// caught a real request to cdn.jsdelivr.net). NOT committed to git
// (apps/web/public/ort/ is gitignored, same rationale as
// /apps/web/public/models/ — a large runtime binary, not source).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(root, "..", "apps", "web", "node_modules", "onnxruntime-web", "dist");
const destDir = path.join(root, "..", "apps", "web", "public", "ort");

const files = ["ort-wasm-simd-threaded.asyncify.wasm", "ort-wasm-simd-threaded.asyncify.mjs"];

mkdirSync(destDir, { recursive: true });
for (const file of files) {
  const src = path.join(srcDir, file);
  if (!existsSync(src)) {
    console.error(`[copy-ort-assets] missing: ${src} (did \`pnpm install\` run in apps/web?)`);
    process.exit(1);
  }
  copyFileSync(src, path.join(destDir, file));
}
console.log(`[copy-ort-assets] copied ${files.length} onnxruntime-web runtime file(s) into apps/web/public/ort/`);
